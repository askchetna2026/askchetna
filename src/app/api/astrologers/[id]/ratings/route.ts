import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * An astrologer's ratings, for their profile.
 *
 * Public and unauthenticated on purpose: this is what someone reads while
 * deciding whether to book, which is before they have any relationship with
 * the astrologer to authenticate against.
 *
 * Nothing identifying comes back with a review. A seeker wrote it about a
 * private consultation, and attaching their name to it on a public page is not
 * something they agreed to by rating a session.
 */
const MAX_FEEDBACK = 20;

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const astrologer = await prisma.astrologer.findUnique({
        where: { id },
        select: { id: true, status: true },
    });
    // Same 404 for missing and unapproved: whether an unapproved astrologer
    // exists is not a public fact.
    if (!astrologer || astrologer.status !== 'APPROVED') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [aggregate, distribution, recent] = await Promise.all([
        prisma.consultationRating.aggregate({
            where: { astrologerId: id },
            _avg: { stars: true },
            _count: { _all: true },
        }),
        prisma.consultationRating.groupBy({
            by: ['stars'],
            where: { astrologerId: id },
            _count: { _all: true },
        }),
        prisma.consultationRating.findMany({
            where: { astrologerId: id, feedback: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: MAX_FEEDBACK,
            // No userId, no consultationId — see the note above.
            select: { id: true, stars: true, feedback: true, createdAt: true },
        }),
    ]);

    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distribution) counts[row.stars] = row._count._all;

    return NextResponse.json({
        // Rounded to one place. A rating carrying six decimals implies a
        // precision that twelve opinions do not have.
        average: aggregate._avg.stars ? Number(aggregate._avg.stars.toFixed(1)) : null,
        count: aggregate._count._all,
        distribution: counts,
        feedback: recent.map((r) => ({
            id: r.id,
            stars: r.stars,
            feedback: r.feedback,
            at: r.createdAt.toISOString(),
        })),
    });
}
