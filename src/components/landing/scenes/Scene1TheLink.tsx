import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import globeHero from '@/assets/landing/globe-hero.png';
import relinkLogo from '@/assets/relink-logo-3d.png';

export default function Scene1TheLink() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const globeScale = useTransform(scrollYProgress, [0, 0.6], [1, 1.4]);
  const globeOpacity = useTransform(scrollYProgress, [0.5, 0.8], [1, 0]);
  const globeY = useTransform(scrollYProgress, [0, 0.6], [0, -60]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.05, 0.5, 0.7], [0, 1, 1, 0]);
  const subtitleOpacity = useTransform(scrollYProgress, [0.05, 0.15, 0.5, 0.7], [0, 1, 1, 0]);
  const subtitleY = useTransform(scrollYProgress, [0.05, 0.15], [30, 0]);
  const ctaOpacity = useTransform(scrollYProgress, [0.1, 0.2, 0.5, 0.7], [0, 1, 1, 0]);
  const scrollIndicator = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative h-[200vh] w-full"
      style={{ background: '#050510' }}
    >
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        {/* Star particles */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() > 0.8 ? 3 : Math.random() > 0.5 ? 2 : 1,
                height: Math.random() > 0.8 ? 3 : Math.random() > 0.5 ? 2 : 1,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                background: Math.random() > 0.7 ? '#99FFCC' : 'rgba(255,255,255,0.6)',
                opacity: 0.3 + Math.random() * 0.7,
                animation: `twinkle ${2 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        {/* Globe */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          style={{ scale: globeScale, opacity: globeOpacity, y: globeY }}
        >
          <img
            src={globeHero}
            alt="Earth from space"
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Gradient overlay for text readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center 40%, transparent 30%, rgba(5,5,16,0.6) 70%, rgba(5,5,16,0.95) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 text-center px-4">
          <motion.div className="flex items-center justify-center gap-3 mb-6" style={{ opacity: titleOpacity }}>
            <img src={relinkLogo} alt="" className="h-12 w-12 md:h-16 md:w-16 object-contain rounded-2xl" />
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase leading-none"
            style={{ color: '#f0f0f0', opacity: titleOpacity }}
          >
            Re<span style={{ color: '#99FFCC' }}>Link</span>
          </motion.h1>

          <motion.p
            className="mt-6 text-lg md:text-2xl max-w-2xl mx-auto font-light tracking-wide"
            style={{ color: 'rgba(255,255,255,0.6)', opacity: subtitleOpacity, y: subtitleY }}
          >
            Where Conversations Become Connections.
          </motion.p>

          <motion.p
            className="mt-3 text-sm md:text-base max-w-lg mx-auto"
            style={{ color: 'rgba(255,255,255,0.35)', opacity: subtitleOpacity, y: subtitleY }}
          >
            The omnichannel system that links messages, objects, and teams across the globe.
          </motion.p>

          <motion.div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4" style={{ opacity: ctaOpacity }}>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 h-14 px-10 text-lg font-bold rounded-full transition-all duration-200 hover:scale-105"
              style={{ background: '#99FFCC', color: '#0a0a0a' }}
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20"
          style={{ opacity: scrollIndicator }}
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

      {/* Twinkle animation */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </section>
  );
}
