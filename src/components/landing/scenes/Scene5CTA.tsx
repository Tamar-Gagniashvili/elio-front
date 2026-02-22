import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import Starfield from '@/components/landing/Starfield';
import relinkLogo from '@/assets/relink-logo-3d.png';

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

  return (
    <section ref={ref} className="relative py-32 md:py-40 overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 0%, #0d1f15 0%, #080808 50%, #000000 100%)' }}>
      <Starfield />

      <motion.div
        className="container max-w-screen-md text-center relative z-10"
        style={{ opacity, y, scale }}
      >

        <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none" style={{ color: '#f0f0f0' }}>
          READY TO{' '}
          <span style={{ color: '#99FFCC' }}>LINK</span>{' '}
          IT ALL?
        </h2>
        <p className="mt-5 text-lg md:text-xl max-w-md mx-auto font-light" style={{ color: '#666' }}>
          Start managing conversations, objects, and teams in one unified platform.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 h-14 px-10 text-lg font-bold rounded-full transition-all duration-200 hover:scale-105"
            style={{ background: '#99FFCC', color: '#0a0a0a' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <a
            href="mailto:contact@relink.io"
            className="inline-flex items-center gap-2 h-14 px-10 text-lg font-semibold rounded-full transition-colors duration-200"
            style={{ border: '1px solid #333', color: '#ccc' }}
          >
            <Mail className="h-5 w-5" />
            Contact Us
          </a>
        </div>

        <div className="mt-10 flex items-center justify-center gap-6 text-sm" style={{ color: '#555' }}>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ background: '#99FFCC' }} />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ background: '#99FFCC' }} />
            <span>5-minute setup</span>
          </div>
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
