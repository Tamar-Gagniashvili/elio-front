import { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <section ref={ref} className="relative py-32 md:py-40 overflow-hidden" style={{ background: 'hsl(222 47% 8%)' }}>
      {/* Ambient glows */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, hsl(173 80% 40% / 0.08) 0%, transparent 70%)' }}
      />

      <motion.div
        className="container max-w-screen-md text-center relative z-10"
        style={{ opacity, y, scale }}
      >
        {/* Animated chain link logo */}
        <motion.div
          className="mx-auto mb-10 relative"
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
        >
          <motion.img
            src={relinkLogo}
            alt="ReLink"
            className="h-20 w-20 mx-auto object-contain"
            animate={{ rotate: isHovered ? 10 : 0, scale: isHovered ? 1.1 : 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          />
        </motion.div>

        <h2 className="text-4xl md:text-6xl font-bold leading-tight" style={{ color: 'hsl(220 14% 96%)' }}>
          Ready to <span style={{ color: 'hsl(173 80% 40%)' }}>Link</span> It All?
        </h2>
        <p className="mt-5 text-lg md:text-xl max-w-md mx-auto" style={{ color: 'hsl(220 9% 60%)' }}>
          Start managing conversations, objects, and teams in one unified platform.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            asChild
            className="h-14 px-10 text-lg gradient-primary hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <Link to="/auth" className="flex items-center gap-2">
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="h-14 px-10 text-lg border-2 border-[hsl(220_9%_25%)] text-[hsl(220_14%_96%)] hover:bg-[hsl(222_47%_15%)]">
            <a href="mailto:contact@relink.io" className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Us
            </a>
          </Button>
        </div>

        <div className="mt-10 flex items-center justify-center gap-6 text-sm" style={{ color: 'hsl(220 9% 50%)' }}>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ background: 'hsl(142 76% 36%)' }} />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ background: 'hsl(142 76% 36%)' }} />
            <span>5-minute setup</span>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="container max-w-screen-xl mt-24 pt-8 border-t" style={{ borderColor: 'hsl(222 30% 18%)' }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={relinkLogo} alt="ReLink" className="h-6 w-6 object-contain" />
            <span className="font-bold" style={{ color: 'hsl(220 14% 96%)' }}>ReLink</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'hsl(220 9% 50%)' }}>
            <Link to="/auth" className="hover:text-[hsl(220_14%_96%)] transition-colors">Login</Link>
            <a href="mailto:contact@relink.io" className="hover:text-[hsl(220_14%_96%)] transition-colors">Contact</a>
          </div>
          <p className="text-sm" style={{ color: 'hsl(220 9% 40%)' }}>
            © {new Date().getFullYear()} ReLink. All rights reserved.
          </p>
        </div>
      </div>
    </section>
  );
}
