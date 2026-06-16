'use client';

import { useEffect, useId, useState } from 'react';

export default function Logo({ width = 120, height = 40, onDark = false }: { width?: number, height?: number, onDark?: boolean }) {
    // Site defaults to the dark theme (see <html data-theme="dark"> in layout.tsx).
    const [isDark, setIsDark] = useState(true);
    const gid = useId();

    useEffect(() => {
        const checkTheme = () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme) {
                setIsDark(currentTheme === 'dark');
            } else {
                setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
            }
        };

        checkTheme();

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    checkTheme();
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = (e: MediaQueryListEvent) => {
            if (!document.documentElement.getAttribute('data-theme')) {
                setIsDark(e.matches);
            }
        };
        mediaQuery.addEventListener('change', listener);

        return () => {
            observer.disconnect();
            mediaQuery.removeEventListener('change', listener);
        };
    }, []);

    // The desktop header bar is always dark (rgba(11,15,47,...)), so it forces the
    // light-on-dark variant via onDark. Other placements (e.g. the mobile menu, whose
    // background follows var(--background)) stay theme-aware.
    const useLightText = onDark || isDark;

    // Palette is pulled straight from globals.css (light vs dark theme tokens).
    const gold0 = useLightText ? '#F5D87A' : '#D4AF37';
    const gold1 = useLightText ? '#C49A2B' : '#996515';
    const ink = useLightText ? '#DFE0FF' : '#2C1B18';
    const goldId = `acGold-${gid}`;
    const gold = `url(#${goldId})`;

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

            {/* Emblem: open zodiac ring forming a "C", with house dots and a central sparkle */}
            <path d="M100.3,92.15 A50 50 0 1 1 100.3,27.85" fill="none" stroke={gold} strokeWidth="6" strokeLinecap="round" />
            <circle cx="62" cy="110" r="2" fill={gold} />
            <circle cx="26.64" cy="95.36" r="2" fill={gold} />
            <circle cx="12" cy="60" r="2" fill={gold} />
            <circle cx="26.64" cy="24.64" r="2" fill={gold} />
            <circle cx="62" cy="10" r="2" fill={gold} />
            <path d="M62,48 Q63.8,58.2 74,60 Q63.8,61.8 62,72 Q60.2,61.8 50,60 Q60.2,58.2 62,48 Z" fill={gold} />

            {/* Wordmark uses the site heading font (Playfair Display) loaded in layout.tsx */}
            <text x="130" y="78" fontFamily="var(--font-heading), Georgia, 'Times New Roman', serif" fontSize="50" fontWeight={700}>
                <tspan fill={ink}>Ask</tspan><tspan fill={gold}>Chetna</tspan>
            </text>
        </svg>
    );
}
