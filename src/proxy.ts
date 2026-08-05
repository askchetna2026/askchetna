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
     * for someone who already installed the app and signed in — they want the
     * product, not the pitch. Signed-in native requests get the dashboard, and
     * an APPROVED astrologer gets their own desk on every platform.
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
    if (pathname === "/" && hasSessionCookie(request)) {
        try {
            const session = await auth()
            if (session?.user?.astrologerStatus === "APPROVED") {
                return NextResponse.rewrite(new URL("/astrologer", request.url))
            }
            if (session && parseAppPlatform(request.headers.get("user-agent")) !== "web") {
                return NextResponse.rewrite(new URL("/dashboard", request.url))
            }
        } catch {
            // Never let a session failure take out the home page. Falling
            // through serves the marketing page, which is the correct
            // degradation — signed-out app users see it anyway.
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
