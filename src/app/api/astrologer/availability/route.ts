import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/**
 * Availability toggle and presence heartbeat.
 *
 * Both live on one endpoint because they answer the same question from two
 * directions. `isAvailable` is intent — "I am open to consultations". `lastSeenAt`
 * is evidence — "the browser saying so is still running". The directory requires
 * both, because a toggle alone leaves ghosts online after a crash or a closed
 * laptop, and a seeker who spends a credit reaching an absent astrologer has been
 * charged for nothing.
 *
 * The dashboard calls this on a timer while open, which is what keeps the
 * heartbeat fresh. Going offline is therefore either explicit, or automatic
 * within the presence window once the page is gone.
 */
export async function PATCH(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const astrologer = await prisma.astrologer.findUnique({
        where: { userId: session.user.id },
        select: { id: true, status: true },
    });

    if (!astrologer) {
        return NextResponse.json({ error: 'Not an astrologer' }, { status: 404 });
    }

    // Only approved astrologers may appear. A suspended account that could flip
    // itself back online would make suspension meaningless.
    if (astrologer.status !== 'APPROVED') {
        return NextResponse.json(
            {
                error: 'Not approved',
                message: `Your profile is ${astrologer.status.toLowerCase()}. You cannot take consultations.`,
                status: astrologer.status,
            },
            { status: 403 }
        );
    }

    let body: { isAvailable?: boolean; heartbeatOnly?: boolean };
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const data: { lastSeenAt: Date; isAvailable?: boolean } = { lastSeenAt: new Date() };
    // A heartbeat refreshes presence without changing intent, so a background
    // ping can never silently put someone online who had turned themselves off.
    if (!body.heartbeatOnly && typeof body.isAvailable === 'boolean') {
        data.isAvailable = body.isAvailable;
    }

    const updated = await prisma.astrologer.update({
        where: { id: astrologer.id },
        data,
        select: { isAvailable: true, lastSeenAt: true },
    });

    return NextResponse.json({
        isAvailable: updated.isAvailable,
        lastSeenAt: updated.lastSeenAt?.toISOString() ?? null,
    });
}
