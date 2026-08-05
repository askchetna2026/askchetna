'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isClientNativeApp, getClientAppPlatform } from '@/lib/platform';

/**
 * Whether a hostname belongs to us.
 *
 * Deliberately NOT `hostname.endsWith('askchetna.com')` — that also matches
 * `evil-askchetna.com`, which would let an attacker's page be treated as
 * first-party: opened inside the WebView (where there is no URL bar to expose
 * it) and accepted as a deep-link target.
 *
 * Matches the apex plus any subdomain, so www, preview and future environments
 * all count as ours.
 */
function isOwnHost(hostname: string): boolean {
    return hostname === 'askchetna.com' || hostname.endsWith('.askchetna.com');
}

/**
 * Wires up native behaviour for the Capacitor apps. Renders an offline banner;
 * otherwise invisible.
 *
 * A complete no-op in a browser: every plugin is behind a dynamic import inside
 * an isClientNativeApp() guard, so website visitors never download any of it.
 *
 * What this covers — the difference between "a website in a webview" and
 * something that feels like an app, which is also what App Store guideline 4.2
 * is really asking about:
 *
 *   - hides the splash screen once the site has actually painted
 *   - styles the status bar to match the active theme
 *   - makes the Android hardware back button behave like a native one
 *   - opens external links in the system browser instead of trapping them
 *   - surfaces connectivity loss instead of showing a blank WebView
 *   - routes deep links / notification taps to the right screen
 */
