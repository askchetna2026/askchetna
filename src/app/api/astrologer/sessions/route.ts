import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { remainingSeconds, LIVE_STATUSES } from '@/lib/consultations/session';

/**
 * The astrologer's own sessions: what is live now, and what happened recently.
 *
 * The live entry is what the dashboard polls for — an astrologer sitting on this
 * screen needs to know a seeker has arrived without refreshing. Scoped to the
 * caller's own astrologer record; there is no id parameter, deliberately.
 *
 * `expired` is computed from server time rather than left to the client, for the
 * same reason it is on the seeker's side: a device clock that disagrees would
 * show a session as live after it has actually closed.
 */
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const astrologer = await prisma.astrologer.findUnique({
        where: { userId: session.user.id },
        select: { id: true, status: true, isAvailable: true, lastSeenAt: true, displayName: true },
    });

    if (!astrologer) {
        return NextResponse.json({ error: 'Not an astrologer' }, { status: 404 });
    }

    const [live, recent] = await Promise.all([
        prisma.consultation.findFirst({
            where: { astrologerId: astrologer.id, status: { in: [...LIVE_STATUSES] } },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                kind: true,
                status: true,
                startedAt: true,
                deadlineAt: true,
                creditsCharged: true,
                user: { select: { name: true } },
            },
        }),
        prisma.consultation.findMany({
            where: { astrologerId: astrologer.id, status: { notIn: [...LIVE_STATUSES] } },
            orderBy: { endedAt: 'desc' },
            take: 20,
            select: {
                id: true,
                kind: true,
                status: true,
                endedAt: true,
                billedSeconds: true,
                creditsCharged: true,
                earning: { select: { amountPaise: true } },
            },
        }),
    ]);

    return NextResponse.json({
        astrologer: {
            displayName: astrologer.displayName,
            status: astrologer.status,
            isAvailable: astrologer.isAvailable,
            lastSeenAt: astrologer.lastSeenAt?.toISOString() ?? null,
        },
        live: live
            ? {
                  id: live.id,
                  kind: live.kind,
                  // First names only. An astrologer needs to greet someone, not
                  // to be handed their contact details.
                  seeker: live.user.name?.split(' ')[0] ?? 'Seeker',
                  startedAt: live.startedAt?.toISOString() ?? null,
                  remainingSeconds: Math.max(0, remainingSeconds(live.deadlineAt)),
                  expired: remainingSeconds(live.deadlineAt) <= 0,
                  creditsCharged: live.creditsCharged,
              }
            : null,
        recent: recent.map((c) => ({
            id: c.id,
            kind: c.kind,
            status: c.status,
            endedAt: c.endedAt?.toISOString() ?? null,
            durationSeconds: c.billedSeconds,
            creditsCharged: c.creditsCharged,
            earnedPaise: c.earning?.amountPaise ?? 0,
        })),
    });
}
