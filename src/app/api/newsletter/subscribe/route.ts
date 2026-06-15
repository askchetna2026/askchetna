
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { getRequestLocation, recordAnalyticsEvent } from '@/lib/analytics/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
    try {
        const limit = rateLimit(`newsletter:${getClientIp(req)}`, { limit: 5, windowMs: 60 * 60 * 1000 });
        if (!limit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
            );
        }

        const {
            email: rawEmail,
            source: rawSource,
            pagePath: rawPagePath,
        } = await req.json();
        const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
        const source =
            typeof rawSource === 'string' && rawSource.trim()
                ? rawSource.trim().slice(0, 80)
                : 'newsletter_form';
        const pagePath =
            typeof rawPagePath === 'string' && rawPagePath.startsWith('/')
                ? rawPagePath.slice(0, 200)
                : null;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        if (!EMAIL_RE.test(email)) {
            return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
        }

        const location = getRequestLocation(req.headers);

        const existingUser = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            },
            select: { id: true }
        });

        if (existingUser) {
            await prisma.user.update({
                where: { id: existingUser.id },
                data: { isSubscribed: true }
            });

            await recordAnalyticsEvent({
                type: ANALYTICS_EVENTS.NEWSLETTER_SUBSCRIBED,
                path: '/api/newsletter/subscribe',
                userId: existingUser.id,
                country: location.country,
                city: location.city,
                metadata: {
                    source,
                    pagePath,
                }
            });

            return NextResponse.json({ success: true });
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

        if (existingLead) {
            await prisma.newsletterSubscriber.update({
                where: { id: existingLead.id },
                data: {
                    email,
                    isSubscribed: true,
                    subscribedAt: new Date(),
                    unsubscribedAt: null
                }
            });
        } else {
            await prisma.newsletterSubscriber.create({
                data: {
                    email,
                    isSubscribed: true
                }
            });
        }

        await recordAnalyticsEvent({
            type: ANALYTICS_EVENTS.NEWSLETTER_SUBSCRIBED,
            path: '/api/newsletter/subscribe',
            country: location.country,
            city: location.city,
            metadata: {
                source,
                pagePath,
                emailDomain: email.split('@')[1] || null,
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Newsletter Subscribe Error:', error);
        return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }
}
