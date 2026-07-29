import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

/** How long after a heartbeat an astrologer still counts as online. */
const PRESENCE_WINDOW_MS = 2 * 60 * 1000;

/**
 * The public directory: approved astrologers only.
 *
 * "Available" needs both the manual toggle and a recent heartbeat. The toggle
 * alone leaves ghosts online after a crash or a closed laptop, and a user who
 * spends a credit to reach someone who is not there has been charged for
 * nothing — which is a refund conversation, not a bug report.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const onlyAvailable = searchParams.get('available') === '1';
    const speciality = searchParams.get('speciality');
    const language = searchParams.get('language');

    const astrologers = await prisma.astrologer.findMany({
        where: {
            status: 'APPROVED',
            ...(speciality ? { specialities: { has: speciality } } : {}),
            ...(language ? { languages: { has: language } } : {}),
        },
        select: {
            id: true,
            displayName: true,
            bio: true,
            photoUrl: true,
            languages: true,
            specialities: true,
            isAvailable: true,
            lastSeenAt: true,
        },
        orderBy: [{ isAvailable: 'desc' }, { displayName: 'asc' }],
        take: 100,
    });

    const cutoff = Date.now() - PRESENCE_WINDOW_MS;
    const withPresence = astrologers.map((a) => ({
        id: a.id,
        displayName: a.displayName,
        bio: a.bio,
        photoUrl: a.photoUrl,
        languages: a.languages,
        specialities: a.specialities,
        online: a.isAvailable && !!a.lastSeenAt && a.lastSeenAt.getTime() > cutoff,
    }));

    return NextResponse.json({
        astrologers: onlyAvailable ? withPresence.filter((a) => a.online) : withPresence,
    });
}

/**
 * Registers the signed-in user as an astrologer, pending approval.
 *
 * Self-service registration with an admin gate: anyone may apply, nobody takes
 * consultations until an admin approves. Both stores scrutinise consultation
 * marketplaces, and an open door here is how the app ends up hosting people it
 * has never checked.
 */
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: {
        displayName?: string;
        bio?: string;
        languages?: string[];
        specialities?: string[];
    };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    const displayName = (body.displayName ?? '').trim();
    if (displayName.length < 2 || displayName.length > 60) {
        return NextResponse.json(
            { error: 'Display name must be between 2 and 60 characters' },
            { status: 400 }
        );
    }

    const existing = await prisma.astrologer.findUnique({
        where: { userId: session.user.id },
        select: { id: true, status: true },
    });
    if (existing) {
        return NextResponse.json(
            {
                error: 'Already registered',
                message:
                    existing.status === 'PENDING'
                        ? 'Your application is under review.'
                        : `Your astrologer profile is ${existing.status.toLowerCase()}.`,
                status: existing.status,
            },
            { status: 409 }
        );
    }

    const astrologer = await prisma.astrologer.create({
        data: {
            userId: session.user.id,
            displayName,
            bio: (body.bio ?? '').trim().slice(0, 2000) || null,
            languages: (body.languages ?? []).slice(0, 10),
            specialities: (body.specialities ?? []).slice(0, 10),
            // status defaults to PENDING; nothing here may grant approval.
        },
        select: { id: true, status: true },
    });

    return NextResponse.json({
        id: astrologer.id,
        status: astrologer.status,
        message: 'Application received. An admin will review it shortly.',
    });
}
