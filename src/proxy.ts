import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { PAYMENTS_ENABLED } from "@/lib/paymentConfig"
// Pure regex over a string — no Node built-ins at module scope, which is what
// this file requires. `getAppPlatform` in the same module does reach for
// next/headers, but only inside the function body, so importing here is safe.
import { parseAppPlatform } from "@/lib/platform"

// Protected routes that require authentication
const protectedPaths = [
    "/chart",
    "/clarity",
    "/timing",
    "/synastry",
    // The app's signed-in home. Normally reached as a rewrite of "/" — already
    // behind a session check by the time it renders — but it is a real route, so
    // a direct hit needs the same boundary as any other signed-in screen.
    "/today",
    // The page itself also redirects when unauthenticated, but gating here means
    // the auth boundary is enforced before any rendering begins rather than
    // relying on a streamed redirect instruction.
    "/account",
    // Consultations spend credits and open a private conversation, so the same
    // reasoning applies: the pages call redirect() too, but a streamed redirect
    // instruction is not an auth boundary. Covers /consult and /consult/[id].
    "/consult",
    // Astrologer application and dashboard.
    "/astrologer",
    // Admin. This only enforces "signed in" — the admin ROLE check stays in
    // checkAdminAccess on each page, because the proxy runs on the Edge and has
    // no business loading the admin allowlist. The gain is that a signed-out
    // request gets a real 307 instead of a 200 whose redirect is streamed as an
    // instruction the client may or may not act on.
    "/admin",
    ...(PAYMENTS_ENABLED ? ["/pricing"] : [])
]

/**
 * Is there a session cookie at all?
 *
 * The cheap gate in front of every session lookup on "/". Anonymous traffic —
 * which is every crawler and most visitors — carries no such cookie, so it
 * never reaches `auth()` and the marketing page stays statically served.
 *
 * Matched by suffix rather than by exact name: Auth.js prefixes the cookie with
 * `__Secure-` over HTTPS and splits it into `.0`, `.1` chunks once it grows past
 * 4 KB, and an exact match would quietly stop working in production.
 */
function hasSessionCookie(request: NextRequest): boolean {
    return request.cookies.getAll().some((c) => c.name.includes("authjs.session-token"))
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    /**
     * App home.
     *
     * "/" is a marketing page: a long scroll that explains the product and asks
     * for a signup. That is the right landing for a browser and the wrong one
     * for anyone who reached us through a store listing — they already
     * converted, and a second pitch is the screen standing between them and the
     * product. So the app gets its own two home screens and the website keeps
     * this one, unchanged:
     *
     *   native + signed in   -> /today      the product's daily surface
     *   native + signed out  -> /app-home   one screen, one call to action
     *   web (either)         -> the marketing page, untouched
     *
     * An APPROVED astrologer still gets their own desk on every platform, which
     * is why that branch is checked first.
     *
     * Rewrite rather than redirect: the URL stays "/", so there is no extra
     * round trip on cold start and no visible bounce. AppTabBar matches "/" for
     * the Today tab so the bar still highlights correctly.
     *
     * This has to happen HERE rather than in the page component. "/" is a client
     * component, so the server renders it before the session is known — which
     * means branching in React paints the seeker home and then swaps it for the
     * astrologer's, a visible flash of the wrong page on every load.
     *
     * The astrologer status rides on the session token (see the jwt callback),
     * so deciding this costs a cookie decode and no database round trip.
     */
    if (pathname === "/") {
        const platform = parseAppPlatform(request.headers.get("user-agent"))

        if (hasSessionCookie(request)) {
            try {
                const session = await auth()
                if (session?.user?.astrologerStatus === "APPROVED") {
                    return NextResponse.rewrite(new URL("/astrologer", request.url))
                }
                if (session && platform !== "web") {
                    return NextResponse.rewrite(new URL("/today", request.url))
                }
            } catch {
                // Never let a session failure take out the home page. Falling
                // through serves the app welcome (or, on the web, the marketing
                // page) — both are correct for someone we cannot identify.
            }
        }

        // Anonymous traffic never reaches auth() above, so this is the only
        // branch a crawler or a first-launch app user takes. The web keeps its
        // statically served marketing page; only the app diverts.
        if (platform !== "web") {
            return NextResponse.rewrite(new URL("/app-home", request.url))
        }
    }

    // Check if the path needs authentication
    const isProtectedPath = protectedPaths.some(path =>
        pathname.startsWith(path)
    )

    if (isProtectedPath) {
        const session = await auth()

        if (!session) {
            // Redirect to login with callback URL
            const url = new URL("/login", request.url)
            url.searchParams.set("callbackUrl", pathname)
            return NextResponse.redirect(url)
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - /api/auth (authentication endpoints)
         * - /_next/static (static files)
         * - /_next/image (image optimization files)
         * - /favicon.ico (favicon file)
         * - /public (public files)
         */
        '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
