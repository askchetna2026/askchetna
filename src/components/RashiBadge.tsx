'use client';

import { useEffect, useState } from 'react';
import { Moon } from 'lucide-react';
import { getZodiacSign } from '@/lib/astrology/zodiac';
import { getProfiles, primaryProfile, type ProfilesPayload } from '@/lib/profileStore';
import styles from './RashiBadge.module.css';

/** Sanskrit rashi names, in zodiac order, matching getZodiacSign's output. */
const RASHI_BY_SIGN: Record<string, string> = {
    Aries: 'Mesha', Taurus: 'Vrishabha', Gemini: 'Mithuna', Cancer: 'Karka',
    Leo: 'Simha', Virgo: 'Kanya', Libra: 'Tula', Scorpio: 'Vrischika',
    Sagittarius: 'Dhanu', Capricorn: 'Makara', Aquarius: 'Kumbha', Pisces: 'Meena',
};

interface Rashi { sign: string; sanskrit: string; profileName: string }

/**
 * The seeker's rashi, under the welcome line.
 *
 * Rashi is the MOON sign, not the sun sign — that is what the word means in
 * Jyotisha, and a western sun sign under a Sanskrit label would be quietly
 * wrong on the page most likely to be screenshotted.
 *
 * Comes from the shared profile store, so it paints from localStorage on any
 * visit after the first and costs no request at all. Nothing is recomputed: the
 * moon's longitude was fixed at birth and has been in the stored chart since
 * the profile was created.
 */
export default function RashiBadge() {
    const [rashi, setRashi] = useState<Rashi | null>(null);

    useEffect(() => {
        let cancelled = false;

        const derive = (data: ProfilesPayload | null): Rashi | null => {
            // The primary profile is the one every other screen defaults to.
            // If it somehow has no chart yet — a profile created before the
            // backfill, or one still being written — fall back to any profile
            // that does, rather than showing nothing at all.
            const primary = primaryProfile(data);
            const candidates = [...(primary ? [primary] : []), ...(data?.profiles ?? [])];
            for (const p of candidates) {
                const moon = p.chartData?.planets?.Moon?.longitude;
                if (typeof moon !== 'number' || Number.isNaN(moon)) continue;
                const sign = getZodiacSign(((moon % 360) + 360) % 360);
                if (!sign) continue;
                return { sign, sanskrit: RASHI_BY_SIGN[sign] ?? sign, profileName: p.name };
            }
            return null;
        };

        (async () => {
            const data = await getProfiles((fresh) => {
                if (cancelled) return;
                const next = derive(fresh);
                if (next) setRashi(next);
            });
            if (cancelled) return;
            const next = derive(data);
            if (next) setRashi(next);
        })();

        return () => { cancelled = true; };
    }, []);

    if (!rashi) return null;

    return (
        <span className={styles.badge} title={`Moon sign for ${rashi.profileName}`}>
            <Moon size={13} aria-hidden="true" />
            <span className={styles.label}>Chandra Rashi</span>
            <span className={styles.value}>{rashi.sanskrit}</span>
            <span className={styles.western}>({rashi.sign})</span>
        </span>
    );
}
