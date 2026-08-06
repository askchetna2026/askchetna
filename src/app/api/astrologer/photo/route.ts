import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { uploadProfilePhoto, storageConfigured } from '@/lib/photoUpload';
import { photoPointer } from '@/lib/astrologerPhoto';

/**
 * Replaces a published astrologer's portrait.
 *
 * Distinct from `/api/astrologer-applications/photo`, which stages an image for
 * someone still under review. This one publishes: it writes onto the live
 * profile, so it is gated on APPROVED and goes nowhere near the application
 * record — that is the evidence an admin reviewed and must stay as submitted.
 *
 * The bytes go through the same `uploadProfilePhoto` as every other path, which
 * is what guarantees the EXIF strip, the polyglot-file neutralisation and the
 * WebP re-encode happen here too.
 */

// Image processing is CPU-bound and a large upload takes a moment.
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const astrologer = await prisma.astrologer.findUnique({
        where: { userId: session.user.id },
        select: { id: true, status: true },
    });
    if (!astrologer) {
        return NextResponse.json({ error: 'Not an astrologer' }, { status: 404 });
    }
    if (astrologer.status !== 'APPROVED') {
        return NextResponse.json(
            {
                error: 'Not approved',
                message: `Your profile is ${astrologer.status.toLowerCase()}. You cannot change what seekers see.`,
            },
            { status: 403 }
        );
    }

    if (!storageConfigured()) {
        return NextResponse.json(
            {
                error: 'Storage not configured',
                message: 'Photo upload is not available in this environment.',
            },
            { status: 503 }
        );
    }

    let file: File | null = null;
    try {
        const form = await request.formData();
        const value = form.get('photo');
        if (value instanceof File) file = value;
    } catch {
        return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
    }

    if (!file) {
        return NextResponse.json({ error: 'No photo supplied' }, { status: 400 });
    }
    // Fails fast on the declared size; uploadProfilePhoto checks the real bytes,
    // which is the check that counts.
    if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'Image must be 5 MB or smaller.' }, { status: 413 });
    }

    // Keyed by astrologer id rather than user id, so a published portrait sits
    // apart from the images staged during an application.
    const result = await uploadProfilePhoto(
        await file.arrayBuffer(),
        `published/${astrologer.id}`
    );
    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // The old object is deliberately left in place. Deleting it would break any
    // signed URL already handed out and still inside its hour, and an orphaned
    // 40 KB WebP is a far cheaper problem than a portrait that 404s mid-session.
    //
    // The stored pointer is VERSIONED by the new object's path, which is what
    // makes the change visible to everybody else. An unversioned pointer is a
    // cache key that never changes, so seekers kept seeing the previous
    // portrait for as long as the edge held it.
    const photoUrl = photoPointer(astrologer.id, result.path);
    await prisma.astrologer.update({
        where: { id: astrologer.id },
        data: {
            photoPath: result.path,
            // Set on every upload rather than only the first, so a profile that
            // somehow lost its pointer is repaired by the next photo change.
            photoUrl,
        },
    });

    return NextResponse.json({
        photoUrl,
        bytes: result.bytes,
        message: 'Saved. Seekers see this photo now.',
    });
}
