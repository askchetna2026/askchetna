import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { getRequestLocation, recordAnalyticsEvent } from "@/lib/analytics/server";
import { sendWelcomeLifecycleEmail } from "@/lib/lifecycleEmails";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { isFirebaseConfigured, verifyPhoneIdToken } from "@/lib/firebaseAdmin";

/**
 * Step 2 of phone sign-in: create an account for a freshly verified number.
 *
 * Mirrors /api/auth/register (analytics, newsletter sync, welcome email) but the
 * identity proof is a Firebase phone token instead of a password. `password`
 * stays null, exactly as it does for Google users.
 *
 * We still collect an email because it remains the required identity on User —
 * reports, lifecycle mail and the newsletter all assume a deliverable address.
 */
export async function POST(req: NextRequest) {
    try {
        const limit = rateLimit(`phone-register:${getClientIp(req)}`, { limit: 10, windowMs: 60 * 60 * 1000 });
        if (!limit.allowed) {
            return NextResponse.json(
                { error: "Too many sign-up attempts. Please try again later." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
            );
        }

        // See the same guard in ../check/route.ts — a config error must not
        // masquerade as "your code was wrong".
        if (!isFirebaseConfigured()) {
            console.error("Phone register called but Firebase Admin is not configured.");
            return NextResponse.json(
                { error: "Phone sign-in is temporarily unavailable." },
                { status: 503 }
            );
        }

        const { idToken, email: rawEmail, name, isSubscribed, visitorId } = await req.json();

        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
        const subscribed = !!isSubscribed;
        const normalizedVisitorId = typeof visitorId === 'string' ? visitorId : null;

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        let phone: string;
        try {
            ({ phone } = await verifyPhoneIdToken(String(idToken ?? "")));
        } catch (error) {
            console.warn("Phone register rejected:", error instanceof Error ? error.message : error);
            return NextResponse.json({ error: "Phone verification failed" }, { status: 401 });
        }

        // Idempotency: if the number already has an account (e.g. the client
        // retried, or two devices raced), just tell the client to sign in.
        const existingByPhone = await prisma.user.findUnique({
            where: { phone },
            select: { id: true }
        });
        if (existingByPhone) {
            return NextResponse.json({ status: "existing" });
        }

        // SECURITY: never attach a verified phone to an account found only by a
        // self-asserted email. Owning +91… proves nothing about owning
        // someone@example.com, so auto-linking here would be account takeover by
        // email claim. Make them authenticate as that account first, then link
        // the phone from settings.
        const existingByEmail = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { id: true }
        });
        if (existingByEmail) {
            return NextResponse.json(
                {
                    error: "An account already uses this email. Please sign in with email or Google, then add your phone number from account settings.",
                    code: "EMAIL_TAKEN"
                },
                { status: 409 }
            );
        }

        const existingLead = await prisma.newsletterSubscriber.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { id: true }
        });

        let user;
        try {
            user = await prisma.user.create({
                data: {
                    email,
                    phone,
                    phoneVerifiedAt: new Date(),
                    name: typeof name === 'string' && name.trim() ? name.trim() : null,
                    // No password: this account authenticates by OTP (and can add
                    // Google/email later), same as an OAuth-only user.
                    password: null,
                    isSubscribed: subscribed
                }
            });
        } catch (error) {
            // Lost a race on the phone or email unique index between the checks
            // above and this insert.
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                const target = String(error.meta?.target ?? '');
                if (target.includes('phone')) {
                    return NextResponse.json({ status: "existing" });
                }
                return NextResponse.json(
                    { error: "An account already uses this email.", code: "EMAIL_TAKEN" },
                    { status: 409 }
                );
            }
            throw error;
        }

        if (existingLead) {
            await prisma.newsletterSubscriber.update({
                where: { id: existingLead.id },
                data: {
                    email,
                    isSubscribed: subscribed,
                    unsubscribedAt: subscribed ? null : new Date()
                }
            });
        }

        const location = getRequestLocation(req.headers);

        await recordAnalyticsEvent({
            type: ANALYTICS_EVENTS.SIGNUP_COMPLETED,
            path: '/login',
            userId: user.id,
            visitorId: normalizedVisitorId,
            country: location.country,
            city: location.city,
            metadata: {
                method: 'phone',
                subscribed,
            },
        });

        if (subscribed) {
            await recordAnalyticsEvent({
                type: ANALYTICS_EVENTS.NEWSLETTER_SUBSCRIBED,
                path: '/login',
                userId: user.id,
                visitorId: normalizedVisitorId,
                country: location.country,
                city: location.city,
                metadata: {
                    source: 'phone_register',
                    subscribed: true,
                },
            });
        }

        void sendWelcomeLifecycleEmail(user.id).catch((emailError) => {
            console.error('Welcome lifecycle email failed:', emailError);
        });

        return NextResponse.json({ status: "created" });
    } catch (error) {
        console.error("Phone registration error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
