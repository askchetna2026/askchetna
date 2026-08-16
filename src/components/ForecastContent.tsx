'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Loader2, Moon } from 'lucide-react';
import { HORIZONS } from '@/lib/astrology/forecast';
import type { ForecastResult, Horizon } from '@/lib/astrology/forecast';
import DisclaimerNote from '@/components/DisclaimerNote';
import styles from './ForecastContent.module.css';

type Payload = ForecastResult & { name?: string; moonSign?: string | null };

const LABEL: Record<Horizon, string> = {
    tomorrow: 'Tomorrow',
    week: 'This week',
    month: 'This month',
    year: 'This year',
};

const longDate = (iso: string) =>
    new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });

/**
 * What is actually ahead, with dates.
 *
 * Every line here is a calculation: a period boundary from the stored dasha
 * tree, or a slow planet reaching a sign edge. Nothing is generated, which is
 * why an empty window says "nothing turns over" rather than inventing a mood to
 * fill the space — a forecast that always has something to say is the tell that
 * it is not reading anything.
 */
export default function ForecastContent() {
    const { status } = useSession();
    const [horizon, setHorizon] = useState<Horizon>('week');
    const [data, setData] = useState<Payload | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status !== 'authenticated') return;

        let cancelled = false;
        setLoading(true);
        setError(null);

        (async () => {
            try {
                const res = await fetch(`/api/astrology/forecast?horizon=${horizon}`);
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    if (!cancelled) setError(body.code === 'PROFILE_MISSING' ? 'NO_PROFILE' : 'FAILED');
                    return;
                }
                const json = await res.json();
                if (!cancelled) setData(json);
            } catch {
                if (!cancelled) setError('FAILED');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [status, horizon]);

    return (
        <main className={styles.page}>
            <header className={styles.head}>
                <p className="cosmic-label">Agrima · What is ahead</p>
                <h1 className="mystic-text">Your horizons</h1>
                <p className={styles.standfirst}>
                    Not a horoscope. These are the dates your own chart turns over — when a
                    sub-period ends, when a slow planet reaches a new sign — taken from your
                    dasha tree and the actual sky.
                </p>
            </header>

            <nav className={styles.tabs} aria-label="Forecast horizon">
                {HORIZONS.map((h) => (
                    <button
                        key={h}
                        type="button"
                        className={`${styles.tab} ${h === horizon ? styles.tabOn : ''}`}
                        aria-pressed={h === horizon}
                        onClick={() => setHorizon(h)}
                    >
                        {LABEL[h]}
                    </button>
                ))}
            </nav>

            {status === 'unauthenticated' && (
                <div className={styles.gate}>
                    <p>These come from your birth chart, so they need your details first.</p>
                    <Link href="/login" className={styles.gateBtn}>Sign in</Link>
                </div>
            )}

            {error === 'NO_PROFILE' && (
                <div className={styles.gate}>
                    <p>Add your birth details and your horizons will be calculated.</p>
                    <Link href="/onboarding" className={styles.gateBtn}>Add birth details</Link>
                </div>
            )}

            {error === 'FAILED' && (
                <p className={styles.state}>Could not build that just now. Please refresh.</p>
            )}

            {(loading || (status === 'loading' && !data)) && (
                <p className={styles.state}>
                    <Loader2 size={16} className="animate-spin" /> Reading the sky…
                </p>
            )}

            {data && !loading && !error && (
                <>
                    <section className={styles.period}>
                        <p className={styles.periodLabel}>
                            {longDate(data.from)} — {longDate(data.to)}
                        </p>
                        {data.period.mahadasha && (
                            <p className={styles.periodBody}>
                                Running throughout: <strong>{data.period.mahadasha}</strong> mahadasha
                                {data.period.antardasha && (
                                    <>, <strong>{data.period.antardasha}</strong> sub-period</>
                                )}
                                .
                            </p>
                        )}
                        {data.moonSign && (
                            <p className={styles.moon}>
                                <Moon size={14} aria-hidden="true" /> Moon in {data.moonSign} today
                            </p>
                        )}
                    </section>

                    {data.events.length === 0 ? (
                        <div className={styles.quiet}>
                            <p>
                                Nothing turns over in this window. No period boundary, no slow
                                planet changing sign — the same conditions hold throughout.
                            </p>
                            <p className={styles.quietNote}>
                                That is a real answer, not a missing one. Most weeks are like this,
                                and a forecast that always finds something to announce is not
                                reading anything.
                            </p>
                        </div>
                    ) : (
                        <ol className={styles.events}>
                            {data.events.map((e, i) => (
                                <li key={`${e.date}-${e.kind}-${i}`} className={styles.event}>
                                    <time className={styles.eventDate} dateTime={e.date}>
                                        {longDate(e.date)}
                                    </time>
                                    <h2 className={styles.eventTitle}>{e.title}</h2>
                                    <p className={styles.eventDetail}>{e.detail}</p>
                                </li>
                            ))}
                        </ol>
                    )}

                    <p className={styles.method}>
                        Period boundaries come from your stored dasha tree; ingress dates are
                        found by searching the ephemeris to the day. Nothing on this page is
                        written by a model. <Link href="/timing">See the full timeline</Link>.
                    </p>

                    <DisclaimerNote />
                </>
            )}
        </main>
    );
}
