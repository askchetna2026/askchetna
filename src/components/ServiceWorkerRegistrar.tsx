'use client';

import { useEffect } from 'react';

/**
 * Registers public/sw.js, which provides the offline fallback page and asset
 * caching for both the website (as an installable PWA) and the Capacitor apps.
 *
 * Renders nothing. Mounted once from the root layout.
 *
 * In development registration is opt-in via `?sw=1` (remembered afterwards),
 * because the worker's cache-first rule for /_next/static/ would otherwise
 * serve stale HMR chunks and break fast refresh.
 */
export default function ServiceWorkerRegistrar() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        const isProd = process.env.NODE_ENV === 'production';

        if (!isProd) {
            // Sticky opt-in so a single ?sw=1 survives client-side navigation.
            if (new URLSearchParams(window.location.search).has('sw')) {
                try {
                    window.localStorage.setItem('ac_sw_dev', '1');
                } catch { /* private mode */ }
            }

            let optedIn = false;
            try {
                optedIn = window.localStorage.getItem('ac_sw_dev') === '1';
            } catch { /* private mode */ }

            if (!optedIn) return;
        }

        let cancelled = false;

        const register = async () => {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
                if (cancelled) return;

                // A new worker means a new deploy is available. Activate it right
                // away so Vercel deploys reach the apps without a relaunch —
                // safe here because the worker never caches HTML.
                registration.addEventListener('updatefound', () => {
                    registration.installing?.addEventListener('statechange', function onChange() {
                        if (this.state === 'installed' && navigator.serviceWorker.controller) {
                            registration.waiting?.postMessage('SKIP_WAITING');
                        }
                    });
                });
            } catch (error) {
                // Never fatal — the site works fine without a worker.
                console.warn('[sw] registration failed:', error);
            }
        };

        // Wait for load so registration never competes with first paint.
        if (document.readyState === 'complete') {
            void register();
        } else {
            window.addEventListener('load', register, { once: true });
        }

        return () => {
            cancelled = true;
            window.removeEventListener('load', register);
        };
    }, []);

    return null;
}
