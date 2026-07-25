import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isFirebaseConfigured, verifyPhoneIdToken } from "@/lib/firebaseAdmin";

/**
 * Step 1 of phone sign-in: does an account already exist for this number?
 *
 * The client calls this *after* the on-device OTP has succeeded, passing the
 * resulting Firebase ID token. That ordering is what makes this endpoint safe to
 * expose: you cannot ask "is +91XXXXXXXXXX registered?" without first proving you
 * own that number, so it can't be used to enumerate our user base.
 *
 * Response:
 *   { status: 'existing' }                  -> client calls signIn('phone-otp')
 *   { status: 'needs_signup', phone: '...' } -> client collects email, then /register
 */
export async function POST(req: NextRequest) {
    try {
        const limit = rateLimit(`phone-check:${getClientIp(req)}`, { limit: 30, windowMs: 15 * 60 * 1000 });
        if (!limit.allowed) {
            return NextResponse.json(
                { error: "Too many attempts. Please try again later." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
            );
        }

        // Fail loudly on misconfiguration. Without this, a missing env var would
        // fall through to the 401 below and every user would be told their
        // perfectly valid code was wrong.
        if (!isFirebaseConfigured()) {
            console.error("Phone check called but Firebase Admin is not configured.");
            return NextResponse.json(
                { error: "Phone sign-in is temporarily unavailable." },
                { status: 503 }
            );
        }

        const { idToken } = await req.json();

        let phone: string;
        try {
            ({ phone } = await verifyPhoneIdToken(String(idToken ?? "")));
        } catch (error) {
            // Detail stays in the server log; the client gets one generic message
            // so a caller can't probe why a token was rejected.
            console.warn("Phone check rejected:", error instanceof Error ? error.message : error);
            return NextResponse.json({ error: "Phone verification failed" }, { status: 401 });
        }

        const existing = await prisma.user.findUnique({
            where: { phone },
            select: { id: true }
        });

        if (existing) {
            return NextResponse.json({ status: "existing" });
        }

        return NextResponse.json({ status: "needs_signup", phone });
    } catch (error) {
        console.error("Phone check error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
