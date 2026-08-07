/**
 * AskChetna service worker.
 *
 * Goals, in priority order:
 *   1. Never serve stale or wrong content. The site is the single source of
 *      truth and deploys must appear immediately in the apps.
 *   2. Provide a usable offline screen instead of a dead webview.
 *   3. Cut repeat-visit load time on immutable build assets.
 *
 * Deliberate non-goals — these are the footguns this file avoids:
 *
 *   - HTML/navigation responses are NEVER cached. Most pages here are
 *     authenticated and user-specific (dashboard, chart, clarity). Caching them
 *     risks serving one signed-in user's page to another from a shared cache,
 *     and would make Vercel deploys look "stuck" behind stale HTML. Offline
 *     users get the precached /offline page instead.
 *   - /api/* is never touched. Credits, payments and auth must always hit the
 *     network; a cached balance or a replayed mutation would be a real bug.
 */

// Bumped when the worker's behaviour changes, not just its caches: the activate
// handler drops every askchetna-* cache that is not the current pair, so a bump
// is how a bad worker's leftovers are guaranteed gone. v1 -> v2 retires the
// precached '/offline' page along with navigation interception.
const VERSION = 'v2';
const PRECACHE = `askchetna-precache-${VERSION}`;
const ASSETS = `askchetna-assets-${VERSION}`;

// Small and stable — safe to precache.
//
// '/offline' used to be here as the fallback this worker served when a
// navigation failed. The worker no longer touches navigations (see the fetch
// handler for why), so caching it bought nothing — the app's offline screen is
// mobile/shell/offline.html, served natively by Capacitor's errorPath.
const PRECACHE_URLS = [
    '/chetna_icon.svg',
    '/icons/chetna.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(PRECACHE);
            // Individually so one 404 can't fail the whole install.
            await Promise.all(
                PRECACHE_URLS.map((url) =>
                    cache.add(new Request(url, { cache: 'reload' })).catch(() => {
                        console.warn('[sw] precache miss:', url);
                    })
                )
            );
            await self.skipWaiting();
        })()
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            // Drop caches from previous versions of this worker.
            const keys = await caches.keys();
            await Promise.all(
                keys
                    .filter((key) => key.startsWith('askchetna-') && key !== PRECACHE && key !== ASSETS)
                    .map((key) => caches.delete(key))
            );
            await self.clients.claim();
        })()
    );
});

/**
 * fetch() with a ceiling.
 *
 * Whenever this worker calls respondWith, the page's request cannot complete
 * until the worker's promise settles — so an unbounded fetch on a flaky mobile
 * network stalls that request forever, with no error and no timeout of its own.
 *
 * On failure the request is retried once without the worker in the way, so a
 * genuinely slow-but-alive network still succeeds.
 */
async function fetchWithTimeout(request, timeoutMs = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(request, { signal: controller.signal });
    } catch (error) {
        console.warn('[sw] fetch timed out or failed, retrying once:', request.url, error);
        return fetch(request);
    } finally {
        clearTimeout(timer);
    }
}

/** Build output is content-hashed and immutable, so cache-first is always correct. */
function isImmutableAsset(url) {
    return url.pathname.startsWith('/_next/static/');
}

/** Brand images and the ephemeris payloads: large, rarely change, safe to reuse. */
function isCacheableAsset(url) {
    return (
        /\.(?:png|jpe?g|svg|webp|avif|gif|ico|woff2?)$/i.test(url.pathname) ||
        url.pathname === '/swisseph.wasm' ||
        url.pathname === '/swisseph.data'
    );
}

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Mutations and non-GET verbs always go straight to the network.
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Only handle our own origin. Razorpay, Google Fonts, Firebase etc. pass through.
    if (url.origin !== self.location.origin) return;

    // Never intercept API traffic, auth callbacks, or admin.
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

    /* ---- Navigations: not ours. Let the browser make the request. ----
     *
     * This used to call event.respondWith(fetch(request)) with an offline
     * fallback, and it broke the native apps in a way that took a long time to
     * see.
     *
     * Capacitor identifies the app to the server by appending a token to the
     * User-Agent — `AskChetnaApp/1 (android)` — which src/proxy.ts reads to
     * decide whether "/" is the website or the app's home screen. On Android
     * that append happens via WebSettings.setUserAgentString(), which applies to
     * the WEBVIEW. A service worker runs under a separate ServiceWorkerController
     * and does not inherit it. So every navigation the worker re-issued went out
     * with the stock Android User-Agent, the server concluded "browser", and the
     * app was served the website — on every page, for every user.
     *
     * The symptom was maddening because everything client-side still worked:
     * navigator.userAgent kept the token inside the WebView, so the bottom tab
     * bar rendered, App Info reported "Native App ✓", and /api/version returned
     * the right build — that last one only because API paths return above and
     * were never re-issued. The one thing that was wrong was the only thing that
     * mattered: the HTML.
     *
     * Not intercepting costs the custom offline page on navigations, and that is
     * a fair trade. The worker never cached HTML anyway, so it was adding a
     * round trip through a context with the wrong identity in exchange for one
     * error page. The apps already handle being offline natively, at the layer
     * that can actually do it: capacitor.config.ts sets errorPath to
     * mobile/shell/offline.html.
     *
     * Navigation preload would keep that fallback and still let the browser
     * issue the request — but it fails open to plain fetch() wherever it is
     * unavailable, which silently reinstates this bug. Assets below are
     * unaffected: they are same-origin subresources, requested by the page.
     */

    // ---- Immutable build assets: cache-first ----
    if (isImmutableAsset(url)) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(ASSETS);
                const hit = await cache.match(request);
                if (hit) return hit;

                // Bounded, because this worker owns the response: a hanging fetch
                // here hangs the page's request indefinitely. That is not
                // theoretical — it stalled a dynamic import() of a lazily loaded
                // module on device, and the feature waiting on that import simply
                // never proceeded.
                const response = await fetchWithTimeout(request);
                if (response.ok) cache.put(request, response.clone());
                return response;
            })()
        );
        return;
    }

    // ---- Other static assets: stale-while-revalidate ----
    if (isCacheableAsset(url)) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(ASSETS);
                const hit = await cache.match(request);

                const network = fetch(request)
                    .then((response) => {
                        if (response.ok) cache.put(request, response.clone());
                        return response;
                    })
                    .catch(() => undefined);

                // Serve cache immediately when we have it; refresh in the background.
                const response = hit || (await network);
                if (response) return response;
                return new Response('', { status: 504, statusText: 'Offline' });
            })()
        );
    }

    // Everything else: default browser behaviour.
});

/** Lets the app trigger an immediate worker swap after a deploy. */
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
