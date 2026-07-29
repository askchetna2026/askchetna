import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

/**
 * Profile photo handling for astrologer applications.
 *
 * Every uploaded image is re-encoded to WebP before it is stored. That is not
 * only a size decision:
 *
 *   - Re-encoding through sharp discards EXIF, and phone cameras embed GPS
 *     coordinates. A profile photo carrying someone's home location is a
 *     privacy leak that survives forever once stored.
 *   - It also neutralises polyglot files — an image that is also a valid script.
 *     Decoding to raw pixels and re-encoding cannot preserve an appended
 *     payload.
 *   - And it is what keeps the free Supabase tier viable: a 5 MB phone photo
 *     becomes roughly 40-80 KB, sixty to a hundred times smaller.
 *
 * The bucket is private (spec §30). Photos belong to people under review and
 * must not be publicly addressable until a profile is published, so reads go
 * through short-lived signed URLs rather than a permanent public path.
 */

const BUCKET = 'astrologer-photos';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 600;

/** Formats we will decode. Checked against the bytes, not the declared type. */
const ACCEPTED = ['jpeg', 'jpg', 'png', 'webp'] as const;

export type UploadResult =
    | { ok: true; path: string; bytes: number }
    | { ok: false; error: string };

function serviceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    // No session persistence: this runs per request on the server and must never
    // carry state between them.
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

export function storageConfigured(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Converts to WebP and stores it.
 *
 * @param pathPrefix folder for the object. The photo is uploaded BEFORE the
 *                   application row exists — the applicant has not submitted
 *                   yet — so this is the user id rather than an application
 *                   ref. Keying by user also means a re-upload during the same
 *                   sitting lands beside the previous attempt rather than
 *                   somewhere unrelated.
 */
export async function uploadProfilePhoto(
    file: ArrayBuffer,
    pathPrefix: string
): Promise<UploadResult> {
    if (file.byteLength > MAX_UPLOAD_BYTES) {
        return { ok: false, error: 'Image must be 5 MB or smaller.' };
    }

    const client = serviceClient();
    if (!client) {
        return { ok: false, error: 'Photo storage is not configured.' };
    }

    let webp: Buffer;
    try {
        const input = Buffer.from(file);

        // Trust the bytes, not the declared content type. A client can claim
        // anything; sharp reading a real header cannot be talked into it.
        const meta = await sharp(input).metadata();
        if (!meta.format || !ACCEPTED.includes(meta.format as (typeof ACCEPTED)[number])) {
            return { ok: false, error: 'Upload a JPG, PNG or WebP image.' };
        }
        if ((meta.width ?? 0) < 200 || (meta.height ?? 0) < 200) {
            return { ok: false, error: 'Image should be at least 200 x 200 pixels.' };
        }

        webp = await sharp(input)
            // Honour the orientation flag before stripping metadata, otherwise a
            // portrait photo taken sideways stays sideways.
            .rotate()
            .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'cover', position: 'attention' })
            .webp({ quality: 82 })
            .toBuffer();
    } catch {
        return { ok: false, error: 'That file could not be read as an image.' };
    }

    const path = `${pathPrefix}/${Date.now()}.webp`;
    const { error } = await client.storage.from(BUCKET).upload(path, webp, {
        contentType: 'image/webp',
        upsert: false,
    });

    if (error) {
        console.error('[photo] upload failed:', error.message);
        return { ok: false, error: 'Could not store the image. Please try again.' };
    }

    return { ok: true, path, bytes: webp.byteLength };
}

/**
 * Short-lived readable URL for a stored photo.
 *
 * Signed rather than public, and deliberately brief: an admin viewing an
 * application needs it for minutes, and a link that outlives the page it was
 * generated for is a link that ends up somewhere it should not.
 */
export async function signedPhotoUrl(
    path: string,
    expiresInSeconds = 300
): Promise<string | null> {
    const client = serviceClient();
    if (!client) return null;

    const { data, error } = await client.storage
        .from(BUCKET)
        .createSignedUrl(path, expiresInSeconds);

    if (error) {
        console.error('[photo] signing failed:', error.message);
        return null;
    }
    return data?.signedUrl ?? null;
}
