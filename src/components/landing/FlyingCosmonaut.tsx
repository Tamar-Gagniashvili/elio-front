import { motion, useScroll, useTransform } from 'framer-motion';
import cosmonautStanding from '@/assets/landing/cosmonaut-standing.png';

export default function FlyingCosmonaut() {
  const { scrollYProgress } = useScroll();

  // Appear from the right as section 2 enters (~12-20% scroll)
  const x = useTransform(scrollYProgress, [0.10, 0.18, 0.5, 0.75, 1], ['110vw', '78vw', '20vw', '70vw', '50vw']);
  const y = useTransform(scrollYProgress, [0.10, 0.18, 0.5, 0.75, 1], ['10vh', '15vh', '55vh', '20vh', '70vh']);
  const opacity = useTransform(scrollYProgress, [0.10, 0.15, 0.9, 1], [0, 1, 1, 0]);
  const rotate = useTransform(scrollYProgress, [0.10, 0.25, 0.5, 0.75, 1], [-30, 10, -10, 15, 0]);
  const scale = useTransform(scrollYProgress, [0.10, 0.2, 0.5, 0.85, 1], [0.5, 0.7, 0.6, 0.8, 0.5]);

  return (
    <motion.img
      src={cosmonautStanding}
      alt="Flying cosmonaut"
      className="fixed z-50 w-16 h-16 md:w-20 md:h-20 pointer-events-none drop-shadow-[0_0_15px_rgba(153,255,204,0.4)]"
      style={{ x, y, rotate, scale, opacity }}
    />
  );
}
