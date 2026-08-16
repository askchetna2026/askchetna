'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Check, Loader2, Minus } from 'lucide-react';
import { getProfiles, primaryProfile } from '@/lib/profileStore';
import { CONDITIONS } from '@/lib/astrology/conditions';
import type { YogaFinding } from '@/lib/astrology/conditions';
import DisclaimerNote from '@/components/DisclaimerNote';
import styles from './PatternsPageContent.module.css';

/**
 * Whether the well-known conditions apply, and what they actually mean.
 *
 * Every condition is listed whether or not it applies, and "does not apply" is
 * given the same visual weight as "applies" rather than being hidden or greyed
 * to the edge of legibility. Someone arriving from a search for "am I manglik"
 * is here for the negative answer at least as often as the positive one, and a
 * page that only speaks up when something is wrong teaches people to read
 * silence as bad news.
 *
 * The placements are shown before the reading in every card, because the
 * difference between this page and the ones it is competing with is that a
 * reader can check the verdict rather than take it on faith.
 */
export default function PatternsPageContent() {
    const { status } = useSession();
    const [findings, setFindings] = useState<YogaFinding[] | null>(null);
    const [name, setName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState<string | null>(null);

    useEffect(() => {
        if (status !== 'authenticated') return;

        let cancelled = false;
        (async () => {
            try {
                const payload = await getProfiles();
                const profile = primaryProfile(payload);
                if (!profile) {
                    if (!cancelled) setError('NO_PROFILE');
                    return;
                }

                const res = await fetch(`/api/astrology/conditions?profileId=${profile.id}`);
                if (!res.ok) {
                    if (!cancelled) setError('FAILED');
                    return;
                }

                const data = await res.json();
                if (cancelled) return;
                setFindings(Array.isArray(data.conditions) ? data.conditions : []);
                setName(typeof data.name === 'string' ? data.name : null);
            } catch {
                if (!cancelled) setError('FAILED');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [status]);

    return (
        <main className={styles.page}>
            <header className={styles.head}>
                <p className="cosmic-label">Yoga &amp; Dosha</p>
                <h1 className="mystic-text">The patterns people ask about</h1>
                <p className={styles.standfirst}>
                    Sade Sati, Mangal Dosha, Kala Sarpa. These are the terms most people meet
                    first, usually somewhere that wanted them worried. Here is whether each one
                    is actually present in your chart, which placements decide it, and what the
                    tradition says moderates it.
                </p>
            </header>

            {status === 'loading' && (
                <p className={styles.state}>
                    <Loader2 size={16} className="animate-spin" /> Reading your chart…
                </p>
            )}

            {status === 'unauthenticated' && (
                <div className={styles.gate}>
                    <p>
                        These depend on where the planets were when you were born, so they need
                        your birth details.
                    </p>
                    <Link href="/login" className={styles.gateBtn}>
                        Sign in to check your chart
                    </Link>
                </div>
            )}

            {error === 'NO_PROFILE' && (
                <div className={styles.gate}>
                    <p>Add your birth details and these will be calculated from your chart.</p>
                    <Link href="/onboarding" className={styles.gateBtn}>
                        Add birth details
                    </Link>
                </div>
            )}

            {error === 'FAILED' && (
                <p className={styles.state}>
                    Could not read your chart just now. Please refresh and try again.
                </p>
            )}

            {status === 'authenticated' && !findings && !error && (
                <p className={styles.state}>
                    <Loader2 size={16} className="animate-spin" /> Checking each condition…
                </p>
            )}

            {findings && (
                <>
                    {name && (
                        <p className={styles.forWhom}>
                            Calculated from <strong>{name}</strong>&rsquo;s chart.
                        </p>
                    )}

                    {/* Only what applies gets a card.
                        Absent conditions used to get one each, at full size,
                        explaining at length that they were not present — so a
                        chart with one condition running showed four cards of
                        "no". The negative answer still matters to someone who
                        arrived asking "am I manglik", so it survives as the one
                        line below rather than as four cards of clutter. */}
                    <ul className={styles.list}>
                        {findings.filter((f) => f.present).length === 0 && (
                            <li className={styles.noneCard}>
                                <h2 className={styles.title}>None of these are in your chart</h2>
                                <p className={styles.summary}>
                                    Sade Sati is not running, and none of the well-known doshas or
                                    yogas below are present. If you came here worried about one of
                                    them, that is the answer.
                                </p>
                            </li>
                        )}

                        {findings.filter((f) => f.present).map((f) => {
                            const content = CONDITIONS[f.key];
                            if (!content) return null;
                            const isOpen = open === f.key;

                            return (
                                <li
                                    key={f.key}
                                    className={`${styles.card} ${f.present ? styles.cardPresent : ''}`}
                                >
                                    <div className={styles.cardHead}>
                                        <div className={styles.titleGroup}>
                                            <h2 className={styles.title}>{content.title}</h2>
                                            <span className={styles.sanskrit}>{content.sanskrit}</span>
                                        </div>

                                        {/* Said in words as well as colour. A chip that
                                            relies on green-vs-grey alone is unreadable to
                                            anyone who cannot separate the two. */}
                                        <span
                                            className={`${styles.verdict} ${f.present ? styles.yes : styles.no}`}
                                        >
                                            {f.present ? <Check size={14} /> : <Minus size={14} />}
                                            {f.present
                                                ? f.phase
                                                    ? `Running — ${f.phase.toLowerCase()} phase`
                                                    : 'Present in your chart'
                                                : 'Not present in your chart'}
                                        </span>
                                    </div>

                                    <p className={styles.summary}>{content.summary}</p>

                                    {/* Before the reading, deliberately: the verdict should
                                        be checkable, not taken on trust. */}
                                    {f.factors.length > 0 && (
                                        <ul className={styles.factors}>
                                            {f.factors.map((factor) => (
                                                <li key={factor}>{factor}</li>
                                            ))}
                                        </ul>
                                    )}

                                    <p className={styles.reading}>
                                        {f.present ? content.whenPresent : content.whenAbsent}
                                    </p>

                                    <button
                                        type="button"
                                        className={styles.more}
                                        onClick={() => setOpen(isOpen ? null : f.key)}
                                        aria-expanded={isOpen}
                                    >
                                        {isOpen ? 'Show less' : 'What the tradition says'}
                                    </button>

                                    {isOpen && (
                                        <div className={styles.detail}>
                                            <h3 className={styles.detailHead}>Where it comes from</h3>
                                            <p>{content.tradition}</p>

                                            <h3 className={styles.detailHead}>How it is decided</h3>
                                            <p>{content.howItIsDecided}</p>

                                            <h3 className={styles.detailHead}>What moderates it</h3>
                                            <ul className={styles.moderators}>
                                                {content.moderatingFactors.map((m) => (
                                                    <li key={m}>{m}</li>
                                                ))}
                                            </ul>

                                            <p className={styles.caution}>{content.whyNotAVerdict}</p>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>

                    {/* One line, not four cards. Someone who searched a term
                        and does not find it above needs to know it was looked
                        at rather than left out. */}
                    {findings.some((f) => !f.present) && (
                        <p className={styles.alsoChecked}>
                            <strong>Also checked, and not present in your chart:</strong>{' '}
                            {findings
                                .filter((f) => !f.present)
                                .map((f) => CONDITIONS[f.key]?.title ?? f.name)
                                .join(', ')}
                            .
                        </p>
                    )}

                    <DisclaimerNote />
                </>
            )}
        </main>
    );
}
