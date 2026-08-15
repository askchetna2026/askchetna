import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
    getConsultationMemory,
    forgetConsultationMemory,
} from '@/lib/consultations/memory';

/**
 * What an astrologer remembers about a seeker, readable by both of them.
 *
 * Both sides deliberately. For an AI persona the memory is injected into the
 * prompt and the seeker never sees it unless they ask — which is precisely why
 * it should be showable: a system that quietly keeps notes on someone and will
 * not show them the notes is not one they can trust. For a human astrologer it
 * is the whole feature, since nothing injects anything into a person; they read
 * it before the session starts.
 *
 * Addressed by the PAIRING rather than by a consultation id, because the memory
 * outlives any one session — that is the point of it.
 */

/** Resolves who is asking and which pairing they are entitled to see. */
async function resolvePairing(req: NextRequest, viewerId: string) {
    const astrologerId = req.nextUrl.searchParams.get('astrologerId');
    const seekerId = req.nextUrl.searchParams.get('userId');

    if (!astrologerId) return null;

    const astrologer = await prisma.astrologer.findUnique({
        where: { id: astrologerId },
        select: { id: true, userId: true, displayName: true, isAI: true },
    });
    if (!astrologer) return null;

    // The astrologer asking about one of their seekers.
    if (astrologer.userId && astrologer.userId === viewerId) {
        if (!seekerId) return null;
        // Only for someone they have actually consulted — otherwise this reads
        // any seeker's notes given an id.
        const hasHistory = await prisma.consultation.findFirst({
            where: { astrologerId, userId: seekerId },
            select: { id: true },
        });
        if (!hasHistory) return null;
        return { astrologer, seekerId, viewerIs: 'astrologer' as const };
    }

    // The seeker asking about their own memory with an astrologer.
    return { astrologer, seekerId: viewerId, viewerIs: 'seeker' as const };
}

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pairing = await resolvePairing(req, session.user.id);
    if (!pairing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const memory = await getConsultationMemory(pairing.seekerId, pairing.astrologer.id);

    return NextResponse.json({
        astrologer: {
            id: pairing.astrologer.id,
            displayName: pairing.astrologer.displayName,
            isAI: pairing.astrologer.isAI,
        },
        viewerIs: pairing.viewerIs,
        memory: memory
            ? {
                  summary: memory.summary,
                  sessionCount: memory.sessionCount,
                  lastSessionAt: memory.lastSessionAt,
              }
            : null,
    });
}

/**
 * Forget this pairing.
 *
 * The SEEKER's control only. An astrologer deleting what they were told is not
 * a privacy feature, and for a human one it would let them erase the record of
 * a conversation someone may later want to raise.
 */
export async function DELETE(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const astrologerId = req.nextUrl.searchParams.get('astrologerId');
    if (!astrologerId) {
        return NextResponse.json({ error: 'astrologerId is required' }, { status: 400 });
    }

    await forgetConsultationMemory(session.user.id, astrologerId);
    return NextResponse.json({ forgotten: true });
}
