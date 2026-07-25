import { getMessaging, type TokenMessage } from 'firebase-admin/messaging';
import prisma from '@/lib/prisma';
import { getFirebaseApp, isFirebaseConfigured } from '@/lib/firebaseAdmin';

/**
 * Server-side push delivery for the native apps.
 *
 * Uses firebase-admin's messaging API rather than hand-rolling FCM HTTP v1:
 * Firebase mints the OAuth2 access tokens, and relays to APNs for iOS using the
 * APNs key uploaded to the Firebase project. One code path covers both platforms.
 *
 * Node runtime only (firebase-admin needs Node built-ins). Never import this
 * from src/proxy.ts or anything that reaches the Edge bundle — see the note at
 * the top of src/auth.ts for what that breaks.
 */

/** FCM error codes meaning the token is permanently dead and should be retired. */
const DEAD_TOKEN_CODES = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
    'messaging/invalid-argument',
]);

export interface PushPayload {
    title: string;
    body: string;
    /**
     * Path the app should open when the notification is tapped, e.g.
     * "/timing" or "/clarity". Handled by the appUrlOpen listener in
     * NativeAppShell. Relative to the site root.
     */
    path?: string;
    /** Extra key/values delivered to the app. Values must be strings for FCM. */
    data?: Record<string, string>;
}

export interface SendResult {
    sent: number;
    failed: number;
    /** Tokens retired during this send because FCM reported them dead. */
    disabled: number;
    skipped: boolean;
    reason?: string;
}

/**
 * Send a notification to every active device belonging to the given users.
 *
 * Returns counts rather than throwing on partial failure — one bad token must
 * not sink a broadcast. Dead tokens are disabled as a side effect, which is what
 * stops the table filling with uninstalled apps over time.
 */
export async function sendPushToUsers(
    userIds: string[],
    payload: PushPayload
): Promise<SendResult> {
    if (!isFirebaseConfigured()) {
        // Deliberately not thrown: push is an enhancement, and a missing
        // credential should never break the request that triggered it.
        console.error('Push requested but Firebase Admin is not configured.');
        return { sent: 0, failed: 0, disabled: 0, skipped: true, reason: 'firebase_not_configured' };
    }

    if (userIds.length === 0) {
        return { sent: 0, failed: 0, disabled: 0, skipped: true, reason: 'no_recipients' };
    }

    const devices = await prisma.deviceToken.findMany({
        where: { userId: { in: userIds }, disabledAt: null },
        select: { token: true, platform: true },
    });

    if (devices.length === 0) {
        return { sent: 0, failed: 0, disabled: 0, skipped: true, reason: 'no_active_devices' };
    }

    return sendToTokens(devices.map((d) => d.token), payload);
}

/**
 * Lower-level send to raw tokens. Exported for the admin test endpoint.
 */
export async function sendToTokens(tokens: string[], payload: PushPayload): Promise<SendResult> {
    if (!isFirebaseConfigured()) {
        return { sent: 0, failed: 0, disabled: 0, skipped: true, reason: 'firebase_not_configured' };
    }
    if (tokens.length === 0) {
        return { sent: 0, failed: 0, disabled: 0, skipped: true, reason: 'no_tokens' };
    }

    const messaging = getMessaging(getFirebaseApp());

    // FCM data values must all be strings.
    const data: Record<string, string> = { ...(payload.data ?? {}) };
    if (payload.path) data.path = payload.path;

    const build = (token: string): TokenMessage => ({
        token,
        notification: { title: payload.title, body: payload.body },
        data,
        android: {
            priority: 'high',
            notification: {
                // Must match the channel created in src/lib/native/push.ts,
                // otherwise Android 8+ silently drops the notification.
                channelId: 'askchetna-default',
                color: '#D4AF37',
                defaultSound: true,
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                    // Lets iOS group/replace notifications sensibly.
                    threadId: 'askchetna',
                },
            },
        },
    });

    let sent = 0;
    let failed = 0;
    const deadTokens: string[] = [];

    // sendEach (not sendEachForMulticast) so each message carries its own
    // platform config and one rejection can't fail the batch. Chunked at 500,
    // FCM's per-call ceiling.
    const CHUNK = 500;
    for (let i = 0; i < tokens.length; i += CHUNK) {
        const chunk = tokens.slice(i, i + CHUNK);

        let response;
        try {
            response = await messaging.sendEach(chunk.map(build));
        } catch (error) {
            // Whole-chunk failure (network, auth). Count and continue.
            console.error('Push chunk failed entirely:', error);
            failed += chunk.length;
            continue;
        }

        response.responses.forEach((result, index) => {
            if (result.success) {
                sent += 1;
                return;
            }
            failed += 1;
            const code = result.error?.code;
            if (code && DEAD_TOKEN_CODES.has(code)) {
                deadTokens.push(chunk[index]);
            } else {
                console.warn('Push failed for a token:', code, result.error?.message);
            }
        });
    }

    // Retire tokens FCM told us are gone (app uninstalled, token rotated).
    let disabled = 0;
    if (deadTokens.length > 0) {
        const result = await prisma.deviceToken.updateMany({
            where: { token: { in: deadTokens }, disabledAt: null },
            data: { disabledAt: new Date() },
        });
        disabled = result.count;
    }

    return { sent, failed, disabled, skipped: false };
}
