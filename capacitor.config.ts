import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the AskChetna iOS and Android apps.
 *
 * ARCHITECTURE
 * The apps do not bundle the web app. `server.url` points the WebView at the
 * live site, so anything deployed to Vercel — pages, styling, copy, pricing,
 * API logic — reaches users immediately with no store resubmission. Native
 * capability (phone OTP, push, IAP, camera, haptics) is added through plugins
 * and called from the same web codebase.
 *
 * LAYOUT
 * The native projects live under mobile/ via the `path` options below, keeping
 * them out of the repo root and away from Vercel's build. Capacitor's npm
 * dependencies deliberately stay in the ROOT package.json rather than a
 * separate mobile/ one: the JS half of each plugin is imported by the Next app
 * while the native half is synced into these projects, and two package.json
 * files would eventually drift out of version lockstep — which produces subtle
 * native/JS mismatches at runtime.
 *
 * `webDir` is only a thin local shell (the offline fallback), not a web build.
 */

/**
 * Which deployment the app loads.
 *
 * Defaults to the canonical PRODUCTION host. Note `www`: the apex
 * askchetna.com issues a 308 to www.askchetna.com, so pointing at the apex would
 * make every cold start pay a redirect before first paint.
 *
 * Override for test builds:
 *   CAP_SERVER_URL=https://preview.askchetna.com npx cap sync
 *
 * Baked into the native project at `cap sync` time, so changing it requires a
 * rebuild — unlike web content, which updates over the air.
 */
const SERVER_URL = process.env.CAP_SERVER_URL || 'https://www.askchetna.com';

const config: CapacitorConfig = {
    appId: 'com.askchetnam.app',
    appName: 'AskChetna',

    // Not a web build — just the bundled offline page referenced by errorPath.
    webDir: 'mobile/shell',

    server: {
        url: SERVER_URL,

        // Shown when the site can't be reached at all. NOTE: on Android an
        // errorPath page has no access to Capacitor plugins, which is why
        // mobile/shell/offline.html is plain static HTML with no bridge calls.
        errorPath: 'offline.html',

        androidScheme: 'https',

        // No plaintext HTTP, ever. Also required for Play/App Store review.
        cleartext: false,
    },

    android: {
        path: 'mobile/android',

        // Detected by src/lib/platform.ts on both server and client. The site
        // uses it to enable phone sign-in and to branch payment UI.
        appendUserAgent: 'AskChetnaApp/1 (android)',

        // Matches --background in globals.css so there's no white flash between
        // the splash screen and first paint.
        backgroundColor: '#0B0F2FFF',

        allowMixedContent: false,
        zoomEnabled: false,

        // Our service worker is served from the real https://askchetna.com
        // origin, so the WebView should handle its requests natively. The
        // default (true) routes them through Capacitor's bridge, which exists
        // for locally-bundled assets and has nothing to resolve here.
        resolveServiceWorkerRequests: false,

        // Remote WebView inspection is off unless explicitly opted in. Leaving
        // it on in a release build would let anyone with the device read the
        // signed-in session. Set CAP_DEBUG_WEBVIEW=1 before `cap sync` when you
        // need to debug on a real device.
        webContentsDebuggingEnabled: process.env.CAP_DEBUG_WEBVIEW === '1',
    },

    ios: {
        path: 'mobile/ios',

        appendUserAgent: 'AskChetnaApp/1 (ios)',
        backgroundColor: '#0B0F2FFF',
        zoomEnabled: false,

        // 'never' hands safe-area handling entirely to CSS. The layout sets
        // viewport-fit=cover and globals.css compensates with
        // env(safe-area-inset-*) under .native-app, which gives the
        // black-translucent status bar its full-bleed look. Letting WKWebView
        // also inset the content would double-pad it.
        contentInset: 'never',

        // Must stay false: with app-bound domains enabled, WKWebView blocks
        // navigation to any domain not declared in Info.plist, which would break
        // Razorpay checkout and Google OAuth redirects.
        limitsNavigationsToAppBoundDomains: false,

        webContentsDebuggingEnabled: process.env.CAP_DEBUG_WEBVIEW === '1',
    },

    plugins: {
        SplashScreen: {
            // launchAutoHide stays TRUE deliberately. The tidier pattern is to
            // hide the splash from JS after first paint, but if the site is
            // unreachable the Android error page can't call plugins (see
            // errorPath above) and the app would sit on the splash screen
            // forever. The web app still calls hide() on first paint, which
            // shortens this in the normal case; auto-hide is the safety net.
            launchAutoHide: true,

            // This is a FALLBACK duration, not the expected one.
            //
            // It was 2000, which is shorter than a cold start that has to fetch
            // a remote site over mobile data. The splash dismissed itself before
            // the first paint and left the user looking at an empty WebView —
            // the "app opens to a blank screen" report.
            //
            // NativeAppShell calls hide() as soon as the site paints, so in the
            // normal case this number is never reached and the splash is as
            // brief as it always was. It only matters when the site is slow or
            // unreachable, which is exactly when dismissing early is wrong.
            launchShowDuration: 15000,

            backgroundColor: '#0B0F2F',
            androidScaleType: 'CENTER_CROP',

            // Something has to move while a slow network is being waited on; a
            // motionless splash for several seconds reads as a hung app.
            showSpinner: true,
            androidSpinnerStyle: 'small',
            iosSpinnerStyle: 'small',
            splashFullScreen: true,
            splashImmersive: false,
        },

        PushNotifications: {
            // Foreground presentation on iOS. Android channel setup happens in
            // src/lib/native/push.ts.
            presentationOptions: ['badge', 'sound', 'alert'],
        },

        FirebaseAuthentication: {
            // Phone OTP, plus Google — Google refuses to complete OAuth inside a
            // WebView (`disallowed_useragent`), so in the apps it must run through
            // the native SDK. Both exchange a Firebase ID token for a NextAuth
            // session, keeping NextAuth the single session authority.
            skipNativeAuth: false,
            providers: ['phone', 'google.com'],
        },
    },
};

export default config;
