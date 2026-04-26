import { motion } from 'framer-motion';

/**
 * Subtle background constellation rendered behind the hero title (left side only).
 * Pure SVG, no interaction — adds depth without competing with the astronaut on the right.
 */

// Hand-tuned star positions on a 600x500 canvas — forms a loose, asymmetric cluster
const STARS: Array<{ x: number; y: number; r: number; delay: number }> = [
  { x: 40, y: 60, r: 1.6, delay: 0 },
  { x: 120, y: 110, r: 2.2, delay: 0.4 },
  { x: 220, y: 50, r: 1.4, delay: 0.8 },
  { x: 300, y: 140, r: 2.6, delay: 0.2 },
  { x: 180, y: 220, r: 1.8, delay: 0.6 },
  { x: 80, y: 280, r: 2, delay: 1 },
  { x: 260, y: 320, r: 1.5, delay: 0.3 },
  { x: 380, y: 240, r: 2.2, delay: 0.7 },
  { x: 440, y: 90, r: 1.4, delay: 1.1 },
  { x: 60, y: 400, r: 1.6, delay: 0.5 },
  { x: 200, y: 420, r: 1.3, delay: 0.9 },
  { x: 350, y: 380, r: 1.8, delay: 0.2 },
];

// Lines connecting some of the stars to form a faint "constellation"
const LINES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [3, 8], [5, 10], [10, 11], [11, 7],
];

export default function HeroConstellation() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
      viewBox="0 0 600 500"
      preserveAspectRatio="xMinYMid slice"
      aria-hidden="true"
    >
      {/* Connecting lines — drawn first so stars sit on top */}
      <g stroke="#99FFCC" strokeWidth="0.6" fill="none" opacity="0.18">
        {LINES.map(([a, b], i) => {
          const s1 = STARS[a];
          const s2 = STARS[b];
          return (
            <motion.line
              key={i}
              x1={s1.x}
              y1={s1.y}
              x2={s2.x}
              y2={s2.y}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.6, delay: 1.8 + i * 0.12, ease: 'easeOut' }}
            />
          );
        })}
      </g>

      {/* Stars with gentle twinkle */}
      <g fill="#99FFCC">
        {STARS.map((s, i) => (
          <motion.circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0.3, 0.9, 0.3], scale: 1 }}
            transition={{
              opacity: { duration: 3, repeat: Infinity, delay: s.delay, ease: 'easeInOut' },
              scale: { duration: 0.8, delay: 1.2 + i * 0.08, ease: 'easeOut' },
            }}
            style={{ filter: `drop-shadow(0 0 ${s.r * 2}px #99FFCC)` }}
          />
        ))}
      </g>
    </svg>
  );
}
