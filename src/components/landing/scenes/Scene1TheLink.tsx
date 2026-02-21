import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import relinkLogo from '@/assets/relink-logo-3d.png';

export default function Scene1TheLink() {
  const ref = useRef<HTMLDivElement>(null);
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
  const bgLightness = useTransform(scrollYProgress, [0, 1], [8, 97]);
  const taglineOpacity = useTransform(scrollYProgress, [0, 0.15], [0, 1]);
  const taglineY = useTransform(scrollYProgress, [0, 0.15], [30, 0]);
  const subtitleOpacity = useTransform(scrollYProgress, [0.05, 0.25], [0, 1]);
  const subtitleY = useTransform(scrollYProgress, [0.05, 0.25], [20, 0]);

  return (
    <motion.section
      ref={ref}
      className="relative h-[200vh] w-full"
      style={{
        background: useTransform(bgLightness, (v) => `hsl(222 47% ${v}%)`),
      }}
    >
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Ambient glow */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(173 80% 40% / 0.15) 0%, transparent 70%)',
            opacity: useTransform(scrollYProgress, [0, 0.5], [1, 0]),
          }}
        />

        {/* Logo container with split chains effect */}
        <motion.div
          className="relative z-10 flex flex-col items-center"
          style={{ scale: logoScale, y: logoY, opacity: logoOpacity }}
        >
          <div className="relative">
            {/* Left chain (green) */}
            <motion.div
              className="absolute inset-0"
              style={{
                x: chainLeftX,
                rotate: chainLeftRotate,
                clipPath: 'polygon(0 0, 55% 0, 55% 100%, 0 100%)',
              }}
            >
              <img src={relinkLogo} alt="" className="w-40 h-40 md:w-56 md:h-56 object-contain rounded-3xl" />
            </motion.div>
            {/* Right chain (dark) */}
            <motion.div
              className="absolute inset-0"
              style={{
                x: chainRightX,
                rotate: chainRightRotate,
                clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 45% 100%)',
              }}
            >
              <img src={relinkLogo} alt="" className="w-40 h-40 md:w-56 md:h-56 object-contain rounded-3xl" />
            </motion.div>
            {/* Full logo (visible before split) */}
            <motion.img
              src={relinkLogo}
              alt="ReLink"
              className="w-40 h-40 md:w-56 md:h-56 object-contain rounded-3xl"
              style={{
                opacity: useTransform(scrollYProgress, [0, 0.3], [1, 0]),
              }}
            />
          </div>

          {/* Brand name */}
          <motion.h1
            className="mt-8 text-5xl md:text-7xl font-bold tracking-tight"
            style={{
              color: useTransform(bgLightness, (v) => v > 50 ? 'hsl(222 47% 11%)' : 'hsl(220 14% 96%)'),
              opacity: taglineOpacity,
              y: taglineY,
            }}
          >
            Re<span style={{ color: 'hsl(173 80% 40%)' }}>Link</span>
          </motion.h1>

          <motion.p
            className="mt-4 text-lg md:text-xl max-w-md text-center"
            style={{
              color: useTransform(bgLightness, (v) => v > 50 ? 'hsl(220 9% 46%)' : 'hsl(220 9% 70%)'),
              opacity: subtitleOpacity,
              y: subtitleY,
            }}
          >
            Where Conversations Become Connections.
          </motion.p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
        >
          <span className="text-xs tracking-widest uppercase" style={{ color: 'hsl(220 9% 60%)' }}>Scroll</span>
          <motion.div
            className="w-px h-8 bg-gradient-to-b from-[hsl(173_80%_40%)] to-transparent"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </motion.section>
  );
}
