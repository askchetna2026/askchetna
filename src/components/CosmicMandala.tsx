/**
 * CosmicMandala — A decorative SVG mandala for Vedic aesthetic pages.
 * Use as a background watermark or hero decoration.
 */
export default function CosmicMandala({
  size = 400,
  opacity = 0.12,
  className = '',
  animate = false,
}: {
  size?: number;
  opacity?: number;
  className?: string;
  animate?: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animate ? 'cosmic-mandala-spin' : ''}`.trim()}
      style={{ opacity, pointerEvents: 'none', userSelect: 'none' }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="mandalaGold" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#B5892E" stopOpacity="1" />
          <stop offset="100%" stopColor="#B5892E" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r * 0.95} fill="none" stroke="#B5892E" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={r * 0.9} fill="none" stroke="#B5892E" strokeWidth="0.3" />

      {/* 12-pointed star (zodiac wheel outer) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x1 = Number((cx + r * 0.9 * Math.cos(angle)).toFixed(4));
        const y1 = Number((cy + r * 0.9 * Math.sin(angle)).toFixed(4));
        const x2 = Number((cx + r * 0.5 * Math.cos(angle)).toFixed(4));
        const y2 = Number((cy + r * 0.5 * Math.sin(angle)).toFixed(4));
        return (
          <line
            key={`spoke-${i}`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#B5892E" strokeWidth="0.5" opacity="0.7"
          />
        );
      })}

      {/* 12 house divisions */}
      {Array.from({ length: 12 }).map((_, i) => {
        const midAngle = ((i * 30 + 15) * Math.PI) / 180;
        const px = Number((cx + r * 0.72 * Math.cos(midAngle)).toFixed(4));
        const py = Number((cy + r * 0.72 * Math.sin(midAngle)).toFixed(4));
        return (
          <circle key={`dot-${i}`} cx={px} cy={py} r="1.5" fill="#B5892E" opacity="0.6" />
        );
      })}

      {/* Inner rings */}
      <circle cx={cx} cy={cy} r={r * 0.6} fill="none" stroke="#B5892E" strokeWidth="0.4" />
      <circle cx={cx} cy={cy} r={r * 0.4} fill="none" stroke="#B5892E" strokeWidth="0.3" />
      <circle cx={cx} cy={cy} r={r * 0.2} fill="none" stroke="#B5892E" strokeWidth="0.5" />

      {/* 6-pointed inner star (Shatkona / Star of Consciousness) */}
      {[0, 60, 120].map((deg) => {
        const a1 = (deg * Math.PI) / 180;
        const a2 = ((deg + 120) * Math.PI) / 180;
        const a3 = ((deg + 240) * Math.PI) / 180;
        const rr = r * 0.38;
        const p1x = Number((cx + rr * Math.cos(a1)).toFixed(4));
        const p1y = Number((cy + rr * Math.sin(a1)).toFixed(4));
        const p2x = Number((cx + rr * Math.cos(a2)).toFixed(4));
        const p2y = Number((cy + rr * Math.sin(a2)).toFixed(4));
        const p3x = Number((cx + rr * Math.cos(a3)).toFixed(4));
        const p3y = Number((cy + rr * Math.sin(a3)).toFixed(4));
        return (
          <polygon
            key={`triangle-${deg}`}
            points={[
              `${p1x},${p1y}`,
              `${p2x},${p2y}`,
              `${p3x},${p3y}`,
            ].join(' ')}
            fill="none"
            stroke="#B5892E"
            strokeWidth="0.6"
            opacity="0.8"
          />
        );
      })}

      {/* Center lotus dot */}
      <circle cx={cx} cy={cy} r="4" fill="#B5892E" opacity="0.9" />
      <circle cx={cx} cy={cy} r="2" fill="#fff" opacity="0.6" />

      {/* 8 petal lotus in middle ring */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 45 * Math.PI) / 180;
        const px = Number((cx + r * 0.28 * Math.cos(angle)).toFixed(4));
        const py = Number((cy + r * 0.28 * Math.sin(angle)).toFixed(4));
        return (
          <ellipse
            key={`petal-${i}`}
            cx={px} cy={py}
            rx={r * 0.07} ry={r * 0.035}
            fill="none"
            stroke="#B5892E"
            strokeWidth="0.5"
            opacity="0.7"
            transform={`rotate(${i * 45 + 90}, ${px}, ${py})`}
          />
        );
      })}
    </svg>
  );
}
