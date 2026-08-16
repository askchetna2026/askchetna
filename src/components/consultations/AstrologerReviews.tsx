'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Star, X } from 'lucide-react';
import styles from './AstrologerReviews.module.css';

type Payload = {
    average: number | null;
    count: number;
    distribution: Record<string, number>;
    feedback: { id: string; stars: number; feedback: string; at: string }[];
};

/**
 * What people said about one astrologer.
 *
 * A sheet rather than an expanding card: a directory is a list you scan, and a
 * card that grows by twenty reviews pushes every other astrologer off the
 * screen while you read about one.
 *
 * No names against reviews. They were written about private consultations, and
 * attaching an identity to them on a page anyone can read is not something
 * someone agreed to by rating a session.
 */
export default function AstrologerReviews({
    astrologerId,
    astrologerName,
    onClose,
}: {
    astrologerId: string;
    astrologerName: string;
    onClose: () => void;
}) {
    const [data, setData] = useState<Payload | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/astrologers/${astrologerId}/ratings`);
                if (!res.ok) return;
                const json = await res.json();
                if (!cancelled) setData(json);
            } catch (err) {
                console.error('Failed to load ratings:', err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [astrologerId]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={styles.overlay}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`Ratings for ${astrologerName}`}
        >
            <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
                <header className={styles.head}>
                    <h2 className={styles.title}>{astrologerName}</h2>
                    <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </header>

                <div className={styles.body}>
                    {!data && <p className={styles.muted}>Loading…</p>}

                    {data && (
                        <>
                            <div className={styles.summary}>
                                <span className={styles.average}>
                                    {data.average?.toFixed(1) ?? '—'}
                                </span>
                                <div>
                                    <div className={styles.summaryStars} aria-hidden="true">
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <Star
                                                key={n}
                                                size={15}
                                                fill={data.average && data.average >= n - 0.5 ? 'currentColor' : 'none'}
                                            />
                                        ))}
                                    </div>
                                    <span className={styles.summaryCount}>
                                        {data.count} rating{data.count === 1 ? '' : 's'}
                                    </span>
                                </div>
                            </div>

                            {/* Highest first, so the shape of the distribution
                                reads the way people expect a rating breakdown to. */}
                            <ul className={styles.bars}>
                                {[5, 4, 3, 2, 1].map((n) => {
                                    const c = data.distribution[String(n)] ?? 0;
                                    const pct = data.count ? Math.round((c / data.count) * 100) : 0;
                                    return (
                                        <li key={n} className={styles.barRow}>
                                            <span className={styles.barLabel}>{n}</span>
                                            <span className={styles.barTrack}>
                                                <span className={styles.barFill} style={{ width: `${pct}%` }} />
                                            </span>
                                            <span className={styles.barCount}>{c}</span>
                                        </li>
                                    );
                                })}
                            </ul>

                            {data.feedback.length === 0 ? (
                                <p className={styles.muted}>No written feedback yet.</p>
                            ) : (
                                <ul className={styles.reviews}>
                                    {data.feedback.map((f) => (
                                        <li key={f.id} className={styles.review}>
                                            <div className={styles.reviewStars} aria-label={`${f.stars} of 5`}>
                                                {[1, 2, 3, 4, 5].map((n) => (
                                                    <Star
                                                        key={n}
                                                        size={12}
                                                        fill={f.stars >= n ? 'currentColor' : 'none'}
                                                        aria-hidden="true"
                                                    />
                                                ))}
                                                <time className={styles.reviewDate} dateTime={f.at}>
                                                    {new Date(f.at).toLocaleDateString('en-US', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </time>
                                            </div>
                                            <p className={styles.reviewBody}>{f.feedback}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
