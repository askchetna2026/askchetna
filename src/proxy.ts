import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/auth"
import { PAYMENTS_ENABLED } from "@/lib/paymentConfig"

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
    ...(PAYMENTS_ENABLED ? ["/pricing"] : [])
]

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

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
