import { motion } from 'framer-motion';
import { renderToStaticMarkup } from 'react-dom/server';
import { MessageCircle, Send, Instagram, Facebook, Globe, Phone, Mail } from 'lucide-react';

const channels = [
  { Icon: MessageCircle, color: '#25D366', name: 'WhatsApp' },
  { Icon: Send, color: '#29B6F6', name: 'Telegram' },
  { Icon: Instagram, color: '#E1306C', name: 'Instagram' },
  { Icon: Facebook, color: '#7C8CFF', name: 'Messenger' },
  { Icon: Globe, color: '#99FFCC', name: 'Webchat' },
  { Icon: Phone, color: '#FFD666', name: 'SMS' },
  { Icon: Mail, color: '#FFFFFF', name: 'Email' },
];

interface ChannelStreamProps {
  width?: number;
  height?: number;
  /** Light streaks per ribbon — energy particles flowing along the wires. */
  particlesPerRibbon?: number;
  /** Number of flowing ribbons. */
  ribbons?: number;
  /** Strands (parallel wires) per ribbon — gives the "many wires" feel. */
  strandsPerRibbon?: number;
  /** Seconds for one full pass of a particle. */
  flowDuration?: number;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Free-flowing neon-green "wire ribbons" sweeping across the scene like
 * energy streams. Each ribbon is a bundle of parallel wavy strands that
 * carry light particles. Channel icons are scattered loosely around them.
 */
export default function ChannelStream({
  width = 560,
  height = 360,
  particlesPerRibbon = 6,
  ribbons = 3,
  strandsPerRibbon = 6,
  flowDuration = 7,
  style,
  className,
}: ChannelStreamProps) {
  const cx = width / 2;
  const cy = height / 2;
  const ribbonIdxs = Array.from({ length: ribbons }, (_, i) => i);

  // Deterministic pseudo-random for stable SSR/CSR output
  const rand = (seed: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  };

  /**
   * Build a flowing open S-curve path that sweeps across the canvas.
   * The ribbon is WIDE on the left (between hero text and astronaut) and
   * tapers to NARROW on the right (near the astronaut), so it frames
   * the scene without covering either.
   */
  const buildRibbonPath = (ribbon: number, strand: number) => {
    const segments = 10;
    const padX = -40;
    const startX = padX;
    const endX = width - padX;
    const baseY = cy + (ribbon - (ribbons - 1) / 2) * 60;
    const amp = 38 + rand(ribbon * 5 + 1) * 14;

    const pts: { x: number; y: number }[] = [];
    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const x = startX + (endX - startX) * t;
      // Taper factor: 1.0 on the left → 0.18 on the right (eased)
      const taper = 1 - Math.pow(t, 1.3) * 0.82;
      // Strand spread is widest on left, collapses on right
      const strandOffset = (strand - (strandsPerRibbon - 1) / 2) * 7 * taper;
      const phase = ribbon * 1.3 + strand * 0.18;
      const wave =
        (Math.sin(t * Math.PI * 2 + phase) * amp +
          Math.sin(t * Math.PI * 4 + phase * 1.7) * (amp * 0.25)) *
        taper;
      const jitter = (rand(ribbon * 31 + strand * 7 + s) - 0.5) * 6 * taper;
      pts.push({ x, y: baseY + strandOffset + wave + jitter });
    }

    // Smooth Catmull-Rom -> cubic Bezier
    let d = `M ${pts[0].x.toFixed(2)},${pts[0].y.toFixed(2)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
    }
    return { d, pts };
  };

  // Pre-compute all strand paths
  const ribbonStrands = ribbonIdxs.map((r) =>
    Array.from({ length: strandsPerRibbon }, (_, s) => buildRibbonPath(r, s))
  );

  // Scattered icon positions — clustered around ribbons but messy
  const iconPositions = channels.map((_, idx) => {
    const ribbon = idx % ribbons;
    const strands = ribbonStrands[ribbon];
    // Pick a strand and a point along it
    const strand = strands[Math.floor(rand(idx * 11 + 3) * strands.length)];
    const tIndex = 1 + Math.floor(rand(idx * 17 + 5) * (strand.pts.length - 2));
    const p = strand.pts[tIndex];
    const nudgeX = (rand(idx * 23 + 7) - 0.5) * 50;
    const nudgeY = (rand(idx * 29 + 11) - 0.5) * 36 - 6;
    return { x: p.x + nudgeX, y: p.y + nudgeY };
  });

  return (
    <div
      className={`absolute pointer-events-none ${className ?? ''}`}
      style={{ width, height, ...style }}
    >
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
      >
        <defs>
          {/* Neon trail gradient — bright in the middle, fades at edges */}
          <linearGradient id="cs-trail" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#99FFCC" stopOpacity="0" />
            <stop offset="20%" stopColor="#99FFCC" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#CCFFE5" stopOpacity="0.95" />
            <stop offset="80%" stopColor="#99FFCC" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#66E0B0" stopOpacity="0" />
          </linearGradient>
          <filter id="cs-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="cs-glow-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="cs-streak">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="35%" stopColor="#CCFFE5" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#99FFCC" stopOpacity="0" />
          </radialGradient>

          {/* Path defs — referenced by particle animateMotion */}
          {ribbonStrands.map((strands, r) =>
            strands.map((s, si) => (
              <path key={`p-${r}-${si}`} id={`cs-strand-${r}-${si}`} d={s.d} />
            ))
          )}
        </defs>

        {/* Render ribbons (wires + flowing particles) */}
        {ribbonStrands.map((strands, r) => {
          const dur = flowDuration + r * 1.4;
          const reverse = r % 2 === 1;
          const direction = reverse ? '1;0' : '0;1';

          return (
            <g key={`ribbon-${r}`}>
              {/* The wire strands themselves */}
              {strands.map((s, si) => {
                // Vary opacity & width across the bundle for depth
                const centerDist = Math.abs(si - (strandsPerRibbon - 1) / 2);
                const opacity = 0.18 + 0.5 * (1 - centerDist / strandsPerRibbon);
                const sw = 0.6 + (1 - centerDist / strandsPerRibbon) * 1.1;
                return (
                  <path
                    key={`wire-${r}-${si}`}
                    d={s.d}
                    stroke="url(#cs-trail)"
                    strokeWidth={sw}
                    fill="none"
                    filter="url(#cs-glow)"
                    opacity={opacity}
                  />
                );
              })}

              {/* Light particles flowing along random strands */}
              {Array.from({ length: particlesPerRibbon }).map((_, p) => {
                const strandIdx = Math.floor(rand(r * 13 + p * 7) * strandsPerRibbon);
                const begin = -(p / particlesPerRibbon) * dur - rand(r + p) * 0.8;
                return (
                  <g key={`particle-${r}-${p}`}>
                    {/* Trailing tail */}
                    <ellipse
                      rx={7}
                      ry={1.3}
                      fill="url(#cs-streak)"
                      opacity={0.75}
                      filter="url(#cs-glow-soft)"
                    >
                      <animateMotion
                        dur={`${dur}s`}
                        repeatCount="indefinite"
                        begin={`${begin}s`}
                        keyPoints={direction}
                        keyTimes="0;1"
                        rotate="auto"
                      >
                        <mpath href={`#cs-strand-${r}-${strandIdx}`} />
                      </animateMotion>
                    </ellipse>
                    {/* Bright head */}
                    <circle r={2} fill="#ffffff" filter="url(#cs-glow-soft)">
                      <animateMotion
                        dur={`${dur}s`}
                        repeatCount="indefinite"
                        begin={`${begin}s`}
                        keyPoints={direction}
                        keyTimes="0;1"
                      >
                        <mpath href={`#cs-strand-${r}-${strandIdx}`} />
                      </animateMotion>
                    </circle>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Channel icons scattered loosely around the ribbons */}
        {channels.map((c, idx) => {
          const { x, y } = iconPositions[idx];
          const iconMarkup = renderToStaticMarkup(
            <c.Icon size={20} color={c.color} strokeWidth={2.2} />
          );
          return (
            <g key={`icon-${c.name}`} transform={`translate(${x} ${y})`}>
              <circle r={20} fill={c.color} opacity={0.18} filter="url(#cs-glow)" />
              <circle
                r={16}
                fill="rgba(10,10,10,0.7)"
                stroke={c.color}
                strokeWidth={1.2}
                filter="url(#cs-glow-soft)"
              />
              <g transform="translate(-10,-10)" dangerouslySetInnerHTML={{ __html: iconMarkup }} />
            </g>
          );
        })}
      </svg>

      {/* Soft central halo for connectivity vibe */}
      <motion.div
        className="absolute rounded-full"
        style={{
          left: '50%',
          top: '50%',
          width: 140,
          height: 140,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(153,255,204,0.18), transparent 70%)',
          filter: 'blur(10px)',
        }}
        animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
