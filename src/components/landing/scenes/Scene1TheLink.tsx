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
  const taglineOpacity = useTransform(scrollYProgress, [0, 0.15], [0, 1]);
  const taglineY = useTransform(scrollYProgress, [0, 0.15], [30, 0]);
  const subtitleOpacity = useTransform(scrollYProgress, [0.05, 0.25], [0, 1]);
  const subtitleY = useTransform(scrollYProgress, [0.05, 0.25], [20, 0]);

  return (
    <section
      ref={ref}
      className="relative h-[200vh] w-full"
      style={{ background: '#0a0a0a' }}
    >
      <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsla(153 100% 80% / 0.06) 0%, transparent 70%)',
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
              <img src={relinkLogo} alt="" className="w-36 h-36 md:w-52 md:h-52 object-contain rounded-3xl" />
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
              <img src={relinkLogo} alt="" className="w-36 h-36 md:w-52 md:h-52 object-contain rounded-3xl" />
            </motion.div>
            {/* Full logo (visible before split) */}
            <motion.img
              src={relinkLogo}
              alt="ReLink"
              className="w-36 h-36 md:w-52 md:h-52 object-contain rounded-3xl"
              style={{
                opacity: useTransform(scrollYProgress, [0, 0.3], [1, 0]),
              }}
            />
          </div>

          {/* Brand name */}
          <motion.h1
            className="mt-8 text-6xl md:text-8xl font-black tracking-tighter uppercase"
            style={{
              color: '#f0f0f0',
              opacity: taglineOpacity,
              y: taglineY,
            }}
          >
            Re<span style={{ color: '#99FFCC' }}>Link</span>
          </motion.h1>

          <motion.p
            className="mt-4 text-lg md:text-xl max-w-md text-center font-light tracking-wide"
            style={{
              color: '#666',
              opacity: subtitleOpacity,
              y: subtitleY,
            }}
          >
            Where Conversations Become Connections.
          </motion.p>
        </motion.div>

        {/* Brand name visible immediately */}
        <motion.h1
          className="absolute top-[18%] left-1/2 -translate-x-1/2 text-6xl md:text-8xl font-black tracking-tighter uppercase z-0"
          style={{
            color: '#f0f0f0',
            opacity: useTransform(scrollYProgress, [0, 0.15], [1, 0]),
          }}
        >
          Re<span style={{ color: '#99FFCC' }}>Link</span>
        </motion.h1>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
        >
          <span className="text-[10px] tracking-[0.3em] uppercase font-medium" style={{ color: '#555' }}>Scroll</span>
          <motion.div
            className="w-px h-10"
            style={{ background: 'linear-gradient(to bottom, #99FFCC, transparent)' }}
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </section>
  );
}
