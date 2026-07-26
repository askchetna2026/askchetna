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

/** How long to wait for the JS chunk before giving up on it. */
const PLUGIN_IMPORT_TIMEOUT_MS = 8_000;

/**
 * Obtain the Firebase Auth plugin.
 *
 * Prefers the proxy Capacitor injects into the WebView, which is present from
 * page load and needs no network at all. The npm package's export is itself just
 * `registerPlugin('FirebaseAuthentication')` — a proxy over the same native
 * bridge — so the two are equivalent on a device.
 *
 * This matters because `await import()` fetches a JS chunk over HTTP, and on
 * device that import hung indefinitely: phone sign-in reported "timed out while:
 * loading the Firebase plugin" having never reached Firebase. Google sign-in was
 * unaffected only because it happened to load the same chunk first and warm it.
 *
 * The dynamic import stays as a fallback for the web (where no bridge exists),
 * now with a timeout so it can never hang forever again.
 */
async function loadPlugin(): Promise<Plugin> {
    const injected = (
        globalThis as unknown as {
            Capacitor?: { Plugins?: Record<string, unknown> };
        }
    )?.Capacitor?.Plugins?.FirebaseAuthentication;

    if (injected) {
        return injected as Plugin;
    }

    const load = import('@capacitor-firebase/authentication').then((m) => m.FirebaseAuthentication);

    const timeout = new Promise<never>((_, reject) =>
        setTimeout(
            () => reject(new Error('Timed out loading the Firebase plugin. Check your connection and try again.')),
            PLUGIN_IMPORT_TIMEOUT_MS
        )
    );

    return Promise.race([load, timeout]);
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

    /**
     * Safety net for "nothing ever comes back".
     *
     * Armed FIRST, before any await. Firebase can fail app verification without
     * firing phoneVerificationFailed at all — and the plugin load or signOut below
     * could equally stall — leaving the UI on "Sending code…" forever with nothing
     * to act on. An earlier version armed this after those awaits, which left the
     * exact hang it was meant to catch unprotected.
     *
     * 50s sits just inside Firebase's own 60s SMS auto-retrieval window, so a
     * merely slow SMS still wins the race.
     */
    let settled = false;

    /**
     * The step currently in flight, reported verbatim if we time out.
     *
     * Several awaits happen before Google is even contacted, and an earlier
     * version lumped all of them into one "the request never left the app"
     * message — which narrowed the cause to four possible lines and no further.
     * Each stage below is updated immediately before the await it describes, so a
     * timeout names the exact one that hung, readable off the screen without USB
     * debugging.
     */
    let stage = 'loading the Firebase plugin';

    const timeoutId = setTimeout(() => {
        if (settled) return;
        settled = true;
        callbacks.onError(`Phone sign-in timed out while: ${stage}.`);
    }, 50_000);

    const plugin = await loadPlugin();

    // Same reasoning as signInWithGoogleNative: start from no Firebase session so
    // the resulting token's auth_time is genuinely fresh, rather than inherited
    // from an earlier failed attempt.
    if (!options.resend) {
        stage = 'clearing the previous Firebase session';
        try {
            await plugin.signOut();
        } catch { /* nothing to sign out of */ }
    }

    const settle = () => {
        settled = true;
        clearTimeout(timeoutId);
    };

    stage = 'registering the verification listeners';

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
        stage = 'sending the request to Google';

        console.info('[phoneAuth] calling signInWithPhoneNumber', {
            phoneNumber,
            resend: options.resend ?? false,
        });

        await plugin.signInWithPhoneNumber({
            phoneNumber,
            resendCode: options.resend ?? false,
        });

        // Past this point the request is with Google, and any further delay is app
        // verification (Play Integrity attestation, or its reCAPTCHA fallback
        // failing to display) rather than anything on our side.
        stage = 'waiting for Google to send the code';

        console.info(
            '[phoneAuth] signInWithPhoneNumber resolved — now waiting for a ' +
            'phoneCodeSent / phoneVerificationCompleted / phoneVerificationFailed callback'
        );
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
    if (message.includes('app-not-authorized') || message.includes('developer_error') || message.includes('17028')) {
        return 'This app build is not authorised for phone sign-in. Its SHA-1 and SHA-256 ' +
            'fingerprints must both be registered in the Firebase project that ' +
            'google-services.json came from.';
    }
    if (message.includes('recaptcha') || message.includes('web-context') || message.includes('missing-client-identifier')) {
        return 'Google could not verify this app and fell back to a reCAPTCHA check, which ' +
            'cannot run here. Use a number registered under Firebase > Authentication > ' +
            'Sign-in method > Phone > "Phone numbers for testing".';
    }
    if (message.includes('billing') || message.includes('not-enabled') || message.includes('operation-not-allowed')) {
        return 'Phone sign-in is not enabled on this Firebase project, or the project needs ' +
            'billing enabled for SMS.';
    }

    // Deliberately include the raw text. Every branch above exists because a real
    // failure was seen and decoded; anything reaching here is one we have not met,
    // and swallowing it into "please try again" leaves nothing to act on — which
    // is exactly what happened when this fallback fired on device.
    const detail = raw.trim().slice(0, 200);
    return detail
        ? `Could not verify that number. Google reported: ${detail}`
        : 'Could not verify that number. Please try again.';
}
