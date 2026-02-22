import { motion, useScroll, useTransform } from 'framer-motion';
import cosmonautStanding from '@/assets/landing/cosmonaut-standing.png';

export default function FlyingCosmonaut() {
  const { scrollYProgress } = useScroll();

  // Only visible after the hero section (after ~15% scroll when cosmonaut leaves 3D scene)
  const opacity = useTransform(scrollYProgress, [0.08, 0.15, 0.9, 1], [0, 1, 1, 0]);

  const x = useTransform(scrollYProgress, [0.1, 0.25, 0.5, 0.75, 1], ['75vw', '80vw', '20vw', '70vw', '50vw']);
  const y = useTransform(scrollYProgress, [0.1, 0.25, 0.5, 0.75, 1], ['15vh', '30vh', '60vh', '20vh', '75vh']);
  const rotate = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [0, 25, -15, 20, 0]);
  const scale = useTransform(scrollYProgress, [0.08, 0.2, 0.5, 0.85, 1], [0.3, 0.7, 0.6, 0.8, 0.5]);

  return (
    <motion.img
      src={cosmonautStanding}
      alt="Flying cosmonaut"
      className="fixed z-50 w-16 h-16 md:w-20 md:h-20 pointer-events-none drop-shadow-[0_0_15px_rgba(153,255,204,0.4)]"
      style={{ x, y, rotate, scale, opacity }}
    />
  );
}
