import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import relinkLogo from '@/assets/relink-logo-3d.png';

export default function LandingNav() {
  const { scrollYProgress } = useScroll();
  const bgOpacity = useTransform(scrollYProgress, [0, 0.03], [0, 1]);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50"
      style={{ pointerEvents: 'auto' }}
    >
      <motion.div
        className="absolute inset-0 border-b"
        style={{
          opacity: bgOpacity,
          background: 'hsla(240 50% 4% / 0.85)',
          backdropFilter: 'blur(16px)',
          borderColor: 'hsla(0 0% 100% / 0.06)',
        }}
      />
      <div className="container max-w-screen-xl relative flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={relinkLogo} alt="ReLink" className="h-8 w-8 object-contain rounded-lg" />
          <span className="text-lg font-bold" style={{ color: '#f0f0f0' }}>ReLink</span>
        </Link>
        <Button asChild size="sm" className="bg-[#99FFCC] text-[#050510] hover:bg-[#77eebb] font-semibold rounded-full px-5">
          <Link to="/auth">Login</Link>
        </Button>
      </div>
    </motion.header>
  );
}
