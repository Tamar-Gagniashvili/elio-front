import logo from '@/assets/logo.png';

/**
 * Animated firefly using the actual logo image.
 * Adds a pulsing neon glow + subtle wing-like rotation flicker.
 */
interface AnimatedFireflyProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimatedFirefly({ size = 80, className = '', style }: AnimatedFireflyProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        ...style,
      }}
    >
      <style>{`
        @keyframes firefly-flicker {
          0%, 100% { transform: scale(1) rotate(-2deg); filter: drop-shadow(0 0 12px hsla(140, 100%, 65%, 0.55)) drop-shadow(0 0 28px hsla(140, 100%, 55%, 0.25)); }
          50%      { transform: scale(1.04) rotate(2deg); filter: drop-shadow(0 0 22px hsla(140, 100%, 70%, 0.85)) drop-shadow(0 0 44px hsla(140, 100%, 60%, 0.4)); }
        }
        @keyframes firefly-aura {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50%      { opacity: 0.7;  transform: scale(1.15); }
        }
        .ff-img  { animation: firefly-flicker 0.9s ease-in-out infinite; will-change: transform, filter; }
        .ff-aura { animation: firefly-aura 2.4s ease-in-out infinite; }
      `}</style>

      {/* Soft neon aura behind the logo */}
      <div
        className="ff-aura absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsla(140, 100%, 65%, 0.45) 0%, transparent 65%)',
          filter: 'blur(8px)',
        }}
      />
      <img
        src={logo}
        alt=""
        className="ff-img relative w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
}
