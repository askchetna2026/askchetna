import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { photoPointer } from '@/lib/astrologerPhoto';

/**
 * Staleness cap, NOT a heartbeat window.
 *
 * Presence is explicit now: sign-in sets `isAvailable`, sign-out clears it.
 * Nothing polls, because a 60s heartbeat costs a function call and a row write
 * every minute per astrologer — tens of thousands a month for a signal that
 * changes twice a day.
 *
 * This exists only to catch the case where neither end fired: a crashed
 * browser, a killed app, a session that expired without a sign-out. Twelve
 * hours is longer than any single sitting and short enough that a forgotten
 * session does not advertise someone as available for days.
 */
const PRESENCE_WINDOW_MS = 12 * 60 * 60 * 1000;

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
            photoPath: true,
            userId: true,
            languages: true,
            specialities: true,
            isAvailable: true,
            lastSeenAt: true,
            isAI: true,
            creditsPerBlock: true,
        },
        orderBy: [{ isAvailable: 'desc' }, { displayName: 'asc' }],
        take: 100,
    });

    /**
     * `photoUrl` is a denormalised pointer, written when a profile is published.
     * When it is null the directory used to show an initial even though a photo
     * existed and `/api/astrologers/[id]/photo` would have served it happily —
     * which is what happened to every astrologer approved before that write was
     * added, and looked like a rendering bug rather than stale data.
     *
     * So the column is treated as a cache, not the truth. The one extra query
     * runs ONLY when some listed astrologer is missing it, and disappears once
     * the rows are backfilled.
     */
    const unresolved = astrologers.filter((a) => !a.photoUrl && !a.photoPath && a.userId);
    const applicationPhoto = new Map<string, string>();
    if (unresolved.length > 0) {
        const apps = await prisma.astrologerApplication.findMany({
            where: {
                userId: { in: unresolved.map((a) => a.userId as string) },
                profilePhotoPath: { not: null },
            },
            orderBy: { submittedAt: 'desc' },
            select: { userId: true, profilePhotoPath: true },
            distinct: ['userId'],
        });
        for (const app of apps) {
            if (app.profilePhotoPath) applicationPhoto.set(app.userId, app.profilePhotoPath);
        }
    }

    const photoFor = (a: (typeof astrologers)[number]) => {
        // A stored pointer wins — it is already versioned by whoever wrote it,
        // and for an AI persona it is a static asset with no path behind it.
        if (a.photoUrl) return a.photoUrl;
        const path = a.photoPath ?? (a.userId ? applicationPhoto.get(a.userId) : null);
        return photoPointer(a.id, path);
    };

    const cutoff = Date.now() - PRESENCE_WINDOW_MS;
    const withPresence = astrologers.map((a) => ({
        id: a.id,
        displayName: a.displayName,
        bio: a.bio,
        photoUrl: photoFor(a),
        languages: a.languages,
        specialities: a.specialities,
        // Disclosed to the client so the directory can label it. Never inferred
        // from the name or bio — an AI persona presented as a person is
        // deceptive, and both stores treat it as such.
        isAI: a.isAI,
        /// What one block costs. Null means the global default of 1 credit.
        creditsPerBlock: a.creditsPerBlock ?? 1,
        // An AI persona has no browser to hold it online and no heartbeat to go
        // stale, so presence does not apply — it is always reachable.
        online: a.isAI || (a.isAvailable && !!a.lastSeenAt && a.lastSeenAt.getTime() > cutoff),
    }));

    return NextResponse.json({
        astrologers: onlyAvailable ? withPresence.filter((a) => a.online) : withPresence,
    });
}

/**
 * There is deliberately no POST here any more.
 *
 * A self-registration route used to create an Astrologer directly, bypassing
 * the nine-section screening application. It was never a way in — the row was
 * created PENDING and could not approve itself — but it was a second door to
 * the same entity, and its only UI had already been removed. Applications now
 * arrive through /api/astrologer-applications and become an Astrologer when an
 * admin publishes them, which is the one path worth keeping correct.
 */
