import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin';
import prisma from '@/lib/prisma';

/**
 * Application review queue (spec §23).
 *
 * Defaults to the states that need a decision rather than to everything: an
 * admin opening this is here to act, and a list dominated by settled
 * applications buries the ones waiting.
 *
 * Returns list columns only. The full application, and the signed photo URL,
 * come from the detail endpoint — a queue of fifty does not need fifty
 * two-thousand-character essays, and it certainly does not need fifty signed
 * URLs minted for photos nobody has opened.
 */

const NEEDS_ACTION = ['SUBMITTED', 'UNDER_REVIEW', 'APPLICANT_RESPONDED'];

/// The middle of the chain, as one tab. Verification and final approval are
/// three separate statuses but one job — "applications I have screened and not
/// yet published" — and three more tabs to hold a handful of rows each would
/// bury the queue that actually has work in it.
const IN_PROGRESS = ['SHORTLISTED', 'VERIFICATION_PENDING', 'VERIFIED', 'FINAL_APPROVAL'];

export async function GET(request: Request) {
    if (!(await checkAdminAccess())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'NEEDS_ACTION';
    const search = searchParams.get('q')?.trim();

    const where: Record<string, unknown> = {};
    if (status === 'NEEDS_ACTION') where.status = { in: NEEDS_ACTION };
    else if (status === 'IN_PROGRESS') where.status = { in: IN_PROGRESS };
    else if (status !== 'ALL') where.status = status;

    if (search) {
        // Spec §23 search: reference, name, display name, email, phone.
        where.OR = [
            { ref: { contains: search, mode: 'insensitive' } },
            { fullName: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
        ];
    }

    const [applications, counts] = await Promise.all([
        prisma.astrologerApplication.findMany({
            where,
            orderBy: { submittedAt: 'desc' },
            take: 200,
            select: {
                id: true,
                ref: true,
                fullName: true,
                displayName: true,
                country: true,
                primaryPractice: true,
                yearsOfExperience: true,
                languages: true,
                status: true,
                submittedAt: true,
                updatedAt: true,
                reviewedBy: true,
            },
        }),
        prisma.astrologerApplication.groupBy({ by: ['status'], _count: true }),
    ]);

    const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count]));

    return NextResponse.json({
        applications: applications.map((a) => ({
            ...a,
            submittedAt: a.submittedAt.toISOString(),
            updatedAt: a.updatedAt.toISOString(),
        })),
        counts: {
            ...byStatus,
            NEEDS_ACTION: NEEDS_ACTION.reduce((n, s) => n + (byStatus[s] ?? 0), 0),
            IN_PROGRESS: IN_PROGRESS.reduce((n, s) => n + (byStatus[s] ?? 0), 0),
            ALL: counts.reduce((n, c) => n + c._count, 0),
        },
    });
}
