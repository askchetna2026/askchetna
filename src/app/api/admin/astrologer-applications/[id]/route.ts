import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkAdminAccess } from '@/lib/admin';
import prisma from '@/lib/prisma';
import { signedPhotoUrl } from '@/lib/photoUpload';

/**
 * One application in full, and the actions an admin can take on it (spec §24–25).
 */

/** Where each action moves the application. */
const ACTIONS = {
    START_REVIEW: 'UNDER_REVIEW',
    REQUEST_INFO: 'REQUEST_MORE_INFORMATION',
    SHORTLIST: 'SHORTLISTED',
    REJECT: 'REJECTED',
    APPROVE: 'FINAL_APPROVAL',
} as const;

type Action = keyof typeof ACTIONS;

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await checkAdminAccess())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const application = await prisma.astrologerApplication.findUnique({
        where: { id },
        include: { user: { select: { email: true, phone: true, createdAt: true } } },
    });

    if (!application) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Minted per request and short-lived. The bucket is private, so this is the
    // only way to see the photo — and a link that outlives the page it was
    // generated for is a link that ends up somewhere it should not.
    const photoUrl = application.profilePhotoPath
        ? await signedPhotoUrl(application.profilePhotoPath, 600)
        : null;

    return NextResponse.json({
        application: {
            ...application,
            submittedAt: application.submittedAt.toISOString(),
            updatedAt: application.updatedAt.toISOString(),
            reviewedAt: application.reviewedAt?.toISOString() ?? null,
            declaredAt: application.declaredAt?.toISOString() ?? null,
            infoRequestedAt: application.infoRequestedAt?.toISOString() ?? null,
            photoUrl,
        },
    });
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    if (!(await checkAdminAccess())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const session = await auth();
    const { id } = await params;

    let body: { action?: string; note?: string; message?: string; adminNotes?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const existing = await prisma.astrologerApplication.findUnique({
        where: { id },
        select: { id: true, status: true, userId: true, displayName: true },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const reviewer = session?.user?.email ?? 'admin';

    // Notes can be saved without changing status — an admin part-way through a
    // review should not have to move the application to record a thought.
    if (body.adminNotes !== undefined && !body.action) {
        const updated = await prisma.astrologerApplication.update({
            where: { id },
            data: { adminNotes: body.adminNotes.slice(0, 5000) },
            select: { adminNotes: true },
        });
        return NextResponse.json({ adminNotes: updated.adminNotes });
    }

    const action = body.action as Action | undefined;
    if (!action || !(action in ACTIONS)) {
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const data: Record<string, unknown> = {
        status: ACTIONS[action],
        reviewedAt: new Date(),
        reviewedBy: reviewer,
    };

    if (body.adminNotes !== undefined) data.adminNotes = body.adminNotes.slice(0, 5000);

    if (action === 'REQUEST_INFO') {
        const message = (body.message ?? '').trim();
        if (!message) {
            return NextResponse.json(
                { error: 'Say what additional information is needed.' },
                { status: 400 }
            );
        }
        data.infoRequest = message.slice(0, 2000);
        data.infoRequestedAt = new Date();
    }

    if (action === 'REJECT') {
        // Shown to the applicant, so it must be written for them — the internal
        // reasoning belongs in adminNotes, which they never see.
        const message = (body.message ?? '').trim();
        if (!message) {
            return NextResponse.json(
                { error: 'A reason is required, and the applicant will see it.' },
                { status: 400 }
            );
        }
        data.rejectionReason = message.slice(0, 2000);
    }

    // Clearing a previous request means the applicant is no longer being asked
    // for anything, so the banner on their status page must go with it.
    if (action !== 'REQUEST_INFO') {
        data.infoRequest = null;
        data.infoRequestedAt = null;
    }

    const updated = await prisma.astrologerApplication.update({
        where: { id },
        data,
        select: { id: true, ref: true, status: true, reviewedBy: true, reviewedAt: true },
    });

    // Approval does NOT create an Astrologer profile here. Spec §2 puts
    // verification, pricing and payout setup between first screening and a
    // published profile, so FINAL_APPROVAL means "passed screening", not "live".
    // Creating the profile is a later, deliberate step.
    return NextResponse.json({
        application: {
            ...updated,
            reviewedAt: updated.reviewedAt?.toISOString() ?? null,
        },
    });
}
