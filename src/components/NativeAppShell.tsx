'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isClientNativeApp, getClientAppPlatform } from '@/lib/platform';

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
                    const theme = document.documentElement.getAttribute('data-theme');
                    // Style.Dark means "light text on a dark bar".
                    await StatusBar.setStyle({ style: theme === 'light' ? Style.Light : Style.Dark });
                    if (platform === 'android') {
                        // iOS uses the translucent bar configured via
                        // apple-mobile-web-app-status-bar-style instead.
                        await StatusBar.setBackgroundColor({
                            color: theme === 'light' ? '#FDF4E3' : '#0B0F2F',
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
                            if (target.hostname.endsWith('askchetna.com')) {
                                router.push(target.pathname + target.search);
                            }
                        } catch {
                            console.warn('[native] unparseable deep link:', url);
                        }
                    })
                );
            } catch { /* plugin unavailable */ }

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
                    if (target.hostname.endsWith('askchetna.com')) return;
                    if (target.hostname === window.location.hostname) return;

                    // Keep checkout and OAuth in the WebView.
                    if (/razorpay|rzp\.io|accounts\.google\.com|appleid\.apple\.com/.test(target.hostname)) {
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
                borderTop: '1px solid rgba(212, 175, 55, 0.35)',
                color: '#D4AF37',
                textAlign: 'center',
                fontSize: '0.85rem',
                fontWeight: 600,
            }}
        >
            You&apos;re offline — some insights may be unavailable
        </div>
    );
}
