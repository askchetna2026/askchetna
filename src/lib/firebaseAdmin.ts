import { cert, getApps, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * Firebase Admin singleton, used only to verify phone-auth ID tokens.
 *
 * The native apps run the real Firebase Phone Auth flow on-device (silent APNs
 * verification on iOS, SMS Retriever auto-fill on Android). Firebase sends the
 * SMS — which is also why we don't need TRAI/DLT registration for Indian
 * numbers — and hands the app back an ID token. This module is the server half:
 * it proves that token is genuine before we mint a NextAuth session from it.
 *
 * Node runtime only (firebase-admin uses Node crypto), so any route importing
 * this must not opt into the Edge runtime.
 */

const globalForFirebase = globalThis as unknown as {
    firebaseAdminApp: App | undefined;
};

/**
 * How recently the user must have completed the OTP challenge.
 *
 * Firebase ID tokens stay valid for an hour, but we only want to accept one as
 * proof of a *fresh* phone verification. Without this, a token captured from
 * one session could be replayed as a login for up to an hour.
 */
const MAX_AUTH_AGE_SECONDS = 5 * 60;

function loadServiceAccount(): ServiceAccount {
    // Preferred: whole service-account JSON, base64-encoded into one variable.
    // The private key is multi-line PEM, and pasting it raw into a dashboard
    // env var reliably mangles the newlines — base64 sidesteps that entirely.
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (encoded) {
        try {
            const parsed = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
            return {
                projectId: parsed.project_id,
                clientEmail: parsed.client_email,
                privateKey: parsed.private_key,
            };
        } catch {
            throw new Error(
                'FIREBASE_SERVICE_ACCOUNT_BASE64 is set but is not valid base64-encoded JSON.'
            );
        }
    }

    // Fallback: discrete variables. Escaped newlines are restored here.
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_BASE64, ' +
            'or all of FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.'
        );
    }

    return { projectId, clientEmail, privateKey };
}

/**
 * The shared Admin app. Exported so the push sender (src/lib/push/send.ts) can
 * reuse this single credential/connection rather than initialising its own.
 */
export function getFirebaseApp(): App {
    if (globalForFirebase.firebaseAdminApp) return globalForFirebase.firebaseAdminApp;

    // getApps() guards against duplicate-app errors across HMR reloads and
    // warm serverless invocations.
    const existing = getApps();
    const app = existing.length
        ? existing[0]
        : initializeApp({ credential: cert(loadServiceAccount()) });

    globalForFirebase.firebaseAdminApp = app;
    return app;
}

/** True when Firebase credentials are present, so callers can degrade gracefully. */
export function isFirebaseConfigured(): boolean {
    return Boolean(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
        (process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_CLIENT_EMAIL &&
            process.env.FIREBASE_PRIVATE_KEY)
    );
}

export interface VerifiedPhone {
    /** E.164, e.g. "+919876543210". Firebase always returns this normalised. */
    phone: string;
    /** Firebase UID — recorded for support/debugging, not used as our user id. */
    firebaseUid: string;
}

export class PhoneTokenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PhoneTokenError';
    }
}

/**
 * Verify a Firebase ID token and extract the verified phone number.
 *
 * Throws PhoneTokenError on any failure. Callers must surface a generic message
 * to the client — the distinctions below are for server logs only.
 */
export async function verifyPhoneIdToken(idToken: string): Promise<VerifiedPhone> {
    if (!idToken || typeof idToken !== 'string') {
        throw new PhoneTokenError('Missing ID token');
    }

    const auth = getAuth(getFirebaseApp());

    let decoded;
    try {
        // checkRevoked costs one extra round-trip to Firebase but means a
        // disabled user or revoked session can't keep signing in.
        decoded = await auth.verifyIdToken(idToken, true);
    } catch (error) {
        throw new PhoneTokenError(
            `ID token failed verification: ${error instanceof Error ? error.message : 'unknown'}`
        );
    }

    // Only accept tokens that came from the phone/OTP flow. Without this a token
    // minted by any other Firebase provider would be accepted as phone proof.
    if (decoded.firebase?.sign_in_provider !== 'phone') {
        throw new PhoneTokenError(
            `Unexpected sign-in provider: ${decoded.firebase?.sign_in_provider ?? 'unknown'}`
        );
    }

    const phone = decoded.phone_number;
    if (!phone) {
        throw new PhoneTokenError('Token has no phone_number claim');
    }

    // Freshness: the OTP must have been completed moments ago, not up to an
    // hour ago (see MAX_AUTH_AGE_SECONDS).
    const authAgeSeconds = Math.floor(Date.now() / 1000) - decoded.auth_time;
    if (authAgeSeconds > MAX_AUTH_AGE_SECONDS) {
        throw new PhoneTokenError(
            `Stale verification: OTP completed ${authAgeSeconds}s ago (max ${MAX_AUTH_AGE_SECONDS}s)`
        );
    }

    return { phone, firebaseUid: decoded.uid };
}

/**
 * Basic E.164 shape check, used before we ever call Firebase so obviously
 * malformed input fails fast. Firebase is the real authority on validity.
 */
export function looksLikeE164(phone: string): boolean {
    return /^\+[1-9]\d{7,14}$/.test(phone);
}
