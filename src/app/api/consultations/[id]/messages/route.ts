import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { remainingSeconds, LIVE_STATUSES, endConsultation } from '@/lib/consultations/session';

const MAX_BODY = 4000;

// Generating a reply is a model round trip. The default would cut it off on a
// slow completion and leave the seeker's paid block with nothing in it.
export const maxDuration = 60;

/** Participants and the live/expired state of a session, in one read. */
async function loadParticipation(consultationId: string, userId: string) {
    const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        select: {
            id: true,
            userId: true,
            status: true,
            deadlineAt: true,
            astrologer: {
                select: {
                    id: true,
                    userId: true,
                    isAI: true,
                    aiSystemPrompt: true,
                    displayName: true,
                },
            },
        },
    });
    if (!consultation) return null;

    // astrologer.userId is null for an AI persona, and a null never matches a
    // signed-in id — so only the seeker is ever a participant in those.
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

    const { astrologer } = found.consultation;

    // A human astrologer answers from their own dashboard; nothing more to do.
    if (!astrologer.isAI) {
        return NextResponse.json({
            id: message.id,
            sentAt: message.sentAt.toISOString(),
        });
    }

    // ---- AI persona: generate and store the reply in the same request ----
    //
    // Stored under the astrologer's id as senderId, which is what makes GET
    // report it as not-mine and render it on the astrologer's side. There is no
    // user id to use, which is the whole reason userId is nullable.
    let reply: { id: string; body: string; sentAt: string } | null = null;
    try {
        const { generateConsultationReply } = await import('@/lib/ai/geminiService');

        const history = await prisma.consultationMessage.findMany({
            where: { consultationId: id, id: { not: message.id } },
            orderBy: { sentAt: 'desc' },
            take: 20,
            select: { senderId: true, body: true },
        });

        const generated = await generateConsultationReply({
            persona:
                astrologer.aiSystemPrompt?.trim() ||
                `You are ${astrologer.displayName}, an astrologer on AskChetna.`,
            history: history
                .reverse()
                .map((m) => ({
                    role: m.senderId === astrologer.id ? ('astrologer' as const) : ('seeker' as const),
                    body: m.body,
                })),
            message: text,
        });

        const stored = await prisma.consultationMessage.create({
            data: {
                consultationId: id,
                senderId: astrologer.id,
                body: generated.slice(0, MAX_BODY),
            },
            select: { id: true, body: true, sentAt: true },
        });
        reply = {
            id: stored.id,
            body: stored.body,
            sentAt: stored.sentAt.toISOString(),
        };
    } catch (error) {
        // The seeker's message is already saved and their block is already paid
        // for, so a model failure must not 500 the send. Surfacing it as a
        // message keeps the session usable and tells them to try again, rather
        // than leaving them staring at silence.
        console.error('[consultation] AI reply failed:', error);
        const stored = await prisma.consultationMessage.create({
            data: {
                consultationId: id,
                senderId: astrologer.id,
                body: 'I could not compose a reply just then. Please send that again.',
            },
            select: { id: true, body: true, sentAt: true },
        });
        reply = {
            id: stored.id,
            body: stored.body,
            sentAt: stored.sentAt.toISOString(),
        };
    }

    return NextResponse.json({
        id: message.id,
        sentAt: message.sentAt.toISOString(),
        reply,
    });
}
