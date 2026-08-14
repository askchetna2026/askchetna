'use client';

import { useEffect, useState } from 'react';
import { Moon } from 'lucide-react';
import { getZodiacSign } from '@/lib/astrology/zodiac';
import styles from './RashiBadge.module.css';

/** Sanskrit rashi names, in zodiac order, matching getZodiacSign's output. */
const RASHI_BY_SIGN: Record<string, string> = {
    Aries: 'Mesha', Taurus: 'Vrishabha', Gemini: 'Mithuna', Cancer: 'Karka',
    Leo: 'Simha', Virgo: 'Kanya', Libra: 'Tula', Scorpio: 'Vrischika',
    Sagittarius: 'Dhanu', Capricorn: 'Makara', Aquarius: 'Kumbha', Pisces: 'Meena',
};

/**
 * The seeker's rashi, under the welcome line.
 *
 * Rashi here is the MOON sign, not the sun sign — that is what "rashi" means in
 * Jyotisha, and using the western sun sign under a Sanskrit label would be
 * quietly wrong on the one page most likely to be screenshotted.
 *
 * Reads the stored chart. No ephemeris call: the moon's longitude was fixed at
 * birth and has been in Profile.chartData since the profile was made.
 */
export default function RashiBadge() {
    const [rashi, setRashi] = useState<{ sign: string; sanskrit: string } | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch('/api/profiles/active');
                if (!res.ok) return;
                const data = await res.json();
                const chart = data?.profiles?.[0]?.chartData;
                const moon = chart?.planets?.Moon?.longitude;
                if (cancelled || typeof moon !== 'number') return;
                const sign = getZodiacSign(moon);
                setRashi({ sign, sanskrit: RASHI_BY_SIGN[sign] ?? sign });
            } catch {
                /* Silent — the welcome line reads fine without it. */
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (!rashi) return null;

    return (
        <span className={styles.badge}>
            <Moon size={13} aria-hidden="true" />
            <span className={styles.label}>Chandra Rashi</span>
            <span className={styles.value}>{rashi.sanskrit}</span>
            <span className={styles.western}>({rashi.sign})</span>
        </span>
    );
}
