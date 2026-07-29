import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/**
 * An astrologer's own earnings history.
 *
 * Answers the two questions they actually have: how much have I earned, and how
 * much of it have I been paid. Both are read from the earnings ledger and the
 * payout records rather than recomputed from consultations — recomputation
 * drifts the moment a rate changes, and a figure that moves after it has been
 * paid cannot be reconciled against a bank statement.
 *
 * Scoped to the caller's own record. There is no astrologerId parameter on
 * purpose; the admin route is where cross-astrologer visibility lives.
 */
export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const astrologer = await prisma.astrologer.findUnique({
        where: { userId: session.user.id },
        select: { id: true, displayName: true, status: true, revenueSharePct: true },
    });

    if (!astrologer) {
        return NextResponse.json(
            { error: 'Not an astrologer', message: 'You do not have an astrologer profile.' },
            { status: 404 }
        );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);

    const [lifetime, unpaid, recent, payouts] = await Promise.all([
        prisma.astrologerEarning.aggregate({
            where: { astrologerId: astrologer.id },
            _sum: { creditsServed: true, amountPaise: true },
            _count: true,
        }),
        prisma.astrologerEarning.aggregate({
            where: { astrologerId: astrologer.id, payoutId: null },
            _sum: { creditsServed: true, amountPaise: true },
        }),
        prisma.astrologerEarning.findMany({
            where: { astrologerId: astrologer.id },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                creditsServed: true,
                amountPaise: true,
                createdAt: true,
                payoutId: true,
                consultation: {
                    select: { kind: true, startedAt: true, endedAt: true, billedSeconds: true },
                },
            },
        }),
        prisma.payout.findMany({
            where: { astrologerId: astrologer.id },
            orderBy: { periodEnd: 'desc' },
            take: 24,
            select: {
                id: true,
                periodStart: true,
                periodEnd: true,
                creditsServed: true,
                amountPaise: true,
                status: true,
                paidAt: true,
                reference: true,
            },
        }),
    ]);

    const earnedPaise = lifetime._sum.amountPaise ?? 0;
    const unpaidPaise = unpaid._sum.amountPaise ?? 0;

    return NextResponse.json({
        astrologer: {
            displayName: astrologer.displayName,
            status: astrologer.status,
            revenueSharePct: astrologer.revenueSharePct,
        },
        summary: {
            sessionsServed: lifetime._count,
            creditsServed: lifetime._sum.creditsServed ?? 0,
            earnedPaise,
            // Everything settled minus everything still unclaimed by a payout.
            paidPaise: earnedPaise - unpaidPaise,
            unpaidPaise,
        },
        recent: recent.map((e) => ({
            id: e.id,
            creditsServed: e.creditsServed,
            amountPaise: e.amountPaise,
            at: e.createdAt.toISOString(),
            paid: e.payoutId !== null,
            kind: e.consultation.kind,
            durationSeconds: e.consultation.billedSeconds,
        })),
        payouts: payouts.map((p) => ({
            id: p.id,
            periodStart: p.periodStart.toISOString(),
            periodEnd: p.periodEnd.toISOString(),
            creditsServed: p.creditsServed,
            amountPaise: p.amountPaise,
            status: p.status,
            paidAt: p.paidAt?.toISOString() ?? null,
            reference: p.reference,
        })),
    });
}
