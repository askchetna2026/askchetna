'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Loader2, Moon } from 'lucide-react';
import { HORIZONS } from '@/lib/astrology/forecast';
import type { ForecastResult, Horizon } from '@/lib/astrology/forecast';
import type { Observance } from '@/lib/astrology/calendar';
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
    const [calendar, setCalendar] = useState<Observance[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetched once, not per horizon: the lunar calendar does not change when
    // the reader switches between "this week" and "this year".
    useEffect(() => {
        if (status !== 'authenticated') return;
        let cancelled = false;
        fetch('/api/astrology/calendar')
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                if (!cancelled && json?.observances) setCalendar(json.observances);
            })
            .catch(() => {
                // No calendar is an acceptable outcome; the forecast stands alone.
            });
        return () => { cancelled = true; };
    }, [status]);

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
                <h1 className="mystic-text">What&rsquo;s coming up</h1>
                <p className={styles.standfirst}>
                    The dates something actually changes in your chart — not a horoscope, and
                    not written for your star sign. If nothing changes in the window you pick,
                    this page says so.
                </p>
                {/* Open by default: the explanation is the point of the
                    section, and a reader who already knows it can fold it away.
                    "In plain English" was the INSTRUCTION for writing this, never
                    a label for readers — as a title it quietly told them the rest
                    of the page might not be. */}
                <details className={styles.explainer} open>
                    <summary>How this works</summary>
                    <p>
                        Indian astrology divides a life into long chapters, each governed by one
                        planet. A chapter can run for six years or twenty, and inside it are
                        shorter stretches governed by other planets — so at any moment you are
                        in a big chapter and a smaller one inside it. Those are worked out from
                        exactly where the Moon was when you were born, so they are yours and
                        nobody else&rsquo;s.
                    </p>
                    <p>
                        Separately, the slow-moving planets — Saturn, Jupiter and the two points
                        called Rahu and Ketu — cross from one sign into the next every year or
                        few. Those crossings are the same for everybody, but which part of
                        <em> your</em> life they touch depends on your own chart.
                    </p>
                    <p>
                        This page lists both, with dates. That is all it does. Nothing here is
                        written by the AI, and nothing predicts an event — a date tells you when
                        conditions shift, not what will happen to you on it.
                    </p>
                </details>
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
                                Throughout this window you are in your{' '}
                                <strong>{data.period.mahadasha}</strong> chapter
                                {data.period.antardasha && (
                                    <>, and within it a shorter <strong>{data.period.antardasha}</strong>{' '}
                                    stretch</>
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

                    {/* The lunar calendar, here rather than on a page of its
                        own. A festival directory is a different product; what
                        belongs beside a forecast is the handful of days a
                        practising person already watches for. */}
                    {calendar && calendar.length > 0 && (
                        <section className={styles.calendar}>
                            <h2 className={styles.calendarHead}>Days ahead</h2>
                            <ul className={styles.observances}>
                                {calendar.map((o, i) => (
                                    <li key={`${o.kind}-${o.date}-${i}`} className={styles.observance}>
                                        <time className={styles.obsDate} dateTime={o.date}>
                                            {longDate(o.date)}
                                        </time>
                                        <span className={styles.obsName}>{o.name}</span>
                                        <span className={styles.obsDetail}>{o.detail}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className={styles.calendarNote}>
                                Computed from the Sun and Moon at your coordinates, so these hold
                                in any year. Named festivals are not listed: they depend on the
                                lunar month, which is reckoned differently across India and needs
                                a rule reviewed by someone qualified before it goes on a screen.
                            </p>
                        </section>
                    )}

                    <p className={styles.method}>
                        Chapter dates come from your own birth chart. Planet crossings are found
                        by checking the real positions of the planets, day by day, until the
                        date they change sign. Nothing on this page is written by the AI.{' '}
                        <Link href="/timing">See your whole life timeline</Link>.
                    </p>

                    <DisclaimerNote />
                </>
            )}
        </main>
    );
}
