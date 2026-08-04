/**
 * The AskChetna emblem on its own — no wordmark.
 *
 * Geometry is lifted from `Logo.tsx` (and ultimately `chetna_logo_light.svg`):
 * an open zodiac ring forming a C, five house dots around the opening, and a
 * four-pointed sparkle at the centre. Extracted because the footer and the
 * app icon want the mark WITHOUT the lockup, and the previous footer answer to
 * that was a placeholder — a ring of running text around a plain dot, which is
 * not the brand and read as an unfinished asset.
 *
 * Deliberately not a client component and not theme-aware: there is one theme,
 * and `currentColor` lets the caller decide the ink.
 */
export default function ChetnaMark({
    size = 106,
    className,
}: {
    size?: number;
    className?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 120 120"
            className={className}
            role="img"
            aria-label="AskChetna"
        >
            <path
                d="M100.3,92.15 A50 50 0 1 1 100.3,27.85"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
            />
            {[
                [62, 110],
                [26.64, 95.36],
                [12, 60],
                [26.64, 24.64],
                [62, 10],
            ].map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" fill="currentColor" />
            ))}
            <path
                d="M62,48 Q63.8,58.2 74,60 Q63.8,61.8 62,72 Q60.2,61.8 50,60 Q60.2,58.2 62,48 Z"
                fill="currentColor"
            />
        </svg>
    );
}
