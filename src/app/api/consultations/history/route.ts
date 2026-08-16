import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/**
 * Earlier conversations with one astrologer — the real transcripts.
 *
 * The rolling summary exists so the MODEL can carry context cheaply without
 * re-reading every prior session on every turn. It was never meant to be what a
 * person reads back: nobody wants a paraphrase of their own words when the
 * words themselves are sitting in the database.
 *
 * And they are. Ending a session only sets its status; ConsultationMessage rows
 * are kept, so the history has been there all along with nothing to read it.
 *
 * Returns sessions with their full message list. Capped rather than paged
 * because a seeker with more than twenty past sessions with one astrologer is
 * not a situation this product has yet, and a paging UI nobody needs is worse
 * than the cap.
 */
const MAX_SESSIONS = 20;
const MAX_MESSAGES_PER_SESSION = 200;

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const astrologerId = req.nextUrl.searchParams.get('astrologerId');
    if (!astrologerId) {
        return NextResponse.json({ error: 'astrologerId is required' }, { status: 400 });
    }

    // Which pairing is being asked about, and is the caller entitled to it?
    const astrologer = await prisma.astrologer.findUnique({
        where: { id: astrologerId },
        select: { id: true, userId: true, displayName: true },
    });
    if (!astrologer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const askedSeekerId = req.nextUrl.searchParams.get('userId');
    const viewerIsAstrologer = !!astrologer.userId && astrologer.userId === session.user.id;

    // An astrologer may read their own conversations with a named seeker; a
    // seeker only ever their own. Anything else is someone reading a private
    // conversation they were not part of.
    const seekerId = viewerIsAstrologer ? askedSeekerId : session.user.id;
    if (!seekerId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const consultations = await prisma.consultation.findMany({
        where: {
            astrologerId,
            userId: seekerId,
            // Only sessions that actually happened. A REQUESTED row that never
            // opened has nothing in it and reads as an empty entry in a list of
            // conversations.
            messages: { some: {} },
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_SESSIONS,
        select: {
            id: true,
            status: true,
            startedAt: true,
            endedAt: true,
            createdAt: true,
            creditsCharged: true,
            messages: {
                orderBy: { sentAt: 'asc' },
                take: MAX_MESSAGES_PER_SESSION,
                select: { id: true, senderId: true, body: true, sentAt: true },
            },
        },
    });

    return NextResponse.json({
        astrologer: { id: astrologer.id, displayName: astrologer.displayName },
        sessions: consultations.map((c) => ({
            id: c.id,
            // startedAt is null for a session whose clock never started, so the
            // creation time is the honest fallback for "when was this".
            at: (c.startedAt ?? c.createdAt).toISOString(),
            endedAt: c.endedAt?.toISOString() ?? null,
            live: ['REQUESTED', 'ACTIVE'].includes(c.status),
            creditsCharged: c.creditsCharged,
            messages: c.messages.map((m) => ({
                id: m.id,
                body: m.body,
                sentAt: m.sentAt.toISOString(),
                // "mine" from the SEEKER's point of view, matching the chat.
                mine: m.senderId === seekerId,
            })),
        })),
    });
}
