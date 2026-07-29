import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadProfilePhoto, storageConfigured } from '@/lib/photoUpload';

/**
 * Profile photo upload for an astrologer application.
 *
 * Uploaded separately from the form submission so a 5 MB image is not carried
 * inside a JSON body, and so a failed submit does not mean re-picking the photo.
 * The endpoint returns a storage path; the form sends that path along with
 * everything else.
 *
 * The 5 MB ceiling is enforced twice — here on the declared size, and again in
 * uploadProfilePhoto on the actual bytes. The first is a courtesy so an obvious
 * oversize fails fast; the second is the one that counts.
 */

// Image processing is CPU-bound and a large upload takes a moment.
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!storageConfigured()) {
        return NextResponse.json(
            {
                error: 'Storage not configured',
                message: 'Photo upload is not available yet. You can submit without one.',
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
    if (file.size > MAX_BYTES) {
        return NextResponse.json(
            { error: 'Image must be 5 MB or smaller.' },
            { status: 413 }
        );
    }

    // Keyed by user, not by application: the applicant has not submitted yet, so
    // there is no application ref to key on.
    const result = await uploadProfilePhoto(await file.arrayBuffer(), session.user.id);

    if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ path: result.path, bytes: result.bytes });
}
