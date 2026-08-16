'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Loader2, Sunrise, Sunset } from 'lucide-react';
import { INTENTIONS } from '@/lib/astrology/muhurat';
import type { IntentionKey, MuhuratWindow, NakshatraCategory } from '@/lib/astrology/muhurat';
import DisclaimerNote from '@/components/DisclaimerNote';
import styles from './MuhuratContent.module.css';

interface Payload {
    intention: { key: string; label: string; blurb: string };
    date: string;
    sunrise: string;
    sunset: string;
    abhijit: { start: string; end: string };
    nakshatra: string | null;
    category: NakshatraCategory | null;
    categoryNote: string | null;
    categorySuits: boolean | null;
    windows: MuhuratWindow[];
}

const clock = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * Pick what you are about to do; see today's windows for it.
 *
 * Windows that suit the intention are marked, windows that clash with Rahu
 * Kaalam or Yamaganda are marked, and a window can be BOTH — the two
 * conventions take no notice of each other. Showing that rather than resolving
 * it is the honest presentation: the disagreement is a fact about the
 * tradition, and picking a winner would invent a precision that is not there.
 */
export default function MuhuratContent() {
    const { status } = useSession();
    const [intention, setIntention] = useState<IntentionKey>('begin');
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
                const res = await fetch(`/api/astrology/muhurat?intention=${intention}`);
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

        return () => { cancelled = true; };
    }, [status, intention]);

    const now = Date.now();

    return (
        <main className={styles.page}>
            <header className={styles.head}>
                <p className="cosmic-label">Muhurta · Choosing a time</p>
                <h1 className="mystic-text">When to begin</h1>
                <p className={styles.standfirst}>
                    Pick what you are about to do. The windows below are today&rsquo;s, worked
                    out from sunrise at your own location — the daylight span divided into
                    eight, each part taking its character from the weekday rotation.
                </p>
            </header>

            <nav className={styles.intentions} aria-label="What are you doing">
                {INTENTIONS.map((i) => (
                    <button
                        key={i.key}
                        type="button"
                        className={`${styles.intention} ${i.key === intention ? styles.intentionOn : ''}`}
                        aria-pressed={i.key === intention}
                        onClick={() => setIntention(i.key)}
                    >
                        <span className={styles.intentionLabel}>{i.label}</span>
                        <span className={styles.intentionBlurb}>{i.blurb}</span>
                    </button>
                ))}
            </nav>

            {status === 'unauthenticated' && (
                <div className={styles.gate}>
                    <p>Windows depend on sunrise where you are, so this needs your location.</p>
                    <Link href="/login" className={styles.gateBtn}>Sign in</Link>
                </div>
            )}

            {error === 'NO_PROFILE' && (
                <div className={styles.gate}>
                    <p>Add your birth details — the location is what sets sunrise.</p>
                    <Link href="/onboarding" className={styles.gateBtn}>Add birth details</Link>
                </div>
            )}

            {error === 'FAILED' && (
                <p className={styles.state}>Could not work that out just now. Please refresh.</p>
            )}

            {loading && (
                <p className={styles.state}>
                    <Loader2 size={16} className="animate-spin" /> Working out today&rsquo;s windows…
                </p>
            )}

            {data && !loading && !error && (
                <>
                    <section className={styles.day}>
                        <p className={styles.sunLine}>
                            <Sunrise size={15} aria-hidden="true" /> {clock(data.sunrise)}
                            <span className={styles.sunGap} />
                            <Sunset size={15} aria-hidden="true" /> {clock(data.sunset)}
                        </p>
                        {data.nakshatra && data.category && (
                            <p className={styles.nakshatra}>
                                Today runs under <strong>{data.nakshatra}</strong> —{' '}
                                {data.category.toLowerCase()}. {data.categoryNote}
                                {data.categorySuits === false && (
                                    <> That is not among the characters this suits, which is worth
                                    weighing against the windows below.</>
                                )}
                            </p>
                        )}
                        <p className={styles.abhijit}>
                            Abhijit muhurta: {clock(data.abhijit.start)}–{clock(data.abhijit.end)}.
                            Traditionally open for almost anything, whatever else the day holds.
                        </p>
                    </section>

                    <ul className={styles.windows}>
                        {data.windows.map((w) => {
                            const past = Date.parse(w.end) < now;
                            const active = Date.parse(w.start) <= now && now < Date.parse(w.end);
                            return (
                                <li
                                    key={w.start}
                                    className={[
                                        styles.window,
                                        styles[w.quality],
                                        w.suits ? styles.suits : '',
                                        past ? styles.past : '',
                                        active ? styles.active : '',
                                    ].filter(Boolean).join(' ')}
                                >
                                    <div className={styles.windowHead}>
                                        <span className={styles.windowTime}>
                                            {clock(w.start)}–{clock(w.end)}
                                        </span>
                                        <span className={styles.windowName}>{w.name}</span>
                                        {active && <span className={styles.now}>Now</span>}
                                    </div>

                                    <p className={styles.windowChar}>{w.character}</p>

                                    <div className={styles.flags}>
                                        {w.suits && (
                                            <span className={styles.suitFlag}>
                                                Suits {data.intention.label.toLowerCase()}
                                            </span>
                                        )}
                                        {w.clashes && (
                                            <span className={styles.clashFlag}>{w.clashReason}</span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    <p className={styles.caveat}>
                        A muhurat does not make things work. It is a convention about when to
                        begin, and the most it honestly offers is one less reason to hesitate.
                        If a window suits and the day does not, or the reverse, that is the two
                        conventions disagreeing — not a hidden answer.
                    </p>

                    <p className={styles.method}>
                        Choghadiya: the daylight span divided into eight from sunrise, each part
                        labelled by the weekday rotation. Rahu Kaalam and Yamaganda are marked
                        where they overlap. <Link href="/how-we-calculate">How we calculate</Link>.
                    </p>

                    <DisclaimerNote />
                </>
            )}
        </main>
    );
}
