'use client';

import { isClientNativeApp } from '@/lib/platform';

/**
 * Native Google sign-in for the apps.
 *
 * Google refuses to complete OAuth inside an embedded WebView — the
 * `disallowed_useragent` anti-phishing policy, on the reasoning that a WebView
 * host can read the password field. In practice the flow collects the account,
 * then escapes to the system browser, where the session cookie is set in the
 * BROWSER's cookie jar and the app remains signed out. No redirect-URI
 * configuration can fix that.
 *
 * So the apps use the native Google SDK via Firebase: the account picker is a
 * system UI, nothing runs in the WebView, and we exchange the resulting Firebase
 * ID token for our own NextAuth session (the `google-native` provider).
 *
 * Behind dynamic imports inside a native guard, so browsers download none of it.
 */

/** Native Google sign-in is only available (and only needed) in the apps. */
export function isNativeGoogleAvailable(): boolean {
    return isClientNativeApp();
}

export type NativeGoogleOutcome =
    | { status: 'ok'; idToken: string }
    | { status: 'cancelled' }
    | { status: 'error'; message: string };

/**
 * Run the native Google flow and return a Firebase ID token.
 *
 * The token is what the server verifies; it is never persisted client-side.
 */
export async function signInWithGoogleNative(): Promise<NativeGoogleOutcome> {
    if (!isClientNativeApp()) {
        return { status: 'error', message: 'Native Google sign-in is only available in the app.' };
    }

    try {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');

        // Clear any existing Firebase session FIRST.
        //
        // signInWithGoogle() on a device that already holds a session can return
        // without re-authenticating, leaving `auth_time` at whenever the user
        // originally signed in. The server rejects tokens older than 5 minutes, so
        // once an attempt failed, every retry after that reused the same stale
        // auth_time and failed the freshness check too — the failure became
        // permanent rather than transient.
        //
        // releaseGoogleFirebaseSession() only runs on success, so this is what
        // guarantees a genuinely fresh sign-in after any earlier failure.
        try {
            await FirebaseAuthentication.signOut();
        } catch { /* nothing to sign out of */ }

        await FirebaseAuthentication.signInWithGoogle();

        // forceRefresh keeps auth_time recent; the server rejects stale
        // verifications (see MAX_AUTH_AGE_SECONDS in src/lib/firebaseAdmin.ts).
        const { token } = await FirebaseAuthentication.getIdToken({ forceRefresh: true });

        if (!token) {
            return { status: 'error', message: 'Google sign-in did not return a token.' };
        }

        return { status: 'ok', idToken: token };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // Dismissing the account picker is a normal outcome, not an error worth
        // showing.
        if (/cancel|abort|dismiss|closed by user|12501/i.test(message)) {
            return { status: 'cancelled' };
        }

        console.warn('[googleAuth] native sign-in failed:', message);
        return { status: 'error', message: friendlyError(message) };
    }
}

/**
 * Release the Firebase session once our own NextAuth session exists.
 *
 * Firebase is only the identity broker here, not our session store. Best-effort:
 * failure must never block a successful login.
 */
export async function releaseGoogleFirebaseSession(): Promise<void> {
    if (!isClientNativeApp()) return;
    try {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        await FirebaseAuthentication.signOut();
    } catch (error) {
        console.warn('[googleAuth] Firebase sign-out failed (non-fatal):', error);
    }
}

function friendlyError(raw: string): string {
    const message = raw.toLowerCase();

    // Android error 10 = DEVELOPER_ERROR, almost always a missing or mismatched
    // SHA-1 fingerprint in the Firebase project.
    if (message.includes('10:') || message.includes('developer_error')) {
        return 'Google sign-in is not configured for this build. The app\'s signing fingerprint needs to be added in Firebase.';
    }
    if (message.includes('network')) {
        return 'Network problem. Check your connection and try again.';
    }
    if (message.includes('account-exists')) {
        return 'An account already exists with this email using a different sign-in method.';
    }
    return 'Google sign-in could not be completed. Please try again.';
}
