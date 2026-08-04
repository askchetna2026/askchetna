'use client';

import Image from 'next/image';
import styles from './Masthead.module.css';

/**
 * The illustrated banner that opens the homepage.
 *
 * Two layers, deliberately: a drawn plate that never changes, and a sky that
 * does. The illustration is static art — multiplied onto the page so its cream
 * ground dissolves into the paper rather than sitting in a box — and the zodiac
 * ring above it is generated, so the wheel actually turns.
 *
 * The ring geometry is pinned to the artwork's own coordinate space (the
 * portrait medallion is centred at 702,365 in the 1408x768 plate), so the SVG
 * shares the image's viewBox and scales with it rather than being positioned
 * separately and drifting at other widths.
 */

/** Portrait centre and radii, in the plate's own 1408x768 coordinates. */
const CX = 702;
const CY = 365;
const R_RASHI = 214;
const R_NAKSHATRA = 236;

/**
 * Trig output, rounded before it reaches an attribute.
 *
 * Math.sin/cos are not required to be bit-identical across engines, and they
 * are not: Node rendered 171.87633495607022 where the browser produced
 * ...025. React compares the two strings during hydration, finds them
 * different, and logs a mismatch on every homepage load. Three decimals is
 * far finer than a 1408-unit viewBox can show and is stable everywhere.
 */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

function ringMarks() {
  const spokes = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const inner = { x: r3(CX + Math.cos(a) * (R_RASHI - 9)), y: r3(CY + Math.sin(a) * (R_RASHI - 9)) };
    const outer = { x: r3(CX + Math.cos(a) * (R_RASHI + 9)), y: r3(CY + Math.sin(a) * (R_RASHI + 9)) };
    spokes.push(
        <g key={i}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />
            <path
                d={`M0 -5 Q1.1 -1.1 5 0 Q1.1 1.1 0 5 Q-1.1 1.1 -5 0 Q-1.1 -1.1 0 -5 Z`}
                transform={`translate(${outer.x} ${outer.y})`}
                fill="currentColor"
                stroke="none"
            />
        </g>
    );
  }
  return spokes;
}

function nakshatraDots() {
  // 27 lunar mansions, so the outer ring says something rather than decorating.
  return Array.from({ length: 27 }, (_, i) => {
    const a = (i / 27) * Math.PI * 2;
    return (
        <circle
            key={i}
            cx={r3(CX + Math.cos(a) * R_NAKSHATRA)}
            cy={r3(CY + Math.sin(a) * R_NAKSHATRA)}
            r={i % 3 ? 1.6 : 3}
            fill="currentColor"
            stroke="none"
            opacity={i % 3 ? 0.45 : 0.75}
        />
    );
  });
}

export default function Masthead() {
    return (
        <header className={styles.masthead}>
            <div className={styles.plate}>
                <Image
                    className={styles.art}
                    src="/art/banner/masthead.png"
                    alt=""
                    width={1408}
                    height={768}
                    priority
                    sizes="(max-width: 1100px) 100vw, 1080px"
                />

                <svg
                    className={styles.ring}
                    viewBox="0 0 1408 768"
                    preserveAspectRatio="xMidYMid meet"
                    aria-hidden="true"
                >
                    {/* Two rates, opposite directions — one speed reads as a spinning
                        graphic, two read as orbital. */}
                    <g className={styles.rashiRing} fill="none" stroke="currentColor" strokeWidth={1.3}>
                        <circle cx={CX} cy={CY} r={R_RASHI} opacity={0.62} />
                        {ringMarks()}
                    </g>
                    <g className={styles.nakshatraRing}>{nakshatraDots()}</g>
                </svg>

                <p className={styles.wordmark}>AskChetna</p>
            </div>

            <p className={styles.tagline}>Jyotiṣa · Patterns, not predictions</p>
        </header>
    );
}
