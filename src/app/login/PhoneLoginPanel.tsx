'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { signIn } from 'next-auth/react';
import { AlertCircle, ArrowLeft, Phone } from 'lucide-react';
import styles from './page.module.css';
import { getVisitorId, trackEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import {
    confirmCode,
    isPhoneAuthAvailable,
    releaseFirebaseSession,
    startPhoneVerification,
    type VerificationSession,
} from '@/lib/native/phoneAuth';

/**
 * Phone/OTP sign-in, shown only inside the native apps.
 *
 * The OTP itself is handled by the device (see src/lib/native/phoneAuth.ts);
 * this component drives the steps around it:
 *
 *   number -> code -> [email, only for a number we've never seen] -> session
 *
 * The email step exists because `email` is still the required identity on User,
 * so a brand-new phone signup has to supply one once. Returning users skip it.
 */

type Step =
    | 'number'   // collecting the phone number
    | 'code'     // SMS sent, waiting for the 6-digit code
    | 'signup';  // verified, but this number has no account yet

interface Props {
    callbackUrl: string;
    /** Lets the parent hide its own email/Google form while this flow is active. */
    onActiveChange?: (active: boolean) => void;
}

export default function PhoneLoginPanel({ callbackUrl, onActiveChange }: Props) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<Step>('number');

    const [phone, setPhone] = useState('+91');
    const [code, setCode] = useState('');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [isSubscribed, setIsSubscribed] = useState(true);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Held across steps: the verificationId pairs the typed code with the SMS,
    // and the idToken is our proof of ownership for the server.
    const verificationIdRef = useRef<string | null>(null);
    const idTokenRef = useRef<string | null>(null);
    const sessionRef = useRef<VerificationSession | null>(null);

    /**
     * Whether we're inside a native app.
     *
     * useSyncExternalStore rather than a mount effect: the server has no
     * navigator, so the server snapshot is `false` and the client snapshot is the
     * real answer. React reconciles the difference itself, giving us no hydration
     * mismatch and no cascading render from setState-in-effect. The subscribe
     * function is a no-op because a User-Agent never changes mid-session.
     */
    const available = useSyncExternalStore(
        () => () => { },
        isPhoneAuthAvailable,
        () => false
    );

    // Detach the plugin listeners if this component goes away mid-flow.
    useEffect(() => {
        return () => {
            void sessionRef.current?.cancel();
        };
    }, []);

    useEffect(() => {
        onActiveChange?.(open);
    }, [open, onActiveChange]);

    /**
     * Final hop for every successful path: swap the Firebase ID token for a
     * NextAuth session via the phone-otp provider.
     */
    const completeSignIn = useCallback(async (idToken: string) => {
        const result = await signIn('phone-otp', { idToken, redirect: false });

        if (result?.error) {
            setError('We verified your number but could not sign you in. Please try again.');
            setLoading(false);
            return;
        }

        // Firebase was only the OTP mechanism; our session is authoritative now.
        void releaseFirebaseSession();

        // Full reload rather than router.push: it guarantees every server
        // component re-renders with the new session cookie.
        window.location.assign(callbackUrl);
    }, [callbackUrl]);

    /**
     * Decide what to do with a verified number: sign in, or collect an email
     * first. Shared by the typed-code path and Android's auto-verification.
     */
    const routeVerifiedToken = useCallback(async (idToken: string) => {
        idTokenRef.current = idToken;

        const response = await fetch('/api/auth/phone/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });

        if (!response.ok) {
            setError('Phone verification failed. Please request a new code.');
            setStep('number');
            setLoading(false);
            return;
        }

        const data = await response.json();

        if (data.status === 'existing') {
            await completeSignIn(idToken);
            return;
        }

        // New number: ask for an email once, then register.
        void trackEvent(ANALYTICS_EVENTS.SIGNUP_STARTED, {
            path: '/login',
            metadata: { method: 'phone', callbackUrl },
        });
        setStep('signup');
        setLoading(false);
    }, [callbackUrl, completeSignIn]);

    const handleSendCode = async (event: React.FormEvent, resend = false) => {
        event.preventDefault();
        setError('');

        const trimmed = phone.replace(/[\s()-]/g, '');
        if (!/^\+[1-9]\d{7,14}$/.test(trimmed)) {
            setError('Enter your number with country code, e.g. +91 98765 43210.');
            return;
        }

        setLoading(true);
        try {
            await sessionRef.current?.cancel();
            sessionRef.current = await startPhoneVerification(
                trimmed,
                {
                    onCodeSent: (verificationId) => {
                        verificationIdRef.current = verificationId;
                        setStep('code');
                        setLoading(false);
                    },
                    // Android auto-retrieved the SMS — skip the code screen entirely.
                    onAutoVerified: (idToken) => {
                        void routeVerifiedToken(idToken);
                    },
                    onError: (message) => {
                        setError(message);
                        setLoading(false);
                    },
                },
                { resend }
            );
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Could not send the code.');
            setLoading(false);
        }
    };

    const handleConfirmCode = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        const verificationId = verificationIdRef.current;
        if (!verificationId) {
            setError('That code has expired. Please request a new one.');
            setStep('number');
            return;
        }

        setLoading(true);
        try {
            const idToken = await confirmCode(verificationId, code.trim());
            await routeVerifiedToken(idToken);
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'That code isn\'t correct.');
            setLoading(false);
        }
    };

    const handleCompleteSignup = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        const idToken = idTokenRef.current;
        if (!idToken) {
            setError('Your verification expired. Please start again.');
            setStep('number');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/auth/phone/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idToken,
                    email,
                    name,
                    isSubscribed,
                    visitorId: getVisitorId(),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // EMAIL_TAKEN is deliberate: we refuse to link a verified phone to
                // an account identified only by a self-asserted email.
                setError(data.error || 'Could not create your account.');
                setLoading(false);
                return;
            }

            await completeSignIn(idToken);
        } catch {
            setError('Could not create your account. Please try again.');
            setLoading(false);
        }
    };

    const reset = () => {
        void sessionRef.current?.cancel();
        sessionRef.current = null;
        verificationIdRef.current = null;
        idTokenRef.current = null;
        setStep('number');
        setCode('');
        setError('');
        setLoading(false);
    };

    if (!available) return null;

    // Collapsed: just the entry point alongside the Google button.
    if (!open) {
        return (
            <button
                type="button"
                className={styles.googleBtn}
                onClick={() => setOpen(true)}
            >
                <Phone size={18} />
                Continue with Phone
            </button>
        );
    }

    return (
        <div>
            {error && (
                <div className={styles.error}>
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {step === 'number' && (
                <form onSubmit={handleSendCode} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="phone">Phone Number</label>
                        <input
                            type="tel"
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            autoComplete="tel"
                            inputMode="tel"
                            required
                        />
                    </div>
                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        <Phone size={18} />
                        {loading ? 'Sending code…' : 'Send Code'}
                    </button>
                </form>
            )}

            {step === 'code' && (
                <form onSubmit={handleConfirmCode} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="otp">Enter the 6-digit code</label>
                        <input
                            type="text"
                            id="otp"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="123456"
                            /* one-time-code lets iOS offer the SMS code above the keyboard */
                            autoComplete="one-time-code"
                            inputMode="numeric"
                            maxLength={6}
                            required
                            autoFocus
                        />
                    </div>
                    <button type="submit" className={styles.submitBtn} disabled={loading || code.length < 6}>
                        {loading ? 'Verifying…' : 'Verify & Continue'}
                    </button>
                    <button
                        type="button"
                        className={styles.toggleBtn}
                        onClick={(e) => handleSendCode(e, true)}
                        disabled={loading}
                    >
                        Resend code
                    </button>
                </form>
            )}

            {step === 'signup' && (
                <form onSubmit={handleCompleteSignup} className={styles.form}>
                    <p className={styles.subtitle}>
                        Your number is verified. Just one more detail so we can send your
                        reports and insights.
                    </p>
                    <div className={styles.formGroup}>
                        <label htmlFor="phoneSignupName">Full Name</label>
                        <input
                            type="text"
                            id="phoneSignupName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            autoComplete="name"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="phoneSignupEmail">Email</label>
                        <input
                            type="email"
                            id="phoneSignupEmail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                        />
                    </div>
                    <div className={styles.checkboxGroup}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={isSubscribed}
                                onChange={(e) => setIsSubscribed(e.target.checked)}
                            />
                            <span>Subscribe to newsletter for cosmic updates</span>
                        </label>
                    </div>
                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? 'Creating account…' : 'Create Account'}
                    </button>
                </form>
            )}

            <div className={styles.toggle}>
                <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => {
                        if (step === 'number') {
                            setOpen(false);
                            reset();
                        } else {
                            reset();
                        }
                    }}
                    disabled={loading}
                >
                    <ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {step === 'number' ? 'Other sign-in options' : 'Use a different number'}
                </button>
            </div>
        </div>
    );
}
