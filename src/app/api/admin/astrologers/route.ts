import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import prisma from '@/lib/prisma';

/**
 * Astrologer list for the admin review queue.
 *
 * Defaults to PENDING because that is the queue with work in it — an admin
 * opening this screen is almost always here to approve somebody, and making
 * them filter first would be busywork.
 *
 * Earnings are aggregated per astrologer in one grouped query rather than a
 * count per row: the list is small today, but a per-row query is the kind of
 * N+1 that is invisible until it is not.
 */
export async function GET(request: Request) {
    if (!(await checkAdminAccess())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = new URL(request.url).searchParams.get('status') ?? 'PENDING';
    const where = status === 'ALL' ? {} : { status };

    const astrologers = await prisma.astrologer.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 200,
        select: {
            id: true,
            displayName: true,
            bio: true,
            status: true,
            languages: true,
            specialities: true,
            revenueSharePct: true,
            creditsPerBlock: true,
            isAI: true,
            aiSystemPrompt: true,
            isAvailable: true,
            createdAt: true,
            approvedAt: true,
            approvedBy: true,
            rejectionReason: true,
            // Null for an AI persona, which has no account behind it.
            user: { select: { email: true, phone: true } },
        },
    });

    const ids = astrologers.map((a) => a.id);
    const earnings = ids.length
        ? await prisma.astrologerEarning.groupBy({
              by: ['astrologerId'],
              where: { astrologerId: { in: ids } },
              _sum: { creditsServed: true, amountPaise: true },
          })
        : [];

    const unpaid = ids.length
        ? await prisma.astrologerEarning.groupBy({
              by: ['astrologerId'],
              where: { astrologerId: { in: ids }, payoutId: null },
              _sum: { amountPaise: true },
          })
        : [];

    const earned = new Map(earnings.map((e) => [e.astrologerId, e._sum]));
    const owing = new Map(unpaid.map((e) => [e.astrologerId, e._sum.amountPaise ?? 0]));

    const counts = await prisma.astrologer.groupBy({
        by: ['status'],
        _count: true,
    });

    return NextResponse.json({
        astrologers: astrologers.map((a) => ({
            ...a,
            createdAt: a.createdAt.toISOString(),
            approvedAt: a.approvedAt?.toISOString() ?? null,
            creditsServed: earned.get(a.id)?.creditsServed ?? 0,
            earnedPaise: earned.get(a.id)?.amountPaise ?? 0,
            unpaidPaise: owing.get(a.id) ?? 0,
        })),
        counts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
    });
}
