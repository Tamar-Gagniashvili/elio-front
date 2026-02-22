import { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import relinkLogo from '@/assets/relink-logo-3d.png';
import cosmonautHero from '@/assets/landing/cosmonaut-hero.png';

const letterVariants = {
  hidden: { opacity: 0, y: 40, rotateX: -90 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      delay: 0.5 + i * 0.08,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const glowPulse = {
  animate: {
    boxShadow: [
      '0 0 30px hsla(153, 100%, 80%, 0.2)',
      '0 0 60px hsla(153, 100%, 80%, 0.4)',
      '0 0 30px hsla(153, 100%, 80%, 0.2)',
    ],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
  },
};

export default function Scene1TheLink() {
  const ref = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(titleRef, { once: true });

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

  // Cosmonaut hero parallax - fully visible and highlighted
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.15]);

  const titleText = 'RELINK';

  return (
    <section
      ref={ref}
      className="relative h-[200vh] w-full"
      style={{ background: '#0a0a0a' }}
    >
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        {/* Animated star field background */}
        <div className="absolute inset-0">
          {Array.from({ length: 60 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 3 + 1,
                height: Math.random() * 3 + 1,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: 'hsla(153, 100%, 80%, 0.6)',
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        {/* Large ambient glows */}
        <motion.div
          className="absolute w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsla(153, 100%, 80%, 0.08) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsla(173, 80%, 50%, 0.06) 0%, transparent 60%)',
            right: '10%',
            top: '20%',
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        {/* Cosmonaut hero - FULLY VISIBLE with glow */}
        <motion.div
          className="absolute right-[-5%] md:right-[5%] bottom-[5%] md:bottom-[10%] w-[70vw] md:w-[45vw] lg:w-[38vw] max-w-[600px] z-[5]"
          style={{ y: heroY, scale: heroScale }}
        >
          {/* Glow behind cosmonaut */}
          <motion.div
            className="absolute inset-0 rounded-full blur-[80px]"
            style={{
              background: 'radial-gradient(circle, hsla(153, 100%, 80%, 0.15) 0%, transparent 70%)',
              transform: 'scale(1.5)',
            }}
            {...glowPulse}
          />
          <motion.img
            src={cosmonautHero}
            alt="ReLink Cosmonaut"
            className="w-full h-auto object-contain relative z-10 drop-shadow-[0_0_40px_hsla(153,100%,80%,0.3)]"
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>

        {/* Animated Title - letter by letter */}
        <div ref={titleRef} className="relative z-20 flex flex-col items-center">
          <div className="flex overflow-hidden mb-4">
            {titleText.split('').map((letter, i) => (
              <motion.span
                key={i}
                className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter"
                style={{
                  color: i >= 2 ? '#99FFCC' : '#f0f0f0',
                  textShadow: i >= 2
                    ? '0 0 30px hsla(153, 100%, 80%, 0.5), 0 0 60px hsla(153, 100%, 80%, 0.2)'
                    : '0 0 20px hsla(0, 0%, 100%, 0.1)',
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

          {/* Animated underline */}
          <motion.div
            className="h-[2px] rounded-full mb-6"
            style={{
              background: 'linear-gradient(90deg, transparent, #99FFCC, transparent)',
            }}
            initial={{ width: 0, opacity: 0 }}
            animate={isInView ? { width: '200px', opacity: 1 } : {}}
            transition={{ delay: 1.2, duration: 0.8, ease: 'easeOut' }}
          />

          {/* Subtitle with typewriter feel */}
          <motion.p
            className="text-sm md:text-base tracking-[0.4em] uppercase font-light"
            style={{ color: '#777' }}
            initial={{ opacity: 0, y: 20, letterSpacing: '0.8em' }}
            animate={isInView ? { opacity: 1, y: 0, letterSpacing: '0.4em' } : {}}
            transition={{ delay: 1.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            Conversations Become Connections
          </motion.p>
        </div>

        {/* Logo below with split chains effect */}
        <motion.div
          className="relative z-10 flex flex-col items-center mt-10"
          style={{ scale: logoScale, y: logoY, opacity: logoOpacity }}
        >
          <div className="relative">
            {/* Left chain */}
            <motion.div
              className="absolute inset-0"
              style={{
                x: chainLeftX,
                rotate: chainLeftRotate,
                clipPath: 'polygon(0 0, 55% 0, 55% 100%, 0 100%)',
              }}
            >
              <img src={relinkLogo} alt="" className="w-28 h-28 md:w-40 md:h-40 object-contain rounded-3xl" />
            </motion.div>
            {/* Right chain */}
            <motion.div
              className="absolute inset-0"
              style={{
                x: chainRightX,
                rotate: chainRightRotate,
                clipPath: 'polygon(45% 0, 100% 0, 100% 100%, 45% 100%)',
              }}
            >
              <img src={relinkLogo} alt="" className="w-28 h-28 md:w-40 md:h-40 object-contain rounded-3xl" />
            </motion.div>
            {/* Full logo (visible before split) */}
            <motion.img
              src={relinkLogo}
              alt="ReLink"
              className="w-28 h-28 md:w-40 md:h-40 object-contain rounded-3xl"
              style={{
                opacity: useTransform(scrollYProgress, [0, 0.3], [1, 0]),
              }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          {/* Tagline on scroll */}
          <motion.p
            className="mt-8 text-lg md:text-xl max-w-md text-center font-light tracking-wide"
            style={{
              color: '#999',
              opacity: taglineOpacity,
              y: taglineY,
            }}
          >
            Where Conversations Become Connections.
          </motion.p>

          <motion.p
            className="mt-3 text-sm max-w-sm text-center"
            style={{
              color: '#555',
              opacity: subtitleOpacity,
              y: subtitleY,
            }}
          >
            The omnichannel system that links it all.
          </motion.p>
        </motion.div>

        {/* Scroll indicator with enhanced animation */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20"
          style={{ opacity: useTransform(scrollYProgress, [0, 0.1], [1, 0]) }}
        >
          <motion.span
            className="text-[10px] tracking-[0.3em] uppercase font-medium"
            style={{ color: '#555' }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Scroll
          </motion.span>
          <motion.div
            className="w-px h-10"
            style={{ background: 'linear-gradient(to bottom, #99FFCC, transparent)' }}
            animate={{ y: [0, 8, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </motion.div>
      </div>
    </section>
  );
}
