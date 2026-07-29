import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { endConsultation } from '@/lib/consultations/session';

/**
 * Ends a session.
 *
 * Either participant may hang up, and the reason recorded reflects which one
 * did — that distinction matters when reviewing a dispute about a session that
 * ended early.
 *
 * Idempotent by way of endConsultation, so a client retrying after a dropped
 * response cannot settle the astrologer's earning twice.
 */
export async function POST(
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
        select: { userId: true, astrologer: { select: { userId: true } } },
    });

    if (!consultation) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const endedByUser = consultation.userId === session.user.id;
    const endedByAstrologer = consultation.astrologer.userId === session.user.id;

    if (!endedByUser && !endedByAstrologer) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const result = await endConsultation(
        id,
        endedByUser ? 'ENDED_BY_USER' : 'ENDED_BY_ASTROLOGER'
    );

    return NextResponse.json({
        ended: result.ended,
        creditsCharged: result.creditsCharged,
    });
}
