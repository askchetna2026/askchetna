import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/apiAuth';
import { LIVE_STATUSES } from '@/lib/consultations/session';

/**
 * The seeker's rating of one consultation.
 *
 * Tied to a session, which is what makes it worth anything: only the person who
 * had the conversation can rate it, and only once. The unique constraint on
 * consultationId is the guard rather than a read-then-write check, so a double
 * tap updates instead of creating a second row.
 */

/* Not exported: a route module may only export handlers, and anything else
   fails the build with a type error about an index signature. */
const MAX_FEEDBACK_WORDS = 50;

/** Words, as a reader counts them. */
function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // requireUser, not auth(): this inserts a row with a userId foreign key.
    const authed = await requireUser();
    if (!authed.ok) return authed.response;

    const { id } = await params;

    const consultation = await prisma.consultation.findUnique({
        where: { id },
        select: { id: true, userId: true, astrologerId: true, status: true },
    });
    if (!consultation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Only the seeker rates, and only their own session. An astrologer rating
    // their own consultation is the obvious way to inflate a score.
    if (consultation.userId !== authed.userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Rating a conversation still in progress is rating something that has not
    // happened yet.
    if ((LIVE_STATUSES as readonly string[]).includes(consultation.status)) {
        return NextResponse.json(
            { error: 'This consultation has not ended yet' },
            { status: 409 }
        );
    }

    let body: { stars?: unknown; feedback?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const stars = Number(body.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        return NextResponse.json({ error: 'Rating must be 1 to 5' }, { status: 400 });
    }

    const rawFeedback = typeof body.feedback === 'string' ? body.feedback.trim() : '';
    if (countWords(rawFeedback) > MAX_FEEDBACK_WORDS) {
        return NextResponse.json(
            { error: `Feedback is limited to ${MAX_FEEDBACK_WORDS} words` },
            { status: 400 }
        );
    }

    const rating = await prisma.consultationRating.upsert({
        where: { consultationId: id },
        create: {
            consultationId: id,
            userId: authed.userId,
            astrologerId: consultation.astrologerId,
            stars,
            feedback: rawFeedback || null,
        },
        update: { stars, feedback: rawFeedback || null },
        select: { stars: true, feedback: true, createdAt: true },
    });

    return NextResponse.json({ rating });
}

/** What this seeker already said, so the form can show it rather than ask twice. */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const authed = await requireUser();
    if (!authed.ok) return authed.response;

    const { id } = await params;
    const rating = await prisma.consultationRating.findFirst({
        where: { consultationId: id, userId: authed.userId },
        select: { stars: true, feedback: true, createdAt: true },
    });

    return NextResponse.json({ rating: rating ?? null });
}
