import { useRef, Suspense, useCallback } from 'react';
import { motion, useInView, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import HeroScene3D from './HeroScene3D';
import HeroConstellation from './HeroConstellation';




export default function Scene1TheLink() {
  const { t } = useTranslation();
  const titleRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(titleRef, { once: true });

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const glowX = useTransform(smoothX, [0, 1], ['10%', '50%']);
  const glowY = useTransform(smoothY, [0, 1], ['30%', '70%']);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (rect) {
      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
    }
  }, [mouseX, mouseY]);

  const taglineWords = [t('landing.taglineWord1'), t('landing.taglineWord2'), t('landing.taglineWord3')];

  return (
    <section ref={sectionRef} className="relative min-h-[100svh] w-full" onMouseMove={handleMouseMove}>
      <div className="relative min-h-[100svh] w-full flex items-center overflow-hidden pt-20 pb-16 md:pt-0 md:pb-0">
        <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
          <HeroScene3D scrollProgress={0} className="absolute inset-0 z-0" />
        </Suspense>


        {/* Subtle constellation behind the title (left half only, sits between bg and text) */}
        <div className="absolute inset-y-0 left-0 w-full md:w-1/2 lg:w-[55%] z-[1] opacity-70 pointer-events-none">
          <HeroConstellation />
        </div>

        {/* Mouse-following glow */}
        <motion.div
          className="absolute inset-0 z-[3] pointer-events-none"
          style={{
            background: useTransform(
              [glowX, glowY],
              ([x, y]) => `radial-gradient(600px circle at ${x} ${y}, hsla(153, 100%, 80%, 0.08), transparent 60%)`
            ),
          }}
        />

        <div className="absolute inset-0 z-[3] pointer-events-none">
          <motion.div
            className="absolute top-1/2 left-[20%] -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, hsla(153, 100%, 80%, 0.05) 0%, transparent 60%)' }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <motion.div
          ref={titleRef}
          className="relative z-20 flex flex-col items-center md:items-start px-5 md:pl-16 lg:pl-24 max-w-2xl"
        >
          <motion.div
            className="h-[3px] rounded-full mb-5"
            style={{ background: 'linear-gradient(90deg, #99FFCC, #00bcd4, transparent)' }}
            initial={{ width: 0, opacity: 0 }}
            animate={isInView ? { width: '160px', opacity: 1 } : {}}
            transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
          />

          <motion.h1
            className="leading-[0.95] mb-4 select-none break-words"
            style={{
              fontFamily: '"Major Mono Display", "Space Mono", ui-monospace, monospace',
              fontSize: 'clamp(2.75rem, 11vw, 9rem)',
              letterSpacing: '0.02em',
              color: '#f0f0f0',
              textShadow:
                '0 0 22px hsla(153, 100%, 80%, 0.45), 0 0 60px hsla(153, 100%, 65%, 0.25)',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.9, ease: 'easeOut' }}
          >
            Eli<span style={{ color: '#99FFCC', textShadow: '0 0 18px #99FFCC, 0 0 42px hsla(153, 100%, 70%, 0.6)' }}>o</span>
          </motion.h1>

          <div className="flex gap-2 flex-wrap">
            {taglineWords.map((word, i) => (
              <motion.span
                key={i}
                className="text-[10px] sm:text-sm md:text-lg tracking-[0.15em] md:tracking-[0.25em] uppercase font-medium"
                style={{ color: i === 1 ? '#99FFCC' : '#888' }}
                initial={{ opacity: 0, y: 15 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1.5 + i * 0.2, duration: 0.5, ease: 'easeOut' }}
              >
                {word}
              </motion.span>
            ))}
          </div>

          <motion.p
            className="mt-4 text-xs md:text-sm tracking-widest max-w-sm"
            style={{ color: '#555' }}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 2.2, duration: 0.8 }}
          >
            {t('landing.subTagline')}
          </motion.p>

          {/* Value proposition */}
          <motion.p
            className="mt-3 text-sm md:text-base max-w-md leading-relaxed"
            style={{ color: '#aaa' }}
            initial={{ opacity: 0, y: 8 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 2.4, duration: 0.7 }}
          >
            {t('landing.heroValueProp')}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="mt-6 md:mt-8 flex flex-col sm:flex-row items-center md:items-start gap-3 sm:gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 2.6, duration: 0.6 }}
          >
            <Link
              to="/auth"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold tracking-wide transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #99FFCC, #66E0B0)',
                color: '#0a0a0a',
                boxShadow: '0 0 24px hsla(153, 100%, 80%, 0.35), 0 0 48px hsla(153, 100%, 80%, 0.15)',
              }}
            >
              {t('landing.ctaPrimary')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <button
              type="button"
              onClick={() => {
                const next = sectionRef.current?.nextElementSibling as HTMLElement | null;
                next?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full text-sm font-medium tracking-wide transition-all duration-300 hover:bg-white/5"
              style={{
                color: '#cfcfcf',
                border: '1px solid rgba(153, 255, 204, 0.25)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              {t('landing.ctaSecondary')}
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-16 lg:left-24 flex flex-col items-center gap-2 z-20"
        >
          <motion.span
            className="text-[10px] tracking-[0.3em] uppercase font-medium"
            style={{ color: '#444' }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {t('landing.scroll')}
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
