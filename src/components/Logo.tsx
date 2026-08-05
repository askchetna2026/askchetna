'use client';

import { useId } from 'react';

/**
 * The horizontal lockup: emblem plus wordmark.
 *
 * There is ONE theme. This used to detect `data-theme`, watch it with a
 * MutationObserver, and fall back to `prefers-color-scheme` — carrying a whole
 * light-on-dark palette for a dark theme that no longer exists in globals.css.
 * Worse, it defaulted to that palette, so the first paint drew pale gold and
 * #DFE0FF ink on parchment at roughly 1.2:1 until the effect corrected it.
 *
 * `onDark` is kept in the signature because it is a reasonable thing to want,
 * but no caller passes it today and the header is `var(--background)`.
 *
 * Colours are literal rather than `var(...)`: these land in SVG gradient stops,
 * where variable support is inconsistent enough not to rely on. They mirror
 * --accent-gold-decor / --accent-gold-dim / --foreground.
 */
export default function Logo({
    width = 120,
    height = 40,
    onDark = false,
}: {
    width?: number;
    height?: number;
    onDark?: boolean;
}) {
    const gid = useId();
    const goldId = `acGold-${gid}`;
    const gold = `url(#${goldId})`;

    const gold0 = onDark ? '#F5D87A' : '#B5892E';
    const gold1 = onDark ? '#C49A2B' : '#7C520D';
    const ink = onDark ? '#F0E0BC' : '#251A11';

    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 380 120"
            role="img"
            aria-label="AskChetna"
            style={{ display: 'block' }}
        >
            <defs>
                <linearGradient id={goldId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={gold0} />
                    <stop offset="1" stopColor={gold1} />
                </linearGradient>
            </defs>

            {/* Emblem: open zodiac ring forming a "C", house dots, central sparkle */}
            <path
                d="M100.3,92.15 A50 50 0 1 1 100.3,27.85"
                fill="none"
                stroke={gold}
                strokeWidth="6"
                strokeLinecap="round"
            />
            <circle cx="62" cy="110" r="2" fill={gold} />
            <circle cx="26.64" cy="95.36" r="2" fill={gold} />
            <circle cx="12" cy="60" r="2" fill={gold} />
            <circle cx="26.64" cy="24.64" r="2" fill={gold} />
            <circle cx="62" cy="10" r="2" fill={gold} />
            <path
                d="M62,48 Q63.8,58.2 74,60 Q63.8,61.8 62,72 Q60.2,61.8 50,60 Q60.2,58.2 62,48 Z"
                fill={gold}
            />

            {/* Wordmark uses the site heading font (Playfair Display, layout.tsx) */}
            <text
                x="130"
                y="78"
                fontFamily="var(--font-heading), Georgia, 'Times New Roman', serif"
                fontSize="50"
                fontWeight={700}
            >
                <tspan fill={ink}>Ask</tspan>
                <tspan fill={gold}>Chetna</tspan>
            </text>
        </svg>
    );
}
