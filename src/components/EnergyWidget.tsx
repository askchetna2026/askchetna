'use client';

import { useState, useEffect } from 'react';
import styles from './EnergyWidget.module.css';

interface TransitInfo {
    transit: string;
    theme: string;
    prompt: string;
    description?: string;
    luckyColor?: string;
    luckyNumber?: number;
    auspiciousTime?: string;
    rahuKaal?: string;
    error?: string;
}

export default function EnergyWidget() {
    const [data, setData] = useState<TransitInfo | null>(null);
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
            <p className={styles.prompt}>"{data.prompt}"</p>

            {(data.luckyColor || data.luckyNumber || data.auspiciousTime || data.rahuKaal) && (
                <>
                    <div className={styles.divider}></div>
                    <div className={styles.vedicElements}>
                        {data.luckyColor && (
                            <div className={styles.element}>
                                <span className={styles.elementLabel}>Lucky Color</span>
                                {/* The colour is SHOWN, not painted onto the word.
                                    This used to set `color` to the colour itself, which
                                    is unreadable for most of the values the API returns:
                                    against the card, Yellow measured 1.06:1, White 1.14,
                                    Silver 1.08, Gold 1.20, Red 2.38, Green 3.06 — only
                                    Purple (5.60) cleared 4.5:1, so six days in seven the
                                    word was invisible. A swatch carries the hue and the
                                    label keeps a legible ink. The swatch has its own
                                    border so a white or yellow chip still has an edge
                                    on parchment. */}
                                <span className={styles.elementValue}>
                                    <span
                                        className={styles.swatch}
                                        style={{ background: data.luckyColor.toLowerCase() }}
                                        aria-hidden="true"
                                    />
                                    {data.luckyColor}
                                </span>
                            </div>
                        )}
                        {data.luckyNumber && (
                            <div className={styles.element}>
                                <span className={styles.elementLabel}>Lucky Number</span>
                                <span className={styles.elementValue}>{data.luckyNumber}</span>
                            </div>
                        )}
                        {data.auspiciousTime && (
                            <div className={styles.element}>
                                <span className={styles.elementLabel}>Auspicious Time</span>
                                <span className={styles.elementValue}>{data.auspiciousTime}</span>
                            </div>
                        )}
                        {data.rahuKaal && (
                            <div className={styles.element}>
                                <span className={styles.elementLabel}>Rahu Kaal</span>
                                <span className={styles.elementValue}>{data.rahuKaal}</span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
