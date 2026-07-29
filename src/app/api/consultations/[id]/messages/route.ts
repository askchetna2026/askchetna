import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { remainingSeconds, LIVE_STATUSES, endConsultation } from '@/lib/consultations/session';

const MAX_BODY = 4000;

/** Participants and the live/expired state of a session, in one read. */
async function loadParticipation(consultationId: string, userId: string) {
    const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        select: {
            id: true,
            userId: true,
            status: true,
            deadlineAt: true,
            astrologer: { select: { userId: true } },
        },
    });
    if (!consultation) return null;

    const isParticipant =
        consultation.userId === userId || consultation.astrologer.userId === userId;
    if (!isParticipant) return null;

    return {
        consultation,
        isLive: (LIVE_STATUSES as readonly string[]).includes(consultation.status),
        expired: remainingSeconds(consultation.deadlineAt) <= 0,
    };
}

/** Transcript, oldest first. */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const found = await loadParticipation(id, session.user.id);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Incremental polling: only what arrived after the last message the client
    // has, so a long transcript is not re-sent every couple of seconds.
    const since = new URL(request.url).searchParams.get('since');
    const sinceDate = since ? new Date(since) : null;

    const messages = await prisma.consultationMessage.findMany({
        where: {
            consultationId: id,
            ...(sinceDate && !Number.isNaN(sinceDate.getTime())
                ? { sentAt: { gt: sinceDate } }
                : {}),
        },
        orderBy: { sentAt: 'asc' },
        take: 500,
        select: { id: true, senderId: true, body: true, sentAt: true },
    });

    return NextResponse.json({
        messages: messages.map((m) => ({
            id: m.id,
            body: m.body,
            sentAt: m.sentAt.toISOString(),
            mine: m.senderId === session.user!.id,
        })),
        status: found.consultation.status,
        expired: found.isLive && found.expired,
    });
}

/**
 * Sends a message.
 *
 * Refused once the paid block has run out, even if the row still says ACTIVE —
 * the sweeper may not have run yet, and the deadline is what actually governs.
 * Without this a user could keep chatting indefinitely in the window between
 * expiry and the sweep.
 *
 * When it finds an expired session it closes it there and then rather than
 * leaving it for the cron, so the astrologer is freed immediately.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const found = await loadParticipation(id, session.user.id);
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!found.isLive) {
        return NextResponse.json(
            { error: 'Consultation has ended', status: found.consultation.status },
            { status: 409 }
        );
    }

    if (found.expired) {
        await endConsultation(id, 'ENDED_NO_EXTENSION');
        return NextResponse.json(
            {
                error: 'Time is up',
                message: 'This consultation has ended. Extend next time to keep talking.',
                expired: true,
            },
            { status: 409 }
        );
    }

    let body: { body?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const text = (body.body ?? '').trim();
    if (!text) {
        return NextResponse.json({ error: 'Message is empty' }, { status: 400 });
    }
    if (text.length > MAX_BODY) {
        return NextResponse.json(
            { error: `Message is too long (max ${MAX_BODY} characters)` },
            { status: 400 }
        );
    }

    const message = await prisma.consultationMessage.create({
        data: { consultationId: id, senderId: session.user.id, body: text },
        select: { id: true, sentAt: true },
    });

    return NextResponse.json({
        id: message.id,
        sentAt: message.sentAt.toISOString(),
    });
}
