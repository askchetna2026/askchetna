'use client';

import { useEffect, useState, Suspense } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import { Mail, AlertCircle } from 'lucide-react';
import { getVisitorId, trackEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import PhoneLoginPanel from './PhoneLoginPanel';

// Force dynamic rendering to avoid build errors with useSearchParams
export const dynamic = 'force-dynamic';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';
    const forcedSignup = searchParams.get('mode') === 'signup';

    const [isLogin, setIsLogin] = useState(!forcedSignup);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        isSubscribed: true // Default to true as requested
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    // True while the native phone/OTP flow is on screen, so we collapse the
    // email + Google options and keep one clear path at a time.
    const [phoneFlowActive, setPhoneFlowActive] = useState(false);

    // Sign in with Apple is required by App Store guideline 4.8 because we also
    // offer Google. Driven by NextAuth's actual provider list rather than a
    // separate NEXT_PUBLIC_ flag, so the button can never appear without a
    // working provider behind it.
    //
    // Shown on every platform, not just iOS: an account created with Apple in
    // the app must still be signable-in on the website, otherwise those users
    // are stranded.
    const [appleEnabled, setAppleEnabled] = useState(false);

    // Google is hidden unless a working provider exists: `google` for the web
    // OAuth flow, `google-native` for the apps. Both are registered only when
    // their credentials are present, so this can't show a button that fails.
    //
    // Starts TRUE so the button doesn't visibly pop in on the common path where
    // it is configured; it hides only if the provider list says otherwise.
    const [googleEnabled, setGoogleEnabled] = useState(true);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const providers = await getProviders();
                if (cancelled) return;
                setAppleEnabled(!!providers?.apple);
                setGoogleEnabled(!!(providers?.google || providers?.['google-native']));
            } catch {
                // Leave whatever defaults are set — a network blip shouldn't
                // remove sign-in options.
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (forcedSignup) {
            setIsLogin(false);
            setError('');
        }
    }, [forcedSignup]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // Sign in with credentials
                const result = await signIn('credentials', {
                    email: formData.email,
                    password: formData.password,
                    redirect: false,
                });

                if (result?.error) {
                    setError('Invalid email or password');
                } else {
                    router.push(callbackUrl);
                    router.refresh();
                }
            } else {
                void trackEvent(ANALYTICS_EVENTS.SIGNUP_STARTED, {
                    path: '/login',
                    metadata: {
                        method: 'email',
                        subscribed: formData.isSubscribed,
                        callbackUrl,
                    },
                });

                // Register new user
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: formData.email,
                        password: formData.password,
                        name: formData.name,
                        isSubscribed: formData.isSubscribed,
                        visitorId: getVisitorId(),
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    setError(data.error || 'Registration failed');
                } else {
                    // Auto sign in after registration
                    const result = await signIn('credentials', {
                        email: formData.email,
                        password: formData.password,
                        redirect: false,
                    });

                    if (result?.error) {
                        setError('Account created but login failed. Please try logging in.');
                    } else {
                        router.push(callbackUrl);
                        router.refresh();
                    }
                }
            }
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');

        // In the apps, Google OAuth CANNOT run in the WebView — Google blocks it
        // (`disallowed_useragent`) and escapes to the system browser, where the
        // session cookie lands in the browser's cookie jar and the app stays
        // signed out. Use the native SDK and exchange its token instead.
        const { isNativeGoogleAvailable, signInWithGoogleNative, releaseGoogleFirebaseSession } =
            await import('@/lib/native/googleAuth');

        if (isNativeGoogleAvailable()) {
            setLoading(true);
            try {
                const outcome = await signInWithGoogleNative();

                if (outcome.status === 'cancelled') return;
                if (outcome.status === 'error') {
                    setError(outcome.message);
                    return;
                }

                const result = await signIn('google-native', {
                    idToken: outcome.idToken,
                    redirect: false,
                });

                if (result?.error) {
                    setError('We verified your Google account but could not sign you in. Please try again.');
                    return;
                }

                void releaseGoogleFirebaseSession();
                // Full reload so every server component re-renders with the new
                // session cookie.
                window.location.assign(callbackUrl);
            } catch {
                setError('Google sign-in failed');
            } finally {
                setLoading(false);
            }
            return;
        }

        try {
            await signIn('google', { callbackUrl });
        } catch {
            setError('Google sign-in failed');
        }
    };

    const handleAppleLogin = async () => {
        setError('');
        try {
            await signIn('apple', { callbackUrl });
        } catch {
            setError('Apple sign-in failed');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.loginBox}>
                <h1 className={styles.title}>
                    {isLogin ? 'Welcome Back' : 'Create Account'}
                </h1>
                <p className={styles.subtitle}>
                    {isLogin
                        ? 'Sign in to access your chart and insights'
                        : 'Join AskChetna for personalized astrological awareness'}
                </p>

                {error && (
                    <div className={styles.error}>
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {/* Hidden while the phone/OTP flow is on screen so there's exactly
                    one sign-in path visible at a time. */}
                <div hidden={phoneFlowActive}>
                <form onSubmit={handleSubmit} className={styles.form}>
                    {!isLogin && (
                        <div className={styles.formGroup}>
                            <label htmlFor="name">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Your name"
                            />
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            placeholder="••••••••"
                            minLength={isLogin ? 6 : 8}
                        />
                    </div>

                    {!isLogin && (
                        <div className={styles.checkboxGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={formData.isSubscribed}
                                    onChange={(e) => setFormData({ ...formData, isSubscribed: e.target.checked })}
                                />
                                <span>Subscribe to newsletter for cosmic updates</span>
                            </label>
                        </div>
                    )}

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        <Mail size={18} />
                        {loading ? 'Processing...' : (isLogin ? 'Sign In with Email' : 'Sign Up with Email')}
                    </button>
                </form>

                {(googleEnabled || appleEnabled) && (
                    <div className={styles.divider}>
                        <span>or</span>
                    </div>
                )}

                {googleEnabled && (
                    <button onClick={handleGoogleLogin} className={styles.googleBtn} disabled={loading}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </button>
                )}

                {/* Guideline 4.8 requires this to sit at equal prominence to the
                    other third-party option, not tucked away. */}
                {appleEnabled && (
                    <button onClick={handleAppleLogin} className={styles.googleBtn} disabled={loading}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                        </svg>
                        Continue with Apple
                    </button>
                )}
                </div>

                {/* Native apps only — renders nothing in a browser. */}
                <PhoneLoginPanel
                    callbackUrl={callbackUrl}
                    onActiveChange={setPhoneFlowActive}
                />

                <div className={styles.toggle} hidden={phoneFlowActive}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className={styles.toggleBtn}>
                        {isLogin ? 'Sign Up' : 'Sign In'}
                    </button>
                </div>

                <p className={styles.disclaimer}>
                    By continuing, you agree to our{' '}
                    <Link href="/terms">Terms of Service</Link> and{' '}
                    <Link href="/privacy">Privacy Policy</Link>.
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--gold)' }}>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
