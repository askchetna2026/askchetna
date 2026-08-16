'use client';

import { useState, useEffect } from 'react';
import styles from './EnergyWidget.module.css';

interface TransitInfo {
    transit: string;
    theme: string;
    prompt: string;
    description?: string;
    error?: string;
}

/** Only the muhurtas are read here; the rest of the panchang lives on /today. */
interface PanchangInfo {
    muhurtas?: {
        rahuKaalam: { start: string; end: string };
        abhijit: { start: string; end: string };
    };
}

const timeOnly = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

export default function EnergyWidget() {
    const [data, setData] = useState<TransitInfo | null>(null);
    const [muhurtas, setMuhurtas] = useState<PanchangInfo['muhurtas'] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/astrology/transit')
            .then(async res => {
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.details || errorData.error || `Transit fetch failed (${res.status})`);
                }
                return res.json();
            })
            .then(transitData => {
                if (transitData.error) throw new Error(transitData.error);
                setData(transitData);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch transits:', err.message);
                setLoading(false);
            });
    }, []);

    // Separate call, because these two answers have different shapes: the sky
    // above is the same for everyone and cached globally, while Rahu Kaal is a
    // function of sunrise at ONE place and cannot be shared.
    //
    // This block used to come from the transit route, which had no seeker and
    // so no coordinates — it returned a weekday lookup table that disagreed
    // with the figure /today showed the same person on the same day.
    //
    // A 401 or a missing profile just means no block. It is not an error worth
    // reporting: signed out, or not yet onboarded, are ordinary states.
    useEffect(() => {
        let cancelled = false;
        fetch('/api/astrology/panchang')
            .then(res => (res.ok ? res.json() : null))
            .then((panchang: PanchangInfo | null) => {
                if (!cancelled && panchang?.muhurtas) setMuhurtas(panchang.muhurtas);
            })
            .catch(() => {
                // Nothing to show, which is the correct outcome.
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div className={styles.widget}>
                <div className={styles.shimmer}></div>
            </div>
        );
    }

    if (!data || !data.transit) return null;

    return (
        <div className={styles.widget}>
            <div className={styles.badge}>Today&apos;s Energy</div>
            <div className={styles.content}>
                <div className={styles.iconWrapper}>
                    <div className={styles.moonIcon}></div>
                </div>
                <div className={styles.textGroup}>
                    <h3 className={styles.transit}>{data.transit}</h3>
                    <p className={styles.theme}>{data.theme}</p>
                </div>
            </div>

            {data.description && (
                <div className={styles.description}>
                    <p>{data.description}</p>
                </div>
            )}

            <div className={styles.divider}></div>
            <p className={styles.prompt}>&ldquo;{data.prompt}&rdquo;</p>

            {/* Computed from real sunrise and sunset at the profile's own
                coordinates, so this agrees with /today. Renders nothing at all
                when there is no profile to compute it from — an absent window
                is honest, a guessed one is not. */}
            {muhurtas && (
                <>
                    <div className={styles.divider}></div>
                    <div className={styles.vedicElements}>
                        <div className={styles.element}>
                            <span className={styles.elementLabel}>Abhijit Muhurta</span>
                            <span className={styles.elementValue}>
                                {timeOnly(muhurtas.abhijit.start)}–{timeOnly(muhurtas.abhijit.end)}
                            </span>
                        </div>
                        <div className={styles.element}>
                            <span className={styles.elementLabel}>Rahu Kaal</span>
                            <span className={styles.elementValue}>
                                {timeOnly(muhurtas.rahuKaalam.start)}–{timeOnly(muhurtas.rahuKaalam.end)}
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
