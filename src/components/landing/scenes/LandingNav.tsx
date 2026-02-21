import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import relinkLogo from '@/assets/relink-logo-3d.png';

export default function LandingNav() {
  const { scrollYProgress } = useScroll();
  const bgOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50"
      style={{ pointerEvents: 'auto' }}
    >
      <motion.div
        className="absolute inset-0 border-b"
        style={{
          opacity: bgOpacity,
          background: 'hsl(var(--background) / 0.85)',
          backdropFilter: 'blur(12px)',
          borderColor: 'hsl(var(--border) / 0.4)',
        }}
      />
      <div className="container max-w-screen-xl relative flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={relinkLogo} alt="ReLink" className="h-8 w-8 object-contain" />
          <span className="text-lg font-bold text-foreground">ReLink</span>
        </Link>
        <Button asChild size="sm">
          <Link to="/auth">Login</Link>
        </Button>
      </div>
    </motion.header>
  );
}
