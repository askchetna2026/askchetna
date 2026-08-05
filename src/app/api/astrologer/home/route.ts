import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getSettings } from '@/lib/consultations/settings';
import { remainingSeconds, LIVE_STATUSES } from '@/lib/consultations/session';
import { zonedParts, zonedToUtc } from '@/lib/appointments';

/**
 * Everything the astrologer's home page shows, in ONE request.
 *
 * The old dashboard fetched `/sessions` and `/earnings` separately and still
 * had no appointment data; this page needs six things at once and polls while
 * it sits open. Six endpoints on a 30s timer is 720 function calls an hour from
 * a single tab, which is the mistake the presence heartbeat was removed for.
 * One aggregate read, one poll.
 *
 * Scoped to the caller's own astrologer record. There is no id parameter, on
 * purpose — cross-astrologer visibility lives in the admin routes.
 */

/**
 * "Today" is a wall-clock question and the answer has to match the astrologer's
 * own day, not UTC's. Every human astrologer on the platform is in India; when
 * that stops being true this should come from their availability windows, which
 * already carry a timezone.
 */
const HOME_ZONE = 'Asia/Kolkata';

/** First name only. An astrologer needs to greet someone, not to be handed
 *  their contact details. */
const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || 'Seeker';

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const astrologer = await prisma.astrologer.findUnique({
        where: { userId },
        select: {
            id: true,
            displayName: true,
            photoUrl: true,
            languages: true,
            specialities: true,
            status: true,
            isAvailable: true,
            lastSeenAt: true,
            creditsPerBlock: true,
        },
    });

    if (!astrologer) {
        return NextResponse.json({ error: 'Not an astrologer' }, { status: 404 });
    }

    const profile = {
        displayName: astrologer.displayName,
        photoUrl: astrologer.photoUrl,
        languages: astrologer.languages,
        specialities: astrologer.specialities,
        status: astrologer.status,
        isAvailable: astrologer.isAvailable,
        lastSeenAt: astrologer.lastSeenAt?.toISOString() ?? null,
        creditsPerBlock: astrologer.creditsPerBlock ?? 1,
    };

    // A pending or suspended profile has no work to show. Returning early also
    // keeps six queries off the wire for someone who cannot act on any of them.
    if (astrologer.status !== 'APPROVED') {
        return NextResponse.json({ astrologer: profile });
    }

    const now = new Date();
    const { year, month, day } = zonedParts(now, HOME_ZONE);
    const dayStart = zonedToUtc(year, month, day, 0, HOME_ZONE);

    const [settings, liveRows, requests, upcoming, today, unpaid, lastPayout, hours] =
        await Promise.all([
            getSettings(),
            prisma.consultation.findMany({
                where: { astrologerId: astrologer.id, status: { in: [...LIVE_STATUSES] } },
                orderBy: { startedAt: 'asc' },
                select: {
                    id: true,
                    kind: true,
                    startedAt: true,
                    deadlineAt: true,
                    secondsPerBlock: true,
                    creditsCharged: true,
                    user: { select: { name: true, image: true } },
                },
            }),
            prisma.appointment.findMany({
                where: {
                    astrologerId: astrologer.id,
                    status: 'REQUESTED',
                    startAt: { gte: now },
                },
                orderBy: { startAt: 'asc' },
                take: 20,
                select: {
                    id: true,
                    ref: true,
                    startAt: true,
                    blocks: true,
                    user: { select: { name: true, image: true } },
                },
            }),
            // COUNTERED sits here rather than with the requests: the ball is in
            // the seeker's court, so it is something to expect, not to answer.
            prisma.appointment.findMany({
                where: {
                    astrologerId: astrologer.id,
                    status: { in: ['CONFIRMED', 'COUNTERED'] },
                    startAt: { gte: now },
                },
                orderBy: { startAt: 'asc' },
                take: 10,
                select: {
                    id: true,
                    ref: true,
                    startAt: true,
                    counterAt: true,
                    blocks: true,
                    status: true,
                    user: { select: { name: true } },
                },
            }),
            // Sessions that have FINISHED today. A live one is not yet a tally
            // entry — its minutes and credits are still moving.
            prisma.consultation.aggregate({
                where: { astrologerId: astrologer.id, endedAt: { gte: dayStart } },
                _count: true,
                _sum: { billedSeconds: true, creditsCharged: true },
            }),
            prisma.astrologerEarning.aggregate({
                where: { astrologerId: astrologer.id, payoutId: null },
                _sum: { amountPaise: true },
            }),
            prisma.payout.findFirst({
                where: { astrologerId: astrologer.id, status: 'PAID' },
                orderBy: { paidAt: 'desc' },
                select: { amountPaise: true, paidAt: true },
            }),
            // The published weekly windows. On the page mainly so that an
            // astrologer with none is TOLD why no appointment ever arrives —
            // an empty requests list is otherwise indistinguishable from
            // nobody wanting to book.
            prisma.astrologerAvailability.findMany({
                where: { astrologerId: astrologer.id },
                orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
                select: { dayOfWeek: true, startMinute: true, endMinute: true, timezone: true },
            }),
        ]);

    // Who has arrived and not been answered yet.
    //
    // There is no queue in the data model — a seeker who starts a session is
    // ACTIVE and billing immediately, and several can be open at once. So
    // "waiting" is not a state to look up but a fact to derive: a session the
    // astrologer has not yet said anything in. That person is paying for
    // silence, which is the one thing on this page worth interrupting for.
    const liveIds = liveRows.map((c) => c.id);
    const answered = liveIds.length
        ? await prisma.consultationMessage.groupBy({
              by: ['consultationId'],
              where: { consultationId: { in: liveIds }, senderId: userId },
          })
        : [];
    const answeredIds = new Set(answered.map((r) => r.consultationId));

    const live = liveRows.map((c) => ({
        id: c.id,
        kind: c.kind,
        seeker: firstName(c.user.name),
        seekerImage: c.user.image,
        startedAt: c.startedAt?.toISOString() ?? null,
        // Server time decides, as it does on the seeker's side: a device clock
        // that disagrees would show a session as live after it has closed.
        remainingSeconds: Math.max(0, remainingSeconds(c.deadlineAt)),
        expired: remainingSeconds(c.deadlineAt) <= 0,
        blockSeconds: c.secondsPerBlock,
        creditsCharged: c.creditsCharged,
        answered: answeredIds.has(c.id),
    }));

    return NextResponse.json({
        astrologer: profile,
        blockSeconds: settings.CHAT_SECONDS_PER_CREDIT,
        inSession: live.filter((c) => c.answered),
        waiting: live.filter((c) => !c.answered),
        requests: requests.map((a) => ({
            id: a.id,
            ref: a.ref,
            startAt: a.startAt.toISOString(),
            blocks: a.blocks,
            seeker: firstName(a.user.name),
            seekerImage: a.user.image,
        })),
        upcoming: upcoming.map((a) => ({
            id: a.id,
            ref: a.ref,
            status: a.status,
            // A countered appointment happens at the time WE proposed, if it
            // happens at all. Showing the seeker's original request would put
            // the wrong hour in the diary.
            startAt: (a.counterAt ?? a.startAt).toISOString(),
            blocks: a.blocks,
            seeker: firstName(a.user.name),
        })),
        today: {
            sessions: today._count,
            minutes: Math.round((today._sum.billedSeconds ?? 0) / 60),
            credits: today._sum.creditsCharged ?? 0,
        },
        hours,
        earnings: {
            unpaidPaise: unpaid._sum.amountPaise ?? 0,
            lastPayout: lastPayout
                ? {
                      amountPaise: lastPayout.amountPaise,
                      paidAt: lastPayout.paidAt?.toISOString() ?? null,
                  }
                : null,
        },
    });
}
