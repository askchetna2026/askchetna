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

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    /**
     * App home.
     *
     * "/" is a marketing page: a long scroll that explains the product and asks
     * for a signup. That is the right landing for a browser and the wrong one
     * for someone who already installed the app and signed in — they want the
     * product, not the pitch. Signed-in native requests get the dashboard.
     *
     * Rewrite rather than redirect: the URL stays "/", so there is no extra
     * round trip on cold start and no visible bounce. AppTabBar matches "/" for
     * the Today tab so the bar still highlights correctly.
     *
     * Gated on the app User-Agent FIRST, deliberately. Browser traffic — which
     * includes every crawler — never reaches the session lookup, so "/" stays
     * fast and statically served for the SEO pages, and Googlebot still sees
     * the marketing page.
     */
    if (pathname === "/" && parseAppPlatform(request.headers.get("user-agent")) !== "web") {
        try {
            const session = await auth()
            if (session) {
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
