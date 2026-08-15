import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requireUser } from '@/lib/apiAuth';
import prisma from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

/**
 * Register (or refresh) this device's push token for the signed-in user.
 *
 * Called by src/lib/native/push.ts after the OS grants notification permission,
 * and again on every sign-in and app resume — FCM rotates tokens, and a stale
 * one means silent delivery failure.
 *
 * Upserts on `token` and reassigns userId. That matters when a device changes
 * hands: without the reassignment the old owner would keep receiving this
 * device's notifications.
 */
export async function POST(req: NextRequest) {
    try {
        // requireUser, not auth(): this handler inserts a row with a userId
        // foreign key, and a JWT can outlive the user it names. Without the
        // existence check that surfaces as "Foreign key constraint violated"
        // — a 500 whose message says nothing about the one fix, signing in
        // again. See src/lib/apiAuth.ts.
        const authed = await requireUser();
        if (!authed.ok) return authed.response;
        const session = { user: { id: authed.userId } };

        const limit = rateLimit(`push-register:${getClientIp(req)}`, { limit: 60, windowMs: 60 * 60 * 1000 });
        if (!limit.allowed) {
            return NextResponse.json(
                { error: 'Too many registration attempts.' },
                { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
            );
        }

        const { token, platform, appVersion, deviceModel } = await req.json();

        if (typeof token !== 'string' || token.length < 20) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }
        if (platform !== 'ios' && platform !== 'android') {
            return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
        }

        const now = new Date();

        await prisma.deviceToken.upsert({
            where: { token },
            create: {
                token,
                platform,
                userId: session.user.id,
                appVersion: typeof appVersion === 'string' ? appVersion.slice(0, 32) : null,
                deviceModel: typeof deviceModel === 'string' ? deviceModel.slice(0, 128) : null,
                lastSeenAt: now,
            },
            update: {
                // Reassign: this install now belongs to whoever is signed in.
                userId: session.user.id,
                platform,
                appVersion: typeof appVersion === 'string' ? appVersion.slice(0, 32) : undefined,
                deviceModel: typeof deviceModel === 'string' ? deviceModel.slice(0, 128) : undefined,
                lastSeenAt: now,
                // Re-registering is an explicit opt back in.
                disabledAt: null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Push token registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
