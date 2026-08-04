import styles from './NineGrahas.module.css';

/**
 * The nine grahas, actually orbiting.
 *
 * Nine bodies on nine rings, each at its own period, so the picture is never
 * the same twice and never quite repeats. The periods are not the real
 * synodic ones — those range from 27 days to 29 years and would render as
 * either a blur or a still image — but they are ORDERED like the real ones:
 * Chandra fastest, the outer bodies slowest. Ketu shares Rāhu's ring, offset
 * by 180°, because that is what the nodes are.
 *
 * Colours are per-body rather than uniform gold: Maṅgala reads red, Śukra
 * cream, Śani a cold violet. A single gold for all nine would be an ornament
 * of nine identical dots.
 */

/** name, orbit radius, period (s), body colour, body radius */
const GRAHA: [string, number, number, string, number][] = [
    ['Chandra', 52, 26, '#E9E4F2', 5],
    ['Budha', 76, 38, '#BFD3C1', 3.6],
    ['Shukra', 100, 52, '#F0E0BC', 4.4],
    ['Surya', 126, 68, '#E8B44A', 7],
    ['Mangala', 150, 86, '#D2714B', 4.6],
    ['Guru', 172, 110, '#E3D08A', 5.8],
    ['Shani', 194, 140, '#8E96C4', 5.2],
    ['Rahu', 212, 168, '#9A86B8', 3.4],
    ['Ketu', 212, 168, '#7E8F6B', 3.4],
];

const CX = 210;
const CY = 210;

/** Trig rounded before it reaches an attribute — Math.sin/cos are not
 *  bit-identical across engines, and an unrounded value hydrates as a
 *  mismatch. See the same guard in Masthead.tsx. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Four-pointed ink star, the same mark the masthead ring uses. */
function star(x: number, y: number, s: number, opacity: number, key: string) {
    return (
        <path
            key={key}
            d={`M0 ${-s} Q ${s * 0.22} ${-s * 0.22} ${s} 0 Q ${s * 0.22} ${s * 0.22} 0 ${s} Q ${-s * 0.22} ${s * 0.22} ${-s} 0 Q ${-s * 0.22} ${-s * 0.22} 0 ${-s} Z`}
            transform={`translate(${x} ${y})`}
            fill="#E9E4F2"
            fillOpacity={opacity}
        />
    );
}

export default function NavagrahaOrbit() {
    return (
        <svg
            className={styles.orbit}
            /* Padded past 420. The outermost orbit is r=212 about a centre at
               210, so it reaches 422 — two pixels outside a 0 0 420 420 box,
               and Rāhu and Ketu rode the clipped edge. */
            viewBox="-12 -12 444 444"
            aria-hidden="true"
        >
            {/* Deterministic scatter rather than Math.random(): a random field
                would differ between the server and client renders and hydrate
                with a mismatch warning. */}
            {Array.from({ length: 40 }, (_, i) =>
                star((i * 103) % 410 + 5, (i * 57) % 410 + 5, i % 6 ? 1.1 : 2, i % 6 ? 0.3 : 0.6, `s${i}`)
            )}

            {GRAHA.map(([name, r, dur, col, rad]) => (
                <g key={name}>
                    <circle
                        cx={CX}
                        cy={CY}
                        r={r}
                        fill="none"
                        stroke="#E9E4F2"
                        strokeWidth={0.6}
                        strokeOpacity={0.16}
                    />
                    <g
                        className={styles.spin}
                        style={
                            {
                                '--dur': `${dur}s`,
                                transformOrigin: `${CX}px ${CY}px`,
                                // The nodes are always opposite each other.
                                rotate: name === 'Ketu' ? '180deg' : undefined,
                            } as React.CSSProperties
                        }
                    >
                        <circle cx={CX + r} cy={CY} r={rad} fill={col} fillOpacity={0.95} />
                    </g>
                </g>
            ))}

            {/* Sūrya at the centre, with rays. */}
            <circle cx={CX} cy={CY} r={15} fill="#E8B44A" fillOpacity={0.9} />
            {Array.from({ length: 16 }, (_, i) => {
                const a = (i / 16) * Math.PI * 2;
                return (
                    <line
                        key={`ray${i}`}
                        x1={r3(CX + Math.cos(a) * 19)}
                        y1={r3(CY + Math.sin(a) * 19)}
                        x2={r3(CX + Math.cos(a) * 25)}
                        y2={r3(CY + Math.sin(a) * 25)}
                        stroke="#E8B44A"
                        strokeWidth={1.2}
                        strokeOpacity={0.65}
                    />
                );
            })}
        </svg>
    );
}
