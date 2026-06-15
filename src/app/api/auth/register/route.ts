import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { getRequestLocation, recordAnalyticsEvent } from "@/lib/analytics/server";
import { sendWelcomeLifecycleEmail } from "@/lib/lifecycleEmails";

export async function POST(req: Request) {
    try {
        const { email: rawEmail, password, name, isSubscribed, visitorId } = await req.json();
        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
        const subscribed = !!isSubscribed;
        const normalizedVisitorId = typeof visitorId === 'string' ? visitorId : null;

        if (!email || !password) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        const exists = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            }
        });

        if (exists) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        const existingLead = await prisma.newsletterSubscriber.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            },
            select: { id: true }
        });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                name: typeof name === 'string' ? name.trim() : null,
                password: hashedPassword,
                isSubscribed: subscribed
            }
        });

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
                method: 'email',
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
                    source: 'register',
                    subscribed: true,
                },
            });
        }

        void sendWelcomeLifecycleEmail(user.id).catch((emailError) => {
            console.error('Welcome lifecycle email failed:', emailError);
        });

        return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
