import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkAdminAccess } from '@/lib/admin';
import prisma from '@/lib/prisma';
import { signedPhotoUrl } from '@/lib/photoUpload';
import { APPLICATION_ACTIONS, type ApplicationAction } from '@/lib/astrologerApplication';

/**
 * One application in full, and the actions an admin can take on it (spec §24–25).
 *
 * The transition table lives in @/lib/astrologerApplication so this route and
 * the admin UI cannot disagree about what is possible from a given status.
 */

type Action = ApplicationAction;

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
    if (!action || !(action in APPLICATION_ACTIONS)) {
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const rule = APPLICATION_ACTIONS[action];

    // The guard that makes the chain a chain. Without it an application could be
    // published straight from SUBMITTED, and the verification steps would be
    // decoration. Also catches two admins acting on the same row: the second
    // request finds a status the action no longer applies to.
    if (!(rule.from as readonly string[]).includes(existing.status)) {
        return NextResponse.json(
            {
                error: `Cannot ${rule.label.toLowerCase()} from status ${existing.status}.`,
                status: existing.status,
            },
            { status: 409 }
        );
    }

    const data: Record<string, unknown> = {
        status: rule.to,
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

    // PUBLISH is the one action that creates something the public can see, so it
    // is the one action that does more than move a status.
    if (action === 'PUBLISH') {
        const full = await prisma.astrologerApplication.findUnique({
            where: { id },
            select: {
                userId: true,
                displayName: true,
                aboutYou: true,
                languages: true,
                areasOfExpertise: true,
            },
        });
        if (!full) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // userId is @unique on Astrologer, so a second profile would throw a
        // constraint error rather than a useful message. Checked first because
        // "this person is already published" is a normal thing for an admin to
        // do by accident, not an exceptional one.
        const already = await prisma.astrologer.findUnique({
            where: { userId: full.userId },
            select: { id: true, status: true },
        });
        if (already) {
            return NextResponse.json(
                {
                    error: `This applicant already has an astrologer profile (${already.status.toLowerCase()}).`,
                    astrologerId: already.id,
                },
                { status: 409 }
            );
        }

        // One transaction: an application marked ACTIVE with no profile behind it
        // is the exact failure this whole feature exists to fix, and a profile
        // with the application still at FINAL_APPROVAL would re-publish on the
        // next click.
        const [astrologer, app] = await prisma.$transaction([
            prisma.astrologer.create({
                data: {
                    userId: full.userId,
                    displayName: full.displayName,
                    // The applicant's own words about their practice. Note that
                    // admin PATCH on /api/admin/astrologers refuses to edit a
                    // human's displayName or bio by design, so this is the text
                    // that goes live — it is not an admin draft.
                    bio: full.aboutYou?.trim().slice(0, 2000) || null,
                    // Copied as the display names the applicant chose. The schema
                    // comment on this column says "ISO codes", but the directory
                    // renders it as `Speaks {languages.join(', ')}` — display
                    // names are what the UI actually wants.
                    languages: full.languages.slice(0, 10),
                    specialities: full.areasOfExpertise.slice(0, 10),
                    // Live immediately: publishing IS the approval, and a profile
                    // created as PENDING would need a second approval on a
                    // different screen to do anything.
                    status: 'APPROVED',
                    approvedAt: new Date(),
                    approvedBy: reviewer,
                    // photoUrl stays null. The application's photo lives in a
                    // PRIVATE bucket and is only readable through short-lived
                    // signed URLs (spec §30); copying that path here would store
                    // a link that expires. AstrologerAvatar falls back to a
                    // generated initial, so the directory renders correctly.
                    // Moving the photo to public storage is still to do.
                },
                select: { id: true, displayName: true, status: true },
            }),
            prisma.astrologerApplication.update({
                where: { id },
                data,
                select: { id: true, ref: true, status: true, reviewedBy: true, reviewedAt: true },
            }),
        ]);

        return NextResponse.json({
            application: { ...app, reviewedAt: app.reviewedAt?.toISOString() ?? null },
            astrologer,
            message: `${astrologer.displayName} is now published. They must go available from /astrologer to appear online.`,
        });
    }

    const updated = await prisma.astrologerApplication.update({
        where: { id },
        data,
        select: { id: true, ref: true, status: true, reviewedBy: true, reviewedAt: true },
    });

    // Nothing before PUBLISH creates an Astrologer profile. Spec §2 puts
    // verification, pricing and payout setup between first screening and a
    // published profile, so FINAL_APPROVAL means "passed screening", not "live".
    return NextResponse.json({
        application: {
            ...updated,
            reviewedAt: updated.reviewedAt?.toISOString() ?? null,
        },
    });
}
