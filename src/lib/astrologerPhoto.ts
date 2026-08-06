/**
 * Where an astrologer's portrait is served from.
 *
 * The profile stores a POINTER to `/api/astrologers/<id>/photo` rather than a
 * signed URL, because signed links expire within the hour and one written onto
 * the profile would go dead while the profile stayed live.
 *
 * That pointer is edge-cached — a directory of twenty faces would otherwise be
 * twenty signing round-trips on every page view. But a URL that never changes
 * is also a cache key that never changes, so replacing a photo left every
 * seeker looking at the old one until the cache expired. The astrologer sees
 * the new picture immediately (their own upload response is cache-busted) and
 * everybody else sees the previous one for half an hour, which reads as the
 * upload having silently failed.
 *
 * So the pointer carries a version taken from the stored object path. The
 * filename is a timestamp written at upload, so it changes when — and only
 * when — the photo does: a new photo is a new URL and misses the cache
 * instantly, while an unchanged one keeps hitting it. Duty toggles and bio
 * edits deliberately do not affect it, which is why this is derived from the
 * path rather than from `updatedAt`.
 */

/** The version token for a stored object path, or null if there is no photo. */
export function photoVersion(photoPath: string | null | undefined): string | null {
    if (!photoPath) return null;
    const file = photoPath.split('/').pop() ?? '';
    const stem = file.replace(/\.[^.]+$/, '');
    return stem || null;
}

/**
 * The URL to serve an astrologer's portrait from.
 *
 * Returns null when there is no photo at all, so a caller can fall back to the
 * generated initial rather than requesting something that will 404.
 */
export function photoPointer(
    astrologerId: string,
    photoPath: string | null | undefined
): string | null {
    const version = photoVersion(photoPath);
    if (!version) return null;
    return `/api/astrologers/${astrologerId}/photo?v=${version}`;
}
