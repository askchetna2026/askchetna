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
                <h1 className="mystic-text">Good times today</h1>
                <p className={styles.standfirst}>
                    Pick what you are about to do, and this shows you the better and worse
                    hours for it today.
                </p>
                <details className={styles.explainer}>
                    <summary>How this works, in plain English</summary>
                    <p>
                        Indian tradition splits the daylight — sunrise to sunset — into eight
                        equal stretches, and gives each one a name and a character. Which name
                        lands on which stretch depends on the day of the week, so Monday&rsquo;s
                        pattern is different from Tuesday&rsquo;s.
                    </p>
                    <p>
                        Three of the eight are considered good, one is for anything on the move,
                        and three are usually avoided. Because it all counts from sunrise, the
                        times shift a little every day and depend on where you are — which is
                        why this is worked out from your own location rather than a fixed
                        timetable.
                    </p>
                    <p>
                        There are also two stretches most people avoid regardless, called Rahu
                        Kaalam and Yamaganda. They follow a different rule, so a window can be
                        good by one count and best avoided by the other. Where that happens,
                        both are shown rather than one being quietly picked.
                    </p>
                </details>
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
                                The Moon sits in <strong>{data.nakshatra}</strong> today, which the
                                tradition calls a {data.category.toLowerCase()} one.{' '}
                                {data.categoryNote}
                                {data.categorySuits === false && (
                                    <> That is not the character this particular thing suits, so
                                    weigh it against the hours below rather than either on its own.</>
                                )}
                            </p>
                        )}
                        <p className={styles.abhijit}>
                            There is also a short stretch around midday —{' '}
                            {clock(data.abhijit.start)} to {clock(data.abhijit.end)} — called
                            Abhijit, which tradition treats as open for almost anything whatever
                            else the day holds.
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
                        Picking a good hour does not make a thing work. This is a custom about
                        when to start, and the most it honestly offers is one less reason to
                        hesitate. If you have to act at a bad hour, act — nothing here is a
                        reason to put off something that matters.
                    </p>

                    <p className={styles.method}>
                        The method is called Choghadiya, and it is arithmetic rather than
                        opinion: sunrise to sunset split into eight, named by the weekday. Every
                        time on this page is worked out for your own location, so two people in
                        different cities see different hours on the same day.{' '}
                        <Link href="/how-we-calculate">How we calculate</Link>.
                    </p>

                    <DisclaimerNote />
                </>
            )}
        </main>
    );
}