export default function NativeAppShell() {
    const router = useRouter();
    const [offline, setOffline] = useState(false);

    useEffect(() => {
        if (!isClientNativeApp()) return;

        const platform = getClientAppPlatform();
        // Collected so every listener is detached on unmount; leaked native
        // listeners survive client-side navigation and fire twice.
        const cleanups: Array<() => void> = [];
        let cancelled = false;

        const track = async (register: Promise<{ remove: () => Promise<void> } | void>) => {
            const handle = await register;
            if (!handle) return;
            if (cancelled) {
                void handle.remove();
                return;
            }
            cleanups.push(() => void handle.remove());
        };

        void (async () => {
            // ---- Splash screen ----
            // The site has painted by the time this effect runs, so dismiss the
            // splash now. capacitor.config.ts also sets launchAutoHide as a
            // safety net for the case where the site never loads at all.
            try {
                const { SplashScreen } = await import('@capacitor/splash-screen');
                await SplashScreen.hide();
            } catch { /* plugin unavailable — not fatal */ }

            // ---- Status bar ----
            try {
                const { StatusBar, Style } = await import('@capacitor/status-bar');

                const applyStatusBarTheme = async () => {
                    // One palette: parchment. Style.Light means dark text on a light bar.
                    await StatusBar.setStyle({ style: Style.Light });
                    if (platform === 'android') {
                        // iOS uses the translucent bar configured via
                        // apple-mobile-web-app-status-bar-style instead.
                        await StatusBar.setBackgroundColor({
                            color: '#F2EAD5',
                        });
                    }
                };

                await applyStatusBarTheme();

                // The site can toggle theme at runtime; keep the bar in sync.
                const observer = new MutationObserver(() => void applyStatusBarTheme());
                observer.observe(document.documentElement, {
                    attributes: true,
                    attributeFilter: ['data-theme'],
                });
                cleanups.push(() => observer.disconnect());
            } catch { /* plugin unavailable */ }

            // ---- Connectivity ----
            try {
                const { Network } = await import('@capacitor/network');

                const status = await Network.getStatus();
                if (!cancelled) setOffline(!status.connected);

                await track(
                    Network.addListener('networkStatusChange', (state) => {
                        setOffline(!state.connected);
                    })
                );
            } catch { /* plugin unavailable */ }

            // ---- Android hardware back button ----
            try {
                const { App } = await import('@capacitor/app');

                await track(
                    App.addListener('backButton', ({ canGoBack }) => {
                        if (canGoBack) {
                            window.history.back();
                        } else {
                            // At the root of history, back should exit rather than
                            // leave the user stuck on an unresponsive button.
                            void App.exitApp();
                        }
                    })
                );

                // ---- Deep links / universal links ----
                await track(
                    App.addListener('appUrlOpen', ({ url }) => {
                        try {
                            const target = new URL(url);
                            // Only follow links into our own site; anything else is
                            // handed to the system browser below.
                            if (isOwnHost(target.hostname)) {
                                router.push(target.pathname + target.search);
                            }
                        } catch {
                            console.warn('[native] unparseable deep link:', url);
                        }
                    })
                );

                // FCM rotates push tokens, so re-sync whenever the app comes
                // back to the foreground. Without this, delivery stops silently
                // after a rotation.
                await track(
                    App.addListener('resume', () => {
                        void import('@/lib/native/push').then((m) => m.syncExistingRegistration());
                    })
                );
            } catch { /* plugin unavailable */ }

            // ---- Push notifications ----
            // Dynamically imported like everything else here, so none of the push
            // wrapper reaches the web bundle either.
            //
            // Listeners only. The permission prompt is NOT triggered here — it's
            // wired to the settings toggle instead, because iOS asks once and a
            // cold-start prompt gets denied permanently.
            try {
                const push = await import('@/lib/native/push');

                const detachPush = await push.attachPushListeners((path) => router.push(path));
                if (cancelled) {
                    detachPush();
                } else {
                    cleanups.push(detachPush);
                    // Refresh the token if permission was granted on a previous run.
                    void push.syncExistingRegistration();
                }
            } catch (error) {
                console.warn('[native] push setup failed:', error);
            }

            // ---- External links ----
            try {
                const { Browser } = await import('@capacitor/browser');

                /**
                 * Send off-site links to the system browser.
                 *
                 * Two reasons this matters: users can't see a URL bar inside the
                 * WebView, so a third-party page there is a phishing surface; and
                 * Apple treats "wrapping other people's websites" as its own
                 * review problem. Capture phase so we intercept before the
                 * WebView begins navigating.
                 *
                 * Payment and OAuth flows are excluded on purpose — Razorpay and
                 * Google need to stay in the WebView to keep the session and
                 * return correctly.
                 */
                const onClick = (event: MouseEvent) => {
                    const anchor = (event.target as Element | null)?.closest?.('a');
                    if (!anchor) return;

                    const href = anchor.getAttribute('href');
                    if (!href || href.startsWith('#')) return;

                    let target: URL;
                    try {
                        target = new URL(href, window.location.href);
                    } catch {
                        return;
                    }

                    if (target.protocol !== 'http:' && target.protocol !== 'https:') return;
                    if (isOwnHost(target.hostname)) return;
                    if (target.hostname === window.location.hostname) return;

                    // Keep payment and auth flows in the WebView rather than
                    // bouncing them to the browser mid-flow, which would lose the
                    // session.
                    //
                    // The Google list is deliberately broad: its auth flow hops
                    // across several hostnames, and an earlier version excluded
                    // only accounts.google.com — narrow enough that other hops got
                    // pushed out to Chrome. Note that Google SIGN-IN no longer
                    // relies on this path at all (it runs natively, see
                    // src/lib/native/googleAuth.ts); this now only covers
                    // incidental Google links such as Maps or policy pages
                    // encountered mid-checkout.
                    if (/(^|\.)(razorpay\.com|rzp\.io|google\.com|googleapis\.com|gstatic\.com|googleusercontent\.com|apple\.com)$/.test(target.hostname)) {
                        return;
                    }

                    event.preventDefault();
                    void Browser.open({ url: target.href, presentationStyle: 'popover' });
                };

                document.addEventListener('click', onClick, true);
                cleanups.push(() => document.removeEventListener('click', onClick, true));
            } catch { /* plugin unavailable */ }
        })();

        return () => {
            cancelled = true;
            cleanups.forEach((fn) => fn());
        };
    }, [router]);

    if (!offline) return null;

    // Thin banner rather than a blocking overlay: cached pages stay readable
    // while offline, and it disappears the moment connectivity returns.
    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                padding: ' 10px 16px',
                paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
                background: 'rgba(11, 15, 47, 0.96)',
                borderTop: '1px solid rgba(181, 137, 46, 0.35)',
                color: 'var(--accent-gold-text)',
                textAlign: 'center',
                fontSize: '0.85rem',
                fontWeight: 600,
            }}
        >
            You&apos;re offline — some insights may be unavailable
        </div>
    );
}
