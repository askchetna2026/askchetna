import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rateLimit';
import {
    cancelAccountDeletion,
    getDeletionStatus,
    requestAccountDeletion,
} from '@/lib/accountDeletion';

/**
 * Account deletion, required in-app by App Store guideline 5.1.1(v) and Google
 * Play's data deletion policy.
 *
 *   GET    -> current status (drives the settings UI and PendingDeletionGate)
 *   DELETE -> schedule deletion after the grace period
 *   POST   -> cancel a pending deletion
 *
 * Reauthentication: password users must confirm their password. Google and
 * phone-OTP users cannot (they have no password), so for them possession of a
 * live session is the confirmation — matching how those accounts authenticate in
 * the first place. The destructive action is still reversible for
 * DELETION_GRACE_DAYS, which is what makes that acceptable.
 */

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getDeletionStatus(session.user.id);
    if (!status) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(status);
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const limit = rateLimit(`delete-account:${getClientIp(req)}`, { limit: 10, windowMs: 60 * 60 * 1000 });
        if (!limit.allowed) {
            return NextResponse.json(
                { error: 'Too many attempts. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
            );
        }

        // Body is optional: only password accounts send one.
        let password: string | undefined;
        try {
            const body = await req.json();
            password = typeof body?.password === 'string' ? body.password : undefined;
        } catch { /* no body sent */ }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { id: true, password: true },
        });

        if (!user) {
            return NextResponse.json({ error: 'Account not found' }, { status: 404 });
        }

        // Password accounts must reauthenticate, so a borrowed unlocked device
        // can't wipe someone's account.
        if (user.password) {
            if (!password) {
                return NextResponse.json(
                    { error: 'Please confirm your password to delete your account.', code: 'PASSWORD_REQUIRED' },
                    { status: 400 }
                );
            }

            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                return NextResponse.json(
                    { error: 'That password is not correct.', code: 'PASSWORD_INVALID' },
                    { status: 403 }
                );
            }
        }

        const status = await requestAccountDeletion(user.id);

        return NextResponse.json({
            success: true,
            ...status,
            // The client signs out immediately after this; the account is then
            // locked to the cancellation screen until purge.
            message: `Your account is scheduled for permanent deletion. You can still cancel by signing in before then.`,
        });
    } catch (error) {
        console.error('Account deletion request error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const cancelled = await cancelAccountDeletion(session.user.id);
        if (!cancelled) {
            return NextResponse.json(
                { error: 'No pending deletion to cancel.' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, pending: false });
    } catch (error) {
        console.error('Account deletion cancellation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
