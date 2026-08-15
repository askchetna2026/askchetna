'use client';

import { useEffect, useState } from 'react';
import { Compass } from 'lucide-react';
import styles from './ChartSignature.module.css';

interface PlanetAnalysis {
    planet: string;
    load: number;
    loadClassification: string;
    behaviourZone: string;
    dignityLabel: string;
    synthesis?: {
        theme?: string;
        acts_in?: string;
        feels_like?: string;
        challenge?: string;
        balances_with?: string;
    };
}

/**
 * What this chart emphasises, at the top of /chart.
 *
 * The page opened with sixteen grids and a birth record, and the first
 * interpretation anywhere on it was a BUTTON — "View Detailed Insights". Data
 * before meaning: a reader had to already know what a D9 was to find out what
 * their chart said.
 *
 * /api/astrology/analysis has been computed on every visit for a while — it is
 * what the AI prompts receive as context — and nothing on this page rendered
 * it. This composes it into prose deterministically, so there is no model call,
 * no cost and no latency beyond the fetch the route already memoises on
 * (profileId, updatedAt). A natal chart does not change, so neither does this.
 */
export default function ChartSignature({ profileId }: { profileId: string | null }) {
    const [analysis, setAnalysis] = useState<PlanetAnalysis[] | null>(null);
    const [yogas, setYogas] = useState<string[]>([]);

    useEffect(() => {
        if (!profileId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/astrology/analysis?profileId=${profileId}`);
                if (!res.ok) return;
                const data = await res.json();
                if (cancelled) return;
                setAnalysis(Array.isArray(data.analysis) ? data.analysis : null);
                setYogas(Array.isArray(data.yogas) ? data.yogas : []);
            } catch (err) {
                console.error('Failed to load chart signature:', err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [profileId]);

    if (!analysis?.length) return null;

    // The engine hands back comma-delimited lists ("self, personality,
    // physical identity"). Fine as data, but read aloud in a sentence the last
    // comma wants to be an "and".
    const listify = (v?: string) => {
        if (!v) return v;
        const parts = v.split(',').map((x) => x.trim()).filter(Boolean);
        if (parts.length < 2) return v;
        return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
    };

    // The planet the rest of the chart leans on hardest. `load` counts the
    // influences and pressures on a placement, so the maximum is the closest
    // thing this engine has to "where the chart concentrates".
    const focus = analysis.reduce((a, b) => (b.load > a.load ? b : a));
    const s = focus.synthesis ?? {};

    return (
        <section className={`${styles.card} sacred-card`} aria-labelledby="chart-signature">
            <span className={styles.eyebrow}>
                <Compass size={13} aria-hidden="true" /> What your chart emphasises
            </span>

            <h2 className={styles.headline} id="chart-signature">
                {s.theme ? `${s.theme}, carried by ${focus.planet}` : `${focus.planet} carries the most`}
            </h2>

            <p className={styles.body}>
                More of your chart leans on <strong>{focus.planet}</strong> than on anything else
                {s.acts_in ? <>, and it acts in {listify(s.acts_in.toLowerCase())}</> : null}.
                {s.feels_like ? <> From the inside that tends to feel {listify(s.feels_like.toLowerCase())}.</> : null}
                {s.challenge ? <> {s.challenge.replace(/^./, (c) => c.toUpperCase())}.</> : null}
            </p>

            {/* No label above this one. The engine's own sentence already
                begins "The support of …, which this placement can lean on",
                so a "What it leans on" heading said the same thing twice. */}
            {s.balances_with && (
                <p className={styles.balance}>
                    {s.balances_with.replace(/\.?$/, '.')}
                </p>
            )}

            {/* Yogas are chart-level signatures rather than single placements,
                so they belong here rather than beside one planet. */}
            {yogas.length > 0 && (
                <ul className={styles.yogas}>
                    {yogas.slice(0, 3).map((y) => {
                        const [name, meaning] = y.split(' (');
                        return (
                            <li key={y} className={styles.yoga}>
                                <strong>{name}</strong>
                                {meaning ? (
                                    <span className={styles.yogaMeaning}>
                                        {meaning.replace(/\)$/, '').replace(/^[^-]*-\s*/, '')}
                                    </span>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
