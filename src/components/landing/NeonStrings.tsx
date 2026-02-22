import { useMemo } from 'react';

interface NeonLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  delay: number;
  duration: number;
}

const NEON_COLORS = [
  '#25D366', // whatsapp green
  '#26A5E4', // telegram blue
  '#E4405F', // instagram pink
  '#0084FF', // messenger blue
  '#99FFCC', // relink mint
  '#00bcd4', // cyan
];

export default function NeonStrings({ count = 8 }: { count?: number }) {
  const lines = useMemo<NeonLine[]>(() =>
    Array.from({ length: count }).map((_, i) => ({
      x1: Math.random() * 100,
      y1: Math.random() * 100,
      x2: Math.random() * 100,
      y2: Math.random() * 100,
      color: NEON_COLORS[i % NEON_COLORS.length],
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
    })),
    [count]
  );

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.12 }}>
      <defs>
        {lines.map((line, i) => (
          <linearGradient key={`grad-${i}`} id={`neon-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={line.color} stopOpacity="0" />
            <stop offset="40%" stopColor={line.color} stopOpacity="1" />
            <stop offset="60%" stopColor={line.color} stopOpacity="1" />
            <stop offset="100%" stopColor={line.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {lines.map((line, i) => (
        <line
          key={i}
          x1={`${line.x1}%`}
          y1={`${line.y1}%`}
          x2={`${line.x2}%`}
          y2={`${line.y2}%`}
          stroke={`url(#neon-grad-${i})`}
          strokeWidth="1"
          style={{
            animation: `neon-pulse ${line.duration}s ease-in-out ${line.delay}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes neon-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }`}</style>
    </svg>
  );
}
