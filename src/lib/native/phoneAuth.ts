'use client';

import { isClientNativeApp } from '@/lib/platform';

/**
 * Native phone/OTP verification for the iOS and Android apps.
 *
 * This is real device-level verification, not an SMS form in a webview:
 *   - iOS uses silent APNs push to prove the app instance is genuine.
 *   - Android uses SafetyNet/Play Integrity plus SMS Retriever, so the code is
 *     often auto-filled and the user never types it.
 *
 * Everything is loaded through dynamic import() and gated on isClientNativeApp(),
 * for two reasons: the Firebase JS SDK (a large dependency of the plugin's web
 * implementation) is code-split into a chunk that browser visitors never
 * download, and the plugin is never touched on a platform where it can't work.
 *
 * The flow this module drives:
 *   1. startPhoneVerification(phone)  -> SMS sent, or auto-verified on Android
 *   2. confirmCode(verificationId, code) -> Firebase ID token
 *   3. that token goes to /api/auth/phone/check, then signIn('phone-otp')
 */

type Plugin = typeof import('@capacitor-firebase/authentication')['FirebaseAuthentication'];

async function loadPlugin(): Promise<Plugin> {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    return FirebaseAuthentication;
}

/** Phone sign-in is offered only in the native apps (see startPhoneVerification). */
export function isPhoneAuthAvailable(): boolean {
    return isClientNativeApp();
}

export interface StartVerificationCallbacks {
    /** SMS dispatched; `verificationId` is needed to confirm the typed code. */
    onCodeSent: (verificationId: string) => void;
    /**
     * Android only: the SMS was auto-retrieved and sign-in already completed, so
     * there is no code for the user to enter. Hands back the ID token directly.
     */
    onAutoVerified: (idToken: string) => void;
    /** Verification could not start or was rejected. Message is user-safe. */
    onError: (message: string) => void;
}

/** Handles returned so the caller can detach listeners when its UI unmounts. */
export interface VerificationSession {
    cancel: () => Promise<void>;
}

/**
 * Begin verification for an E.164 number (e.g. "+919876543210").
 *
 * Resolves as soon as the request is dispatched — completion arrives via the
 * callbacks, because Android may finish without any user input.
 */
export async function startPhoneVerification(
    phoneNumber: string,
    callbacks: StartVerificationCallbacks,
    options: { resend?: boolean } = {}
): Promise<VerificationSession> {
    if (!isClientNativeApp()) {
        throw new Error('Phone sign-in is only available in the AskChetna app.');
    }

    const plugin = await loadPlugin();

    // Same reasoning as signInWithGoogleNative: start from no Firebase session, so
    // the resulting token's auth_time is genuinely fresh and cannot fail the
    // server's 5-minute freshness check because of an earlier failed attempt.
    if (!options.resend) {
        try {
            await plugin.signOut();
        } catch { /* nothing to sign out of */ }
    }

    /**
     * Safety net for "no callback ever arrives".
     *
     * If Firebase can't verify the app — an unregistered SHA-1 being the usual
     * cause on Android — it can fail without firing phoneVerificationFailed at
     * all. The UI then sits on "Sending code…" indefinitely with nothing to act
     * on, which is exactly what happened in testing.
     *
     * 50s is just past Firebase's own 60s SMS auto-retrieval window minus the
     * round trip, so a genuinely slow SMS still wins the race.
     */
    let settled = false;
    const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        callbacks.onError(
            'No response from Google\'s verification service. On Android this usually means the ' +
            'app\'s SHA-1 fingerprint is not registered in Firebase, or google-services.json is ' +
            'missing from the build.'
        );
    }, 50_000);

    const settle = () => {
        settled = true;
        clearTimeout(timeoutId);
    };

    // Registered before signInWithPhoneNumber so we can't miss a fast callback.
    const handles = await Promise.all([
        plugin.addListener('phoneCodeSent', (event) => {
            settle();
            callbacks.onCodeSent(event.verificationId);
        }),
        plugin.addListener('phoneVerificationCompleted', () => {
            settle();
            // Instant verification: already signed in to Firebase, so read the
            // token straight off the session.
            void getFreshIdToken()
                .then(callbacks.onAutoVerified)
                .catch(() => callbacks.onError('Could not complete verification. Please try again.'));
        }),
        plugin.addListener('phoneVerificationFailed', (event) => {
            settle();
            console.warn('[phoneAuth] verification failed:', event.message);
            callbacks.onError(friendlyError(event.message));
        }),
    ]);

    const cancel = async () => {
        settle();
        await Promise.all(handles.map((handle) => handle.remove()));
    };

    try {
        await plugin.signInWithPhoneNumber({
            phoneNumber,
            resendCode: options.resend ?? false,
        });
    } catch (error) {
        // Don't leak listeners or the timeout if the call itself throws.
        await cancel();
        throw new Error(friendlyError(error instanceof Error ? error.message : String(error)));
    }

    return { cancel };
}

/**
 * Exchange the user-entered SMS code for a Firebase ID token.
 * The token is what our server verifies; it is never persisted client-side.
 */
export async function confirmCode(verificationId: string, verificationCode: string): Promise<string> {
    const plugin = await loadPlugin();

    try {
        await plugin.confirmVerificationCode({ verificationId, verificationCode });
    } catch (error) {
        throw new Error(friendlyError(error instanceof Error ? error.message : String(error)));
    }

    return getFreshIdToken();
}

/**
 * Read the current Firebase ID token.
 *
 * forceRefresh keeps the token's auth_time recent, which matters because the
 * server rejects stale verifications (see MAX_AUTH_AGE_SECONDS in
 * src/lib/firebaseAdmin.ts).
 */
async function getFreshIdToken(): Promise<string> {
    const plugin = await loadPlugin();
    const { token } = await plugin.getIdToken({ forceRefresh: true });
    if (!token) throw new Error('No ID token returned by Firebase.');
    return token;
}

/**
 * Drop the Firebase session once we've minted our own NextAuth session.
 *
 * Firebase is only an OTP mechanism here, not our session store, so leaving a
 * long-lived Firebase session on the device serves no purpose. Best-effort:
 * failure here must never block a successful login.
 */
export async function releaseFirebaseSession(): Promise<void> {
    if (!isClientNativeApp()) return;
    try {
        const plugin = await loadPlugin();
        await plugin.signOut();
    } catch (error) {
        console.warn('[phoneAuth] Firebase sign-out failed (non-fatal):', error);
    }
}

/** Map raw Firebase/SDK errors onto something worth showing a user. */
function friendlyError(raw: string): string {
    const message = raw.toLowerCase();

    if (message.includes('invalid-phone-number') || message.includes('invalid format')) {
        return 'That phone number doesn\'t look right. Include your country code, e.g. +91.';
    }
    if (message.includes('invalid-verification-code') || message.includes('invalid code')) {
        return 'That code isn\'t correct. Please check and try again.';
    }
    if (message.includes('session-expired') || message.includes('code-expired')) {
        return 'That code has expired. Request a new one.';
    }
    if (message.includes('too-many-requests') || message.includes('quota')) {
        return 'Too many attempts. Please wait a few minutes and try again.';
    }
    if (message.includes('network')) {
        return 'Network problem. Check your connection and try again.';
    }
    if (message.includes('cancel')) {
        return 'Verification was cancelled.';
    }
    return 'Could not verify that number. Please try again.';
}
