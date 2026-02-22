import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import Starfield from '@/components/landing/Starfield';
import relinkLogo from '@/assets/relink-logo-3d.png';
import cosmonautHolding from '@/assets/landing/cosmonaut-holding.png';

export default function Scene5CTA() {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end end'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.3], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 0.3], [60, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [0.95, 1]);

  // Cosmonaut flies in from right
  const cosmonautX = useTransform(scrollYProgress, [0.1, 0.5], [300, 0]);
  const cosmonautOpacity = useTransform(scrollYProgress, [0.1, 0.35], [0, 1]);
  const cosmonautRotate = useTransform(scrollYProgress, [0.1, 0.5], [-20, 5]);

  return (
    <section ref={ref} className="relative py-32 md:py-40 overflow-hidden">

      <motion.div
        className="container max-w-screen-xl relative z-10"
        style={{ opacity, y, scale }}
      >
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-6">
          {/* Left: Text + Get Started */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none" style={{ color: '#f0f0f0' }}>
              READY TO{' '}
              <span style={{ color: '#99FFCC' }}>LINK</span>{' '}
              IT ALL?
            </h2>
            <p className="mt-4 md:mt-5 text-base md:text-xl max-w-md font-light mx-auto lg:mx-0" style={{ color: '#666' }}>
              Start managing conversations, objects, and teams in one unified platform.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center lg:items-start gap-4">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 h-12 md:h-14 px-8 md:px-10 text-base md:text-lg font-bold rounded-full transition-all duration-200 hover:scale-105"
                style={{ background: '#99FFCC', color: '#0a0a0a' }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm justify-center lg:justify-start" style={{ color: '#555' }}>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: '#99FFCC' }} />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ background: '#99FFCC' }} />
                <span>5-minute setup</span>
              </div>
            </div>
          </div>

          {/* Right: Cosmonaut holding Contact Us */}
          <motion.div
            className="relative flex-shrink-0 flex flex-col items-center"
            style={{
              x: cosmonautX,
              opacity: cosmonautOpacity,
              rotate: cosmonautRotate,
            }}
          >
            <motion.img
              src={cosmonautHolding}
              alt="Cosmonaut holding contact button"
              className="w-[240px] sm:w-[340px] md:w-[440px] h-auto"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 45%, black 40%, transparent 75%)',
                maskImage: 'radial-gradient(ellipse 70% 70% at 50% 45%, black 40%, transparent 75%)',
              }}
            />
            {/* Contact Us button between the cosmonaut's hands */}
            <motion.a
              href="mailto:contact@relink.io"
              className="absolute inline-flex items-center gap-2 h-11 md:h-14 px-6 md:px-10 text-sm md:text-lg font-bold rounded-full transition-colors duration-200 hover:scale-105"
              style={{
                bottom: '36%',
                border: '2px solid #99FFCC',
                color: '#99FFCC',
                background: 'rgba(153, 255, 204, 0.15)',
                boxShadow: '0 0 40px rgba(153, 255, 204, 0.3), 0 0 80px rgba(153, 255, 204, 0.1)',
              }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Mail className="h-5 w-5" />
              Contact Us
            </motion.a>
          </motion.div>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="container max-w-screen-xl mt-24 pt-8" style={{ borderTop: '1px solid #1e1e1e' }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={relinkLogo} alt="ReLink" className="h-6 w-6 object-contain rounded-md" />
            <span className="font-bold" style={{ color: '#e0e0e0' }}>ReLink</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: '#555' }}>
            <Link to="/auth" className="hover:text-[#99FFCC] transition-colors">Login</Link>
            <a href="mailto:contact@relink.io" className="hover:text-[#99FFCC] transition-colors">Contact</a>
          </div>
          <p className="text-sm" style={{ color: '#444' }}>
            © {new Date().getFullYear()} ReLink. All rights reserved.
          </p>
        </div>
      </div>
    </section>
  );
}
