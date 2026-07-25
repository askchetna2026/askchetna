/**
 * Native-app platform detection.
 *
 * The mobile apps are Capacitor shells that load this same site from
 * https://askchetna.com, so the web bundle is byte-identical between browser
 * and app. To let code branch on "am I running inside the app?", the Capacitor
 * config appends a token to the webview's User-Agent:
 *
 *     AskChetnaApp/1 (ios)      AskChetnaApp/1 (android)
 *
 * We deliberately detect via User-Agent rather than `window.Capacitor` so the
 * SAME answer is available on the server and the client. That matters for two
 * reasons:
 *
 *   1. Apple reviewers see server-rendered HTML. Hiding Razorpay purchase UI on
 *      iOS (App Store guideline 3.1.1) has to happen server-side — a
 *      client-only check would still ship the markup.
 *   2. Server and client agree, so there is no hydration mismatch.
 *
 * Calling native *plugins* still requires the Capacitor JS API; this module is
 * only about knowing which platform we're on.
 */

export type AppPlatform = 'ios' | 'android' | 'web';

/** Matches the token injected by `appendUserAgent` in capacitor.config.ts. */
const APP_UA_PATTERN = /AskChetnaApp\/\d+\s*\((ios|android)\)/i;

/**
 * Parse an App Platform out of a User-Agent string.
 * Exported so both the server and client helpers share one source of truth.
 */
export function parseAppPlatform(userAgent: string | null | undefined): AppPlatform {
    if (!userAgent) return 'web';
    const match = userAgent.match(APP_UA_PATTERN);
    if (!match) return 'web';
    return match[1].toLowerCase() === 'ios' ? 'ios' : 'android';
}

/**
 * Server-side platform detection for Server Components and route handlers.
 *
 * NOTE: reading headers opts the calling route into dynamic rendering. Call it
 * only in routes that genuinely need to branch (e.g. /pricing), never in the
 * root layout — doing so there would make every page on the site dynamic and
 * lose static generation for the SEO landing pages.
 */
export async function getAppPlatform(): Promise<AppPlatform> {
    // Imported lazily so this module stays importable from client components.
    const { headers } = await import('next/headers');
    const headerList = await headers();
    return parseAppPlatform(headerList.get('user-agent'));
}

/** True when served to the iOS app, where Apple requires IAP for credits. */
export async function isIosApp(): Promise<boolean> {
    return (await getAppPlatform()) === 'ios';
}

/** True inside either native app (as opposed to a desktop/mobile browser). */
export async function isNativeApp(): Promise<boolean> {
    return (await getAppPlatform()) !== 'web';
}

/**
 * Client-side equivalent. Safe to call during render: it reads the same
 * User-Agent the server read, so SSR and hydration agree.
 *
 * Returns 'web' when called during SSR of a client component (no navigator),
 * which is the correct conservative default.
 */
export function getClientAppPlatform(): AppPlatform {
    if (typeof navigator === 'undefined') return 'web';
    return parseAppPlatform(navigator.userAgent);
}

export function isClientNativeApp(): boolean {
    return getClientAppPlatform() !== 'web';
}

/**
 * Inline script that tags <html> with the current platform before first paint.
 *
 * Rendered as a blocking script in the root layout — the same technique theme
 * switchers use — so safe-area padding and app-only styles apply without a
 * visible reflow, and without forcing dynamic rendering on the whole site.
 *
 * Sets: class="native-app" plus data-app-platform="ios|android".
 */
export const PLATFORM_BOOTSTRAP_SCRIPT = `(function(){try{var m=navigator.userAgent.match(/AskChetnaApp\\/\\d+\\s*\\((ios|android)\\)/i);if(m){var p=m[1].toLowerCase();document.documentElement.classList.add('native-app');document.documentElement.setAttribute('data-app-platform',p);}}catch(e){}})();`;
