'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { DOSHAS, DOSHA_CONTENT } from '@/lib/astrology/prakriti';
import type { Contribution, Dosha, PrakritiResult } from '@/lib/astrology/prakriti';
import styles from './PrakritiContent.module.css';

type Payload = PrakritiResult & { name?: string };

/**
 * Constitution, read from the chart, with the reading shown.
 *
 * The working is not an appendix here — it is the point. Deriving prakriti from
 * a chart rather than from assessment is a real practice and a contested one,
 * and the honest way to ship a contested method is to show every factor and
 * what it contributed, so a reader who holds a different table can see exactly
 * where they part company rather than being handed a verdict.
 */
export default function PrakritiContent() {
    const { status } = useSession();
    const [data, setData] = useState<Payload | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (status !== 'authenticated') return;
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch('/api/astrology/prakriti');
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    if (!cancelled) setError(body.code === 'PROFILE_MISSING' ? 'NO_PROFILE' : 'FAILED');
                    return;
                }
                const json = await res.json();
                if (!cancelled) setData(json);
            } catch {
                if (!cancelled) setError('FAILED');
            }
        })();

        return () => { cancelled = true; };
    }, [status]);

    const content = data ? DOSHA_CONTENT[data.primary] : null;

    return (
        <main className={styles.page}>
            <header className={styles.head}>
                <p className="cosmic-label">Prakriti · Constitution</p>
                <h1 className="mystic-text">Your natural pattern</h1>
                <p className={styles.standfirst}>
                    Vata, Pitta or Kapha — read from your rising sign, the graha that rules it,
                    your Moon, and anything standing in your first house. Every factor is shown
                    below, because this is one reading of the tradition and you should be able
                    to see how it was arrived at.
                </p>
            </header>

            {status === 'unauthenticated' && (
                <div className={styles.gate}>
                    <p>This is read from your birth chart, so it needs your details first.</p>
                    <Link href="/login" className={styles.gateBtn}>Sign in</Link>
                </div>
            )}

            {error === 'NO_PROFILE' && (
                <div className={styles.gate}>
                    <p>Add your birth details and this will be read from your chart.</p>
                    <Link href="/onboarding" className={styles.gateBtn}>Add birth details</Link>
                </div>
            )}

            {error === 'FAILED' && (
                <p className={styles.state}>Could not read that just now. Please refresh.</p>
            )}

            {status === 'authenticated' && !data && !error && (
                <p className={styles.state}>
                    <Loader2 size={16} className="animate-spin" /> Reading your chart…
                </p>
            )}

            {data && content && (
                <>
                    <section className={styles.verdict}>
                        <div className={styles.verdictHead}>
                            <span className={styles.doshaName}>{data.primary}</span>
                            <span className={styles.doshaSanskrit}>{DOSHA_CONTENT[data.primary].sanskrit}</span>
                        </div>

                        {/* A dual constitution is stated, not rounded away. The
                            tradition has always recognised them, and picking a
                            single winner from a one-point gap would invent a
                            precision the method does not have. */}
                        {data.dual && data.secondary && (
                            <p className={styles.dual}>
                                With <strong>{data.secondary}</strong> close behind — the two are
                                within a point of each other, which the tradition reads as a dual
                                constitution rather than a tie to be broken.
                            </p>
                        )}

                        <p className={styles.elements}>{content.elements}</p>
                        <p className={styles.summary}>{content.summary}</p>
                    </section>

                    <section className={styles.bars}>
                        {DOSHAS.map((d: Dosha) => {
                            const pct = data.total ? Math.round((data.scores[d] / data.total) * 100) : 0;
                            return (
                                <div key={d} className={styles.barRow}>
                                    <span className={styles.barLabel}>{d}</span>
                                    <span className={styles.barTrack}>
                                        <span
                                            className={`${styles.barFill} ${d === data.primary ? styles.barFillOn : ''}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </span>
                                    <span className={styles.barValue}>{pct}%</span>
                                </div>
                            );
                        })}
                    </section>

                    <section className={styles.block}>
                        <h2 className={styles.blockHead}>How you might recognise it</h2>
                        <ul className={styles.recognise}>
                            {content.recognise.map((line) => (
                                <li key={line}>{line}</li>
                            ))}
                        </ul>
                    </section>

                    <section className={styles.block}>
                        <h2 className={styles.blockHead}>When it is stretched</h2>
                        <p className={styles.body}>{content.whenStretched}</p>
                    </section>

                    <section className={styles.block}>
                        <h2 className={styles.blockHead}>How this was read</h2>
                        <ul className={styles.working}>
                            {data.contributions.map((c: Contribution, i) => (
                                <li key={`${c.factor}-${i}`} className={styles.contribution}>
                                    <div className={styles.contribHead}>
                                        <span className={styles.contribFactor}>{c.factor}</span>
                                        <span className={styles.contribPoints}>
                                            {c.found} → {c.dosha} +{c.points}
                                        </span>
                                    </div>
                                    <p className={styles.contribWhy}>{c.why}</p>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* The boundary, stated plainly and last, where it is read. */}
                    <p className={styles.boundary}>
                        This is a reflective frame, not a medical one. It does not diagnose
                        anything, it is not a substitute for an Ayurvedic practitioner, and
                        nothing here should inform a decision about your health. Ayurveda
                        normally establishes prakriti by assessment rather than from a chart —
                        this is the Jyotisa reading of the question, and practitioners differ on
                        whether a chart can settle it at all.
                    </p>
                </>
            )}
        </main>
    );
}
