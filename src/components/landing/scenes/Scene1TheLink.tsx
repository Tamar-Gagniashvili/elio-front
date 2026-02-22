import { useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import relinkLogo from '@/assets/relink-logo-3d.png';
import cosmonautHero from '@/assets/landing/cosmonaut-hero.png';
import heroBg from '@/assets/landing/hero-bg.png';

/* ── Deterministic random for SSR-safe positions ── */
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49311;
  return x - Math.floor(x);
}

/* ── Node network data ── */
interface Node {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  label?: string;
  color: string;
}

const CHANNEL_LABELS = [
  'WhatsApp', 'Telegram', 'Instagram', 'Messenger',
  'Email', 'Web Chat', 'SMS', 'TikTok',
];
const CHANNEL_COLORS = [
  'hsla(142, 70%, 45%, 0.9)',  // whatsapp
  'hsla(200, 100%, 50%, 0.9)', // telegram
  'hsla(330, 80%, 55%, 0.9)',  // instagram
  'hsla(221, 90%, 55%, 0.9)',  // messenger
  'hsla(210, 80%, 50%, 0.9)',  // email
  'hsla(173, 80%, 40%, 0.9)',  // web
  'hsla(260, 60%, 55%, 0.9)',  // sms
  'hsla(349, 100%, 50%, 0.9)', // tiktok
];

function generateNodes(): Node[] {
  const nodes: Node[] = [];
  // Channel nodes (labeled, bigger)
  for (let i = 0; i < 8; i++) {
    nodes.push({
      id: i,
      x: 8 + seededRandom(i * 7 + 1) * 84,
      y: 8 + seededRandom(i * 7 + 2) * 84,
      size: 6,
      delay: seededRandom(i * 7 + 3) * 2,
      duration: 3 + seededRandom(i * 7 + 4) * 3,
      label: CHANNEL_LABELS[i],
      color: CHANNEL_COLORS[i],
    });
  }
  // Extra decorative nodes (smaller, no label)
  for (let i = 8; i < 30; i++) {
    nodes.push({
      id: i,
      x: 5 + seededRandom(i * 11 + 5) * 90,
      y: 5 + seededRandom(i * 11 + 6) * 90,
      size: 2 + seededRandom(i * 11 + 7) * 3,
      delay: seededRandom(i * 11 + 8) * 3,
      duration: 2 + seededRandom(i * 11 + 9) * 4,
      color: `hsla(153, 100%, 80%, ${0.15 + seededRandom(i * 11 + 10) * 0.35})`,
    });
  }
  return nodes;
}

/* ── Connections between nodes ── */
function generateEdges(nodes: Node[]) {
  const edges: { from: Node; to: Node; delay: number }[] = [];
  // Connect each channel node to 2-3 nearby nodes
  for (let i = 0; i < 8; i++) {
    const sorted = [...nodes]
      .filter((n) => n.id !== i)
      .sort((a, b) => {
        const da = Math.hypot(a.x - nodes[i].x, a.y - nodes[i].y);
        const db = Math.hypot(b.x - nodes[i].x, b.y - nodes[i].y);
        return da - db;
      });
    for (let j = 0; j < 3; j++) {
      if (sorted[j] && !edges.find(e =>
        (e.from.id === i && e.to.id === sorted[j].id) ||
        (e.from.id === sorted[j].id && e.to.id === i)
      )) {
        edges.push({ from: nodes[i], to: sorted[j], delay: i * 0.15 + j * 0.1 });
      }
    }
  }
  return edges;
}

const letterVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.5 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.3 + i * 0.1,
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export default function Scene1TheLink() {
  const ref = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(titleRef, { once: true });

  const nodes = useMemo(() => generateNodes(), []);
  const edges = useMemo(() => generateEdges(nodes), [nodes]);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const logoScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.6]);
  const logoY = useTransform(scrollYProgress, [0, 0.8], [0, -120]);
  const logoOpacity = useTransform(scrollYProgress, [0.6, 1], [1, 0]);
  const chainLeftX = useTransform(scrollYProgress, [0.3, 0.8], [0, -80]);
  const chainRightX = useTransform(scrollYProgress, [0.3, 0.8], [0, 80]);
  const chainLeftRotate = useTransform(scrollYProgress, [0.3, 0.8], [0, -15]);
  const chainRightRotate = useTransform(scrollYProgress, [0.3, 0.8], [0, 15]);
  const taglineOpacity = useTransform(scrollYProgress, [0.1, 0.25], [0, 1]);
  const taglineY = useTransform(scrollYProgress, [0.1, 0.25], [30, 0]);
  const subtitleOpacity = useTransform(scrollYProgress, [0.15, 0.3], [0, 1]);
  const subtitleY = useTransform(scrollYProgress, [0.15, 0.3], [20, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.15]);

  const titleText = 'RELINK';

  return (
    <section ref={ref} className="relative h-[200vh] w-full" style={{ background: '#000' }}>
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">

        {/* ── HERO BACKGROUND IMAGE ── */}
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
        </div>

        {/* ── ANIMATED NODE NETWORK (SVG) ── */}
        <svg className="absolute inset-0 w-full h-full z-[1]" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Edges / connections */}
          {edges.map((edge, i) => (
            <motion.line
              key={`e-${i}`}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              stroke="hsla(153, 100%, 80%, 0.08)"
              strokeWidth={0.15}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: 1.5 + edge.delay, duration: 1.2, ease: 'easeOut' }}
            />
          ))}
          {/* Animated data pulses along edges */}
          {edges.slice(0, 10).map((edge, i) => (
            <motion.circle
              key={`pulse-${i}`}
              r={0.4}
              fill="#99FFCC"
              initial={{ opacity: 0 }}
              animate={{
                cx: [edge.from.x, edge.to.x],
                cy: [edge.from.y, edge.to.y],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 2.5 + i * 0.3,
                repeat: Infinity,
                delay: 3 + i * 0.5,
                ease: 'linear',
              }}
            />
          ))}
        </svg>

        {/* ── FLOATING NODES (HTML for labels) ── */}
        <div className="absolute inset-0 z-[2]">
          {nodes.map((node) => (
            <motion.div
              key={node.id}
              className="absolute flex items-center gap-1.5"
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + node.delay, duration: 0.6, ease: 'backOut' }}
            >
              {/* Node dot */}
              <motion.div
                className="rounded-full"
                style={{
                  width: node.size * 2,
                  height: node.size * 2,
                  background: node.color,
                  boxShadow: `0 0 ${node.size * 4}px ${node.color}`,
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: node.duration,
                  repeat: Infinity,
                  delay: node.delay,
                  ease: 'easeInOut',
                }}
              />
              {/* Label for channel nodes */}
              {node.label && (
                <motion.span
                  className="text-[9px] md:text-[11px] font-semibold whitespace-nowrap hidden md:block"
                  style={{
                    color: node.color,
                    textShadow: `0 0 10px ${node.color}`,
                  }}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 0.8, x: 0 }}
                  transition={{ delay: 1.5 + node.delay, duration: 0.5 }}
                >
                  {node.label}
                </motion.span>
              )}
            </motion.div>
          ))}
        </div>

        {/* ── AMBIENT GLOW LAYERS ── */}
        <div className="absolute inset-0 z-[3] pointer-events-none">
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
            style={{ background: 'radial-gradient(circle, hsla(153, 100%, 80%, 0.06) 0%, transparent 60%)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full"
            style={{ background: 'radial-gradient(circle, hsla(173, 80%, 50%, 0.05) 0%, transparent 60%)' }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
          <motion.div
            className="absolute bottom-[15%] left-[15%] w-[350px] h-[350px] rounded-full"
            style={{ background: 'radial-gradient(circle, hsla(200, 100%, 50%, 0.04) 0%, transparent 60%)' }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
        </div>

        {/* ── COSMONAUT ── */}
        <motion.div
          className="absolute right-[-5%] md:right-[3%] bottom-[2%] md:bottom-[5%] w-[75vw] md:w-[42vw] lg:w-[36vw] max-w-[580px] z-[4]"
          style={{ y: heroY, scale: heroScale }}
        >
          <motion.div
            className="absolute inset-0 rounded-full blur-[100px]"
            style={{
              background: 'radial-gradient(circle, hsla(153, 100%, 80%, 0.12) 0%, transparent 70%)',
              transform: 'scale(1.8)',
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.img
            src={cosmonautHero}
            alt="ReLink Cosmonaut"
            className="w-full h-auto object-contain relative z-10"
            style={{
              filter: 'drop-shadow(0 0 50px hsla(153, 100%, 80%, 0.35)) drop-shadow(0 0 100px hsla(153, 100%, 80%, 0.15))',
            }}
            initial={{ opacity: 0, x: 120, scale: 0.7 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] as const }}
          />
        </motion.div>

        {/* ── TITLE + TEXT CENTER ── */}
        <div ref={titleRef} className="relative z-20 flex flex-col items-center">
          {/* Letter-by-letter animated title */}
          <div className="flex overflow-hidden mb-3" style={{ perspective: '600px' }}>
            {titleText.split('').map((letter, i) => (
              <motion.span
                key={i}
                className="text-7xl md:text-9xl lg:text-[10rem] font-black tracking-tighter leading-none"
                style={{
                  color: i >= 2 ? '#99FFCC' : '#ffffff',
                  textShadow: i >= 2
                    ? '0 0 40px hsla(153, 100%, 80%, 0.6), 0 0 80px hsla(153, 100%, 80%, 0.25), 0 0 120px hsla(153, 100%, 80%, 0.1)'
                    : '0 0 20px hsla(0, 0%, 100%, 0.15)',
                  display: 'inline-block',
                }}
                variants={letterVariants}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                custom={i}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* Animated gradient line */}
          <motion.div
            className="h-[3px] rounded-full mb-5"
            style={{ background: 'linear-gradient(90deg, transparent, #99FFCC, #00bcd4, transparent)' }}
            initial={{ width: 0, opacity: 0 }}
            animate={isInView ? { width: '280px', opacity: 1 } : {}}
            transition={{ delay: 1.2, duration: 1, ease: 'easeOut' }}
          />

          {/* Tagline with word-by-word animation */}
          <div className="flex gap-2 flex-wrap justify-center">
            {'Conversations Become Connections'.split(' ').map((word, i) => (
              <motion.span
                key={i}
                className="text-sm md:text-lg tracking-[0.25em] uppercase font-medium"
                style={{ color: i === 1 ? '#99FFCC' : '#888' }}
                initial={{ opacity: 0, y: 15 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1.5 + i * 0.2, duration: 0.5, ease: 'easeOut' }}
              >
                {word}
              </motion.span>
            ))}
          </div>

          {/* Sub-tagline */}
          <motion.p
            className="mt-4 text-xs md:text-sm tracking-widest"
            style={{ color: '#444' }}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 2.2, duration: 0.8 }}
          >
            The omnichannel system that links it all.
          </motion.p>
        </div>

        {/* ── LOGO with split chains ── */}
        <motion.div
          className="relative z-10 flex flex-col items-center mt-8"
          style={{ scale: logoScale, y: logoY, opacity: logoOpacity }}
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0"
              style={{ x: chainLeftX, rotate: chainLeftRotate, clipPath: 'polygon(0 0, 55% 0, 55% 100%, 0 100%)' }}
            >
              <img src={relinkLogo} alt="" className="w-24 h-24 md:w-36 md:h-36 object-contain rounded-3xl" />
            </motion.div>
            <motion.div
              className="absolute inset-0"
              style={{ x: chainRightX, rotate: chainRightRotate, clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 45% 100%)' }}
            >
              <img src={relinkLogo} alt="" className="w-24 h-24 md:w-36 md:h-36 object-contain rounded-3xl" />
            </motion.div>
            <motion.img
              src={relinkLogo}
              alt="ReLink"
              className="w-24 h-24 md:w-36 md:h-36 object-contain rounded-3xl"
              style={{ opacity: useTransform(scrollYProgress, [0, 0.3], [1, 0]) }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const }}
            />
          </div>

          <motion.p
            className="mt-8 text-lg md:text-xl max-w-md text-center font-light tracking-wide"
            style={{ color: '#999', opacity: taglineOpacity, y: taglineY }}
          >
            Where Conversations Become Connections.
          </motion.p>
          <motion.p
            className="mt-3 text-sm max-w-sm text-center"
            style={{ color: '#555', opacity: subtitleOpacity, y: subtitleY }}
          >
            The omnichannel system that links it all.
          </motion.p>
        </motion.div>

        {/* ── SCROLL INDICATOR ── */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20"
          style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
        >
          <motion.span
            className="text-[10px] tracking-[0.3em] uppercase font-medium"
            style={{ color: '#444' }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Scroll
          </motion.span>
          <motion.div
            className="w-px h-10"
            style={{ background: 'linear-gradient(to bottom, #99FFCC, transparent)' }}
            animate={{ y: [0, 8, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </section>
  );
}
