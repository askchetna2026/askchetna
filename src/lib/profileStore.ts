'use client';

import type { ChartData } from '@/lib/astrology/zodiac';

/**
 * One fetch of the seeker's profiles, shared by everything that needs them.
 *
 * Nine components called `/api/profiles/active` independently — the rashi
 * badge, the profile gate, the chart page, the timing page, the dashboard and
 * more — so a single navigation fired several identical requests, each
 * returning every active profile with its full chart. Three of them land on the
 * home page alone.
 *
 * Two layers, doing different jobs:
 *
 *   in-flight promise — concurrent callers on one page share ONE request
 *     instead of racing. This is what removes the duplicate round trips.
 *
 *   localStorage — the next page load paints from the last known answer with no
 *     request at all, then refreshes in the background. The chart is immutable
 *     for a given profile, so a stale read is only ever stale about which
 *     profiles exist, never about what a chart says.
 *
 * The cache is invalidated explicitly by `refreshProfiles()` after anything
 * that changes the set — creating, deleting or backfilling a profile — rather
 * than by a short TTL, because a TTL that is short enough to feel correct is
 * short enough to put the request back on every navigation.
 */

export interface StoredProfile {
    id: string;
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeOfBirth: string;
    gender?: string;
    latitude?: number;
    longitude?: number;
    isActive?: boolean;
    unlockedCharts?: string[];
    chartData?: ChartData;
}

export interface ProfilesPayload {
    profiles: StoredProfile[];
    limit: number;
    canAddMore: boolean;
    expansionCost?: number;
    [key: string]: unknown;
}

const KEY = 'askchetna:profiles:v1';

let inFlight: Promise<ProfilesPayload | null> | null = null;
let memory: ProfilesPayload | null = null;

function readCache(): ProfilesPayload | null {
    if (memory) return memory;
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as ProfilesPayload;
        if (!Array.isArray(parsed?.profiles)) return null;
        memory = parsed;
        return parsed;
    } catch {
        return null;
    }
}

function writeCache(data: ProfilesPayload) {
    memory = data;
    try {
        localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
        /* Quota or private mode — the memory copy still dedupes this page. */
    }
}

/** Drop everything cached. Call after the set of profiles changes. */
export function clearProfileCache() {
    memory = null;
    inFlight = null;
    try { localStorage.removeItem(KEY); } catch { /* nothing to do */ }
}

/** Fetch from the server, collapsing concurrent callers onto one request. */
export function fetchProfiles(): Promise<ProfilesPayload | null> {
    if (inFlight) return inFlight;

    inFlight = (async () => {
        try {
            const res = await fetch('/api/profiles/active', { cache: 'no-store' });
            if (!res.ok) return null;
            const data = (await res.json()) as ProfilesPayload;
            if (!Array.isArray(data?.profiles)) return null;
            writeCache(data);
            return data;
        } catch {
            return null;
        } finally {
            // Cleared so a later refresh is a real request, not this same
            // resolved promise handed back forever.
            inFlight = null;
        }
    })();

    return inFlight;
}

/**
 * The cached answer if there is one, otherwise a fetch.
 *
 * `onFresh` is called when the network answer arrives and differs from what was
 * served from cache, so a caller can paint instantly and correct itself without
 * having to know which of the two happened.
 */
export async function getProfiles(
    onFresh?: (data: ProfilesPayload) => void
): Promise<ProfilesPayload | null> {
    const cached = readCache();

    if (cached) {
        // Revalidate in the background; the caller already has something to draw.
        void fetchProfiles().then((fresh) => {
            if (fresh && onFresh && JSON.stringify(fresh) !== JSON.stringify(cached)) {
                onFresh(fresh);
            }
        });
        return cached;
    }

    return fetchProfiles();
}

/** Force a re-read, e.g. after creating a profile. */
export async function refreshProfiles(): Promise<ProfilesPayload | null> {
    clearProfileCache();
    return fetchProfiles();
}

/**
 * The profile the app treats as primary.
 *
 * `/api/profiles/active` returns newest-first, and every screen that picks a
 * default takes the first entry, so "primary" is that same one — chosen here
 * rather than re-derived at each call site, so the rashi on the home page and
 * the chart on /chart can never disagree about whose they are.
 */
export function primaryProfile(data: ProfilesPayload | null): StoredProfile | null {
    return data?.profiles?.[0] ?? null;
}
