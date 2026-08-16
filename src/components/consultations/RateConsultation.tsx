'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import styles from './RateConsultation.module.css';

const MAX_WORDS = 50;

const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

/**
 * Asked once, when a consultation ends.
 *
 * Placed in the ended state rather than offered mid-session: rating a
 * conversation while it is still happening rates something that has not
 * finished, and interrupting a paid session to ask for feedback spends the
 * seeker's time on the product's needs.
 *
 * Stars submit on their own. Requiring prose is how a review list fills up with
 * "good" fifty times, and someone who wants to say more can — but the rating is
 * complete without it.
 */
export default function RateConsultation({
    consultationId,
    astrologerName,
}: {
    consultationId: string;
    astrologerName: string;
}) {
    const [stars, setStars] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);

    // Someone returning to an ended session should see what they already said,
    // not a blank form implying they never answered.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/consultations/${consultationId}/rating`);
                if (!res.ok) return;
                const { rating } = await res.json();
                if (cancelled || !rating) return;
                setStars(rating.stars);
                setFeedback(rating.feedback ?? '');
                setSaved(true);
            } catch {
                // A failed read just means an empty form.
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [consultationId]);

    const words = countWords(feedback);
    const overLimit = words > MAX_WORDS;

    const submit = async (value: number) => {
        if (saving || overLimit) return;
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/consultations/${consultationId}/rating`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stars: value, feedback }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? 'Could not save that. Try again.');
                return;
            }
            setSaved(true);
        } catch {
            setError('Could not save that. Check your connection.');
        } finally {
            setSaving(false);
        }
    };

    if (!loaded) return null;

    return (
        <section className={styles.card} aria-labelledby="rate-heading">
            <h3 className={styles.heading} id="rate-heading">
                {saved ? 'Thank you — your feedback is saved' : `How was your session with ${astrologerName}?`}
            </h3>

            <div className={styles.stars} role="radiogroup" aria-label="Rating out of 5">
                {[1, 2, 3, 4, 5].map((n) => {
                    const filled = (hovered || stars) >= n;
                    return (
                        <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={stars === n}
                            aria-label={`${n} star${n === 1 ? '' : 's'}`}
                            className={`${styles.star} ${filled ? styles.starOn : ''}`}
                            onMouseEnter={() => setHovered(n)}
                            onMouseLeave={() => setHovered(0)}
                            onClick={() => {
                                setStars(n);
                                void submit(n);
                            }}
                            disabled={saving}
                        >
                            <Star size={26} fill={filled ? 'currentColor' : 'none'} />
                        </button>
                    );
                })}
            </div>

            {stars > 0 && (
                <>
                    <label className={styles.label} htmlFor="rate-feedback">
                        Anything you want to add? <span className={styles.optional}>Optional</span>
                    </label>
                    <textarea
                        id="rate-feedback"
                        className={styles.textarea}
                        value={feedback}
                        onChange={(e) => {
                            setFeedback(e.target.value);
                            setSaved(false);
                        }}
                        placeholder="What helped, or what did not."
                        rows={3}
                    />

                    <div className={styles.footer}>
                        {/* Counts DOWN. "12 of 50" makes someone do the
                            subtraction; "38 words left" is the number they
                            actually want. */}
                        <span className={`${styles.count} ${overLimit ? styles.countOver : ''}`}>
                            {overLimit
                                ? `${words - MAX_WORDS} word${words - MAX_WORDS === 1 ? '' : 's'} over`
                                : `${MAX_WORDS - words} word${MAX_WORDS - words === 1 ? '' : 's'} left`}
                        </span>
                        <button
                            type="button"
                            className={styles.save}
                            onClick={() => void submit(stars)}
                            disabled={saving || overLimit}
                        >
                            {saving ? 'Saving…' : saved ? 'Saved' : 'Save feedback'}
                        </button>
                    </div>
                </>
            )}

            {error && <p className={styles.error}>{error}</p>}
        </section>
    );
}
