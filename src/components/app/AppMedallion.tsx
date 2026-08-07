'use client';

import styles from './AppMedallion.module.css';

/**
 * The masthead portrait, cropped to a circle for portrait screens.
 *
 * The website's masthead is a 1408x768 landscape plate. On a 390pt phone that
 * plate arrives 3.5x wider than it is tall, so the drawn figure — the whole
 * point of the artwork — lands about 90px high with two thirds of the frame
 * given over to empty sky. Rather than commission a second illustration, this
 * scales the plate up and shows only the medallion, which is the part that was
 * composed as a circle in the first place.
 *
 * The crop numbers come from the plate's own coordinates: the portrait is
 * centred at (702, 365) and the nakshatra ring sits at r=236, so a 472-unit
 * square centred there is exactly the medallion. Expressed as ratios of the
 * rendered diameter, they hold at any size:
 *
 *     background-size:     1408/472,  768/472    = 2.9831,  1.6271
 *     background-position: -(702-236)/472, -(365-236)/472 = -0.9873, -0.2733
 *
 * The rings are redrawn here rather than reused from Masthead because they are
 * pinned to that component's viewBox; in a 100-unit square they are simpler and
 * a third of the markup.
 */

const CX = 50;
const CY = 50;
const R_RASHI = 45.3; // 214/472 * 100
const R_NAKSHATRA = 50; // 236/472 * 100

/** Rounded before it reaches an attribute — see Masthead for why this matters. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

function spokes() {
    return Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const x = r3(CX + Math.cos(a) * R_RASHI);
        const y = r3(CY + Math.sin(a) * R_RASHI);
        return (
            <path
                key={i}
                d="M0 -2.2 Q0.5 -0.5 2.2 0 Q0.5 0.5 0 2.2 Q-0.5 0.5 -2.2 0 Q-0.5 -0.5 0 -2.2 Z"
                transform={`translate(${x} ${y})`}
                fill="currentColor"
            />
        );
    });
}

function dots() {
    // 27 lunar mansions, so the outer ring says something rather than decorating.
    return Array.from({ length: 27 }, (_, i) => {
        const a = (i / 27) * Math.PI * 2;
        return (
            <circle
                key={i}
                cx={r3(CX + Math.cos(a) * R_NAKSHATRA)}
                cy={r3(CY + Math.sin(a) * R_NAKSHATRA)}
                r={i % 3 ? 0.5 : 0.95}
                fill="currentColor"
                opacity={i % 3 ? 0.45 : 0.8}
            />
        );
    });
}

export default function AppMedallion({ className = '' }: { className?: string }) {
    return (
        <div className={`${styles.medallion} ${className}`} aria-hidden="true">
            <div className={styles.halo} />
            <div className={styles.plate} />
            <svg className={styles.rings} viewBox="0 0 100 100">
                {/* Two rates, opposite directions — one speed reads as a spinning
                    graphic, two read as orbital. */}
                <g className={styles.rashiRing}>
                    <circle
                        cx={CX}
                        cy={CY}
                        r={R_RASHI}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={0.35}
                        opacity={0.55}
                    />
                    {spokes()}
                </g>
                <g className={styles.nakshatraRing}>{dots()}</g>
            </svg>
        </div>
    );
}
