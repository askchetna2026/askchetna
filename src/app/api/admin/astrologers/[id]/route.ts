import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkAdminAccess } from '@/lib/admin';
import prisma from '@/lib/prisma';

const VALID_STATUSES = ['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'] as const;
type Status = (typeof VALID_STATUSES)[number];

/**
 * Admin approval, suspension and rate overrides.
 *
 * Approval is the gate that keeps unvetted people out of one-to-one
 * consultations, so it lives behind checkAdminAccess and nowhere else.
 *
 * Suspending also forces the astrologer offline. Leaving `isAvailable` true on a
 * suspended record would keep them in the directory for anyone whose page was
 * already loaded, and the first thing they would learn is that a credit had been
 * spent on a session that could not start.
 */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await checkAdminAccess())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = await auth();
    const { id } = await params;

    let body: { status?: string; revenueSharePct?: number | null; rejectionReason?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const data: Record<string, unknown> = {};

    if (body.status !== undefined) {
        const status = body.status.toUpperCase() as Status;
        if (!VALID_STATUSES.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
        data.status = status;

        if (status === 'APPROVED') {
            data.approvedAt = new Date();
            data.approvedBy = session?.user?.email ?? 'admin';
            data.rejectionReason = null;
        }
        if (status === 'REJECTED' || status === 'SUSPENDED') {
            data.isAvailable = false;
            if (body.rejectionReason) {
                data.rejectionReason = body.rejectionReason.slice(0, 2000);
            }
        }
    }

    if (body.revenueSharePct !== undefined) {
        if (body.revenueSharePct === null) {
            // Back to following the global default.
            data.revenueSharePct = null;
        } else {
            const pct = Number(body.revenueSharePct);
            if (!Number.isInteger(pct) || pct < 0 || pct > 100) {
                return NextResponse.json(
                    { error: 'revenueSharePct must be an integer between 0 and 100' },
                    { status: 400 }
                );
            }
            data.revenueSharePct = pct;
        }
    }

    if (Object.keys(data).length === 0) {
        return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.astrologer.update({
        where: { id },
        data,
        select: {
            id: true,
            displayName: true,
            status: true,
            revenueSharePct: true,
            isAvailable: true,
            approvedAt: true,
        },
    });

    // Rate changes apply to FUTURE sessions only. Consultations snapshot the
    // share when they open, so sessions already settled keep the figure they
    // were paid on and past payouts continue to reconcile.
    return NextResponse.json({ astrologer: updated });
}

/** One astrologer with their earnings summary, for the admin view. */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await checkAdminAccess())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    const astrologer = await prisma.astrologer.findUnique({
        where: { id },
        select: {
            id: true,
            displayName: true,
            bio: true,
            status: true,
            revenueSharePct: true,
            isAvailable: true,
            lastSeenAt: true,
            approvedAt: true,
            approvedBy: true,
            createdAt: true,
            user: { select: { email: true, phone: true } },
        },
    });

    if (!astrologer) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [totals, unpaid, sessions] = await Promise.all([
        prisma.astrologerEarning.aggregate({
            where: { astrologerId: id },
            _sum: { creditsServed: true, amountPaise: true },
            _count: true,
        }),
        prisma.astrologerEarning.aggregate({
            where: { astrologerId: id, payoutId: null },
            _sum: { amountPaise: true },
        }),
        prisma.consultation.count({ where: { astrologerId: id } }),
    ]);

    return NextResponse.json({
        astrologer,
        summary: {
            consultations: sessions,
            settledSessions: totals._count,
            creditsServed: totals._sum.creditsServed ?? 0,
            earnedPaise: totals._sum.amountPaise ?? 0,
            unpaidPaise: unpaid._sum.amountPaise ?? 0,
        },
    });
}
