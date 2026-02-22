import { useMemo } from 'react';

export default function Starfield({ count = 120 }: { count?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        width: Math.random() > 0.9 ? 2 : 1,
        left: Math.random() * 100,
        top: Math.random() * 100,
        opacity: 0.15 + Math.random() * 0.4,
        duration: 2 + Math.random() * 4,
        delay: Math.random() * 3,
      })),
    [count]
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            width: `${s.width}px`,
            height: `${s.width}px`,
            left: `${s.left}%`,
            top: `${s.top}%`,
            background: '#99FFCC',
            opacity: s.opacity,
            animation: `starfield-twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes starfield-twinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.6; } }`}</style>
    </div>
  );
}
