import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { remainingSeconds, LIVE_STATUSES } from '@/lib/consultations/session';
import { getSettings } from '@/lib/consultations/settings';
import { getBalance } from '@/lib/consultations/credits';

/**
 * Current state of a session.
 *
 * The client polls this to drive the visible countdown and to know when to raise
 * the extension prompt. It deliberately returns `remainingSeconds` computed from
 * server time rather than leaving the client to subtract from `deadlineAt`
 * itself: device clocks drift, and a phone that is two minutes fast would show a
 * timer that disagrees with when the session actually closes.
 *
 * `expired` is authoritative too. A client that keeps polling past the deadline
 * is told the session is over even before the sweeper has written the row.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const consultation = await prisma.consultation.findUnique({
        where: { id },
        select: {
            id: true,
            userId: true,
            astrologerId: true,
            kind: true,
            status: true,
            startedAt: true,
            endedAt: true,
            deadlineAt: true,
            creditsCharged: true,
            blocksCharged: true,
            secondsPerBlock: true,
            astrologer: { select: { userId: true, displayName: true, photoUrl: true } },
        },
    });

    if (!consultation) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Either party may read it, nobody else.
    const isParticipant =
        consultation.userId === session.user.id ||
        consultation.astrologer.userId === session.user.id;
    if (!isParticipant) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const settings = await getSettings();
    const remaining = remainingSeconds(consultation.deadlineAt);
    const isLive = (LIVE_STATUSES as readonly string[]).includes(consultation.status);

    // Only the user paying can extend, so only they are prompted.
    const isUser = consultation.userId === session.user.id;
    const balance = isUser ? await getBalance(prisma, session.user.id) : 0;

    return NextResponse.json({
        id: consultation.id,
        kind: consultation.kind,
        status: consultation.status,
        astrologer: {
            displayName: consultation.astrologer.displayName,
            photoUrl: consultation.astrologer.photoUrl,
        },
        startedAt: consultation.startedAt?.toISOString() ?? null,
        endedAt: consultation.endedAt?.toISOString() ?? null,
        deadlineAt: consultation.deadlineAt?.toISOString() ?? null,
        remainingSeconds: Math.max(0, remaining),
        expired: isLive && remaining <= 0,
        creditsCharged: consultation.creditsCharged,
        blocksCharged: consultation.blocksCharged,
        secondsPerBlock: consultation.secondsPerBlock,
        // Drives the prompt. Both conditions matter: offering an extension the
        // user cannot afford is worse than not offering one.
        canExtend: isUser && isLive && remaining > 0 && balance >= 1,
        shouldPromptExtend:
            isUser &&
            isLive &&
            remaining > 0 &&
            remaining <= settings.EXTEND_PROMPT_AT_SECONDS,
        creditBalance: isUser ? balance : undefined,
    });
}
