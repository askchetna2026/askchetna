'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Hourglass } from 'lucide-react';
import { PHASE_THEMES } from '@/lib/astrology/phaseThemes';
import styles from './CurrentChapterCard.module.css';

interface DashaPeriod {
    lord: string;
    start: string;
    end: string;
    antardasha?: { lord: string; start: string; end: string } | null;
}

type Phase = { current: DashaPeriod | null };

const CACHE_KEY = 'askchetna:current-chapter';

/**
 * The cached phase, or null once it has actually expired.
 *
 * Expiry is the sub-period's own end date, so the entry lives exactly as long
 * as the thing it describes and not a day longer.
 */
function readCache(): Phase | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { validUntil, payload } = JSON.parse(raw) as { validUntil: number; payload: Phase };
        if (!validUntil || validUntil < Date.now()) {
            window.localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

function writeCache(payload: Phase) {
    if (typeof window === 'undefined' || !payload.current) return;
    // Whichever boundary comes first — the sub-period usually, the chapter
    // itself when it is the last sub-period of one.
    const ends = [payload.current.end, payload.current.antardasha?.end]
        .filter(Boolean)
        .map((d) => new Date(d as string).getTime())
        .filter((t) => Number.isFinite(t) && t > Date.now());
    if (!ends.length) return;
    try {
        window.localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ validUntil: Math.min(...ends), payload }),
        );
    } catch {
        // A full or disabled localStorage costs a refetch, not a failure.
    }
}

/**
 * The multi-year chapter the seeker is currently in, on the signed-in home.
 *
 * The home page's main column used to hold the daily note and an empty journal
 * composer, and ended well above the side column — a large panel of blank
 * parchment. The answer is content that earns the slot rather than a stretched
 * box: this is per-chart, changes on a timescale of years, and is the piece of
 * context that makes the daily note above it make sense.
 *
 * Renders nothing at all until it has a real phase. A placeholder here would
 * reintroduce the hole it exists to close.
 */
export default function CurrentChapterCard() {
    const [dasha, setDasha] = useState<DashaPeriod | null>(null);
    const [sub, setSub] = useState<{ lord: string; end: string } | null>(null);

    useEffect(() => {
        let cancelled = false;

        const apply = (payload: Phase) => {
            if (cancelled || !payload?.current) return;
            setDasha(payload.current);
            const a = payload.current.antardasha;
            if (a) setSub({ lord: a.lord, end: a.end });
        };

        // A chapter lasts 6–20 years and its sub-period months, so the answer
        // stays valid until a date the answer itself names. Cached against that
        // date rather than a fixed TTL: re-asking daily for something that
        // changes twice a decade is the waste worth removing.
        const hit = readCache();
        if (hit) {
            apply(hit);
            return;
        }

        (async () => {
            try {
                const profileRes = await fetch('/api/profiles/active');
                if (!profileRes.ok) return;
                const profileData = await profileRes.json();
                const profileId = profileData.profiles?.[0]?.id;
                if (!profileId) return;

                const res = await fetch(`/api/astrology/dashas?profileId=${profileId}&current=1`);
                if (!res.ok) return;
                const data: Phase = await res.json();
                if (cancelled || !data?.current) return;
                writeCache(data);
                apply(data);
            } catch (err) {
                console.error('Failed to load current chapter:', err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const phase = dasha ? PHASE_THEMES[dasha.lord] : null;
    if (!dasha || !phase) return null;

    const startYear = new Date(dasha.start).getFullYear();
    const endYear = new Date(dasha.end).getFullYear();

    return (
        <div className={styles.card}>
            <span className={styles.label}>
                <Hourglass size={13} aria-hidden="true" /> Your current chapter
            </span>

            <h3 className={styles.theme}>{phase.theme}</h3>
            <span className={styles.years}>
                {startYear}–{endYear} · {dasha.lord} Mahadasha
            </span>

            <p className={styles.asking}>{phase.asking}</p>

            {/* The sub-period is what moves on a scale of months, so it is the
                part worth naming beside a chapter measured in years. */}
            {sub && PHASE_THEMES[sub.lord] && (
                <p className={styles.sub}>
                    Within it, a <strong>{sub.lord}</strong> sub-period until{' '}
                    {new Date(sub.end).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                    })}
                    .
                </p>
            )}

            <Link href="/timing" className={styles.link}>
                See your full timeline <ArrowRight size={15} />
            </Link>
        </div>
    );
}
