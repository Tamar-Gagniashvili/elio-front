import { useRef, useMemo, Suspense } from 'react';
import { motion, useScroll, useTransform, useInView, useMotionValueEvent } from 'framer-motion';
import relinkLogo from '@/assets/relink-logo-3d.png';
import HeroScene3D from './HeroScene3D';
import { useState } from 'react';

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
  const [scrollProg, setScrollProg] = useState(0);

  const nodes = useMemo(() => generateNodes(), []);
  const edges = useMemo(() => generateEdges(nodes), [nodes]);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  // Track scroll progress for the 3D scene
  useMotionValueEvent(scrollYProgress, 'change', (v) => setScrollProg(v));

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

  const titleText = 'RELINK';

  return (
    <section ref={ref} className="relative h-[200vh] w-full" style={{ background: '#000' }}>
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">

        {/* ── 3D HERO SCENE (full background, moon + cosmonaut on right) ── */}
        <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
          <HeroScene3D scrollProgress={scrollProg} className="absolute inset-0 z-0" />
        </Suspense>

        {/* ── AMBIENT GLOW LAYERS ── */}
        <div className="absolute inset-0 z-[3] pointer-events-none">
          <motion.div
            className="absolute top-1/2 left-[20%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, hsla(153, 100%, 80%, 0.05) 0%, transparent 60%)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* ── TEXT CONTENT — LEFT SIDE ── */}
        <div ref={titleRef} className="relative z-20 flex flex-col items-start pl-8 md:pl-16 lg:pl-24 max-w-2xl">
          {/* Letter-by-letter animated title */}
          <div className="flex overflow-hidden mb-4" style={{ perspective: '600px' }}>
            {titleText.split('').map((letter, i) => (
              <motion.span
                key={i}
                className="text-6xl md:text-8xl lg:text-[9rem] font-black tracking-tighter leading-none"
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
            style={{ background: 'linear-gradient(90deg, #99FFCC, #00bcd4, transparent)' }}
            initial={{ width: 0, opacity: 0 }}
            animate={isInView ? { width: '240px', opacity: 1 } : {}}
            transition={{ delay: 1.2, duration: 1, ease: 'easeOut' }}
          />

          {/* Tagline */}
          <div className="flex gap-2 flex-wrap">
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
            className="mt-4 text-xs md:text-sm tracking-widest max-w-sm"
            style={{ color: '#555' }}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 2.2, duration: 0.8 }}
          >
            The omnichannel system that links it all.
          </motion.p>
        </div>

        {/* ── SCROLL INDICATOR ── */}
        <motion.div
          className="absolute bottom-10 left-8 md:left-16 lg:left-24 flex flex-col items-center gap-2 z-20"
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
