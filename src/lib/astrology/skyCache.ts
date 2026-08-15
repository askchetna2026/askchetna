/**
 * A small memo for sky calculations that are shared between seekers.
 *
 * Today's transit and today's panchang are not personal. The transit route takes
 * no input at all — "Moon in Scorpio", the day's Rahu Kaal, the lucky colour —
 * so it returns the identical object to every visitor on Earth, and was running
 * a 12 MB ephemeris per request to produce it. Panchang varies only by date and
 * coordinates, and a user base clustered in a few cities shares a handful of
 * distinct values between all of them.
 *
 * Deliberately in-process rather than in Postgres or the Next data cache:
 *
 *   - There is nothing to persist. Every entry is worthless tomorrow, and
 *     recomputing after a cold start costs one ephemeris load, which is what an
 *     uncached request cost anyway. A cache that cannot make things worse does
 *     not need durability.
 *   - `export const revalidate` would make these routes candidates for
 *     prerendering, which would run the WASM ephemeris inside `next build`.
 *
 * The ceiling exists because the key space is caller-controlled (coordinates),
 * and an unbounded Map on a long-lived server is a leak. Eviction is oldest-
 * first, which for keys that all expire on the same day boundary is the same
 * thing as evicting the least useful.
 */

type Entry<T> = { value: T; expiresAt: number };

const MAX_ENTRIES = 256;
const store = new Map<string, Entry<unknown>>();

/** The current UTC calendar day, as a cache-key component. */
export function utcDayKey(now = new Date()): string {
    return now.toISOString().slice(0, 10);
}

/**
 * The current UTC hour, for values that drift within a day.
 *
 * The Moon covers ~0.55° an hour, so an hourly key can only ever name a stale
 * sign within an hour of a sign change — which is inside the margin of a page
 * that shows a whole day's mood anyway.
 */
export function utcHourKey(now = new Date()): string {
    return `${utcDayKey(now)}T${String(now.getUTCHours()).padStart(2, '0')}`;
}

/** Coordinates rounded to ~11 km, so one city is one cache entry. */
export function coordKey(lat: number, lng: number): string {
    return `${lat.toFixed(1)},${lng.toFixed(1)}`;
}

export async function cached<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = store.get(key);

    if (hit && hit.expiresAt > now) {
        return hit.value as T;
    }

    const value = await compute();

    // Only prune when the miss actually adds an entry, so a hot key does not
    // walk the map on every request.
    if (store.size >= MAX_ENTRIES) {
        const oldest = store.keys().next();
        if (!oldest.done) store.delete(oldest.value);
    }

    store.set(key, { value, expiresAt: now + ttlMs });
    return value;
}
