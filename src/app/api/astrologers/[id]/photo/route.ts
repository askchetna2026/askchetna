import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { signedPhotoUrl } from '@/lib/photoUpload';

/**
 * The published photo for one astrologer.
 *
 * The bucket is private (spec §30) and reads go through short-lived signed
 * URLs, which cannot be stored on the profile — a signed link put in
 * `Astrologer.photoUrl` would be dead within the hour. So the profile stores a
 * pointer to THIS route instead, and the signing happens per request.
 *
 * Redirects rather than proxying the bytes: a 302 hands the image straight to
 * Supabase's CDN, so the function returns in milliseconds and never streams a
 * payload through the app.
 *
 * The photo is only served once a profile is APPROVED. That is the whole
 * privacy rule — an applicant under review is not publicly addressable, and
 * guessing an id must not reveal one.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const astrologer = await prisma.astrologer.findUnique({
        where: { id },
        select: { status: true, userId: true, photoPath: true },
    });

    // 404, not 403: a rejected or pending applicant should not be distinguishable
    // from one that does not exist.
    if (!astrologer || astrologer.status !== 'APPROVED' || !astrologer.userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // A photo the astrologer has published themselves wins. Falling back to the
    // application is what lets every profile approved before `photoPath` existed
    // keep its portrait with no backfill — and it is a fallback, not a merge, so
    // replacing a photo cannot resurrect the one submitted with the application.
    let path = astrologer.photoPath;
    if (!path) {
        const application = await prisma.astrologerApplication.findFirst({
            where: { userId: astrologer.userId, profilePhotoPath: { not: null } },
            orderBy: { submittedAt: 'desc' },
            select: { profilePhotoPath: true },
        });
        path = application?.profilePhotoPath ?? null;
    }

    if (!path) {
        return NextResponse.json({ error: 'No photo' }, { status: 404 });
    }

    // Signed for a little longer than the cache below, so a browser never holds
    // a URL that has already expired.
    const url = await signedPhotoUrl(path, 3600);
    if (!url) {
        return NextResponse.json({ error: 'Storage unavailable' }, { status: 503 });
    }

    return NextResponse.redirect(url, {
        status: 302,
        headers: {
            // Cached at the edge, so a directory of twenty faces is not twenty
            // signing round-trips on every page view.
            'Cache-Control': 'public, max-age=900, s-maxage=1800',
        },
    });
}
