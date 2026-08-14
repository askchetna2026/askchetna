'use client';

import { useEffect, useState } from 'react';
import { Sunrise, Compass, Eye } from 'lucide-react';
import styles from './DailyInsightCard.module.css';

interface DailyInsight {
    headline: string;
    body: string;
    focus: string;
    caution: string;
}

/** The seeker's local calendar day — the same key the API stores against. */
function localDay(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const cacheKey = (day: string) => `askchetna:daily-insight:${day}`;

/**
 * "How today reads for you", written once a day.
 *
 * Two layers of caching, doing different jobs:
 *
 *   localStorage — so the second and later visits of the day paint instantly
 *     with no request at all. Keyed by local date, so it self-expires at
 *     midnight; yesterday's key is simply never read again.
 *
 *   the server — so the MODEL runs once a day even across devices, private
 *     windows and cleared caches. localStorage cannot do that job, and treating
 *     it as if it could is how a per-user-per-day cost becomes a per-visit one.
 *
 * Old days are swept on mount rather than on a timer: the list is tiny, and a
 * seeker who returns after a month should not be carrying thirty dead keys.
 */
export default function DailyInsightCard() {
    const [insight, setInsight] = useState<DailyInsight | null>(null);
    const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

    useEffect(() => {
        const day = localDay();
        let cancelled = false;

        // Drop every other day's note, including any left by an older build.
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k?.startsWith('askchetna:daily-insight:') && k !== cacheKey(day)) {
                    localStorage.removeItem(k);
                }
            }
        } catch {
            /* Private mode or a full quota — the network path still works. */
        }

        const readCache = (): DailyInsight | null => {
            try {
                const cached = localStorage.getItem(cacheKey(day));
                if (!cached) return null;
                const parsed = JSON.parse(cached) as DailyInsight;
                return parsed?.headline && parsed?.body ? parsed : null;
            } catch {
                return null; // Corrupt entry or no storage — fetch instead.
            }
        };

        // Deliberately inside the async body, not the effect body: setting state
        // synchronously while the effect runs is what react-hooks/set-state-in-effect
        // objects to, and the fix costs one microtask before paint rather than a
        // request.
        (async () => {
            const cached = readCache();
            if (cached) {
                if (!cancelled) { setInsight(cached); setState('ready'); }
                return; // Already have today's. No request at all.
            }
            try {
                const res = await fetch('/api/ai/daily-insight', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ date: day }),
                });
                if (!res.ok) {
                    if (!cancelled) setState('unavailable');
                    return;
                }
                const data = await res.json();
                if (cancelled || !data?.insight) return;
                setInsight(data.insight);
                setState('ready');
                try {
                    localStorage.setItem(cacheKey(day), JSON.stringify(data.insight));
                } catch {
                    /* Not being able to cache is not a reason to hide the note. */
                }
            } catch {
                if (!cancelled) setState('unavailable');
            }
        })();

        return () => { cancelled = true; };
    }, []);

    // Silent when there is nothing to say — no chart yet, or the model is down.
    // A card explaining its own absence is worse than no card.
    if (state === 'unavailable') return null;

    if (state === 'loading') {
        return (
            <section className={`${styles.card} papered`} aria-busy="true" aria-label="Reading today">
                <div className={styles.shimmerLine} style={{ width: '45%' }} />
                <div className={styles.shimmerLine} style={{ width: '92%' }} />
                <div className={styles.shimmerLine} style={{ width: '78%' }} />
            </section>
        );
    }

    if (!insight) return null;

    return (
        <section className={`${styles.card} papered`}>
            <span className={styles.eyebrow}>
                <Sunrise size={13} aria-hidden="true" /> Today, for you
            </span>
            <h3 className={styles.headline}>{insight.headline}</h3>
            <p className={styles.body}>{insight.body}</p>

            <div className={styles.notes}>
                <p className={styles.note}>
                    <Compass size={14} aria-hidden="true" className={styles.noteIcon} />
                    <span><strong>Focus.</strong> {insight.focus}</span>
                </p>
                <p className={styles.note}>
                    <Eye size={14} aria-hidden="true" className={styles.noteIcon} />
                    <span><strong>Notice.</strong> {insight.caution}</span>
                </p>
            </div>
        </section>
    );
}
