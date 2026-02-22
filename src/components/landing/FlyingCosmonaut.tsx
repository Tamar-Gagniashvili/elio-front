import { motion, useScroll, useTransform } from 'framer-motion';
import cosmonautFly from '@/assets/landing/cosmonaut-fly.png';

export default function FlyingCosmonaut() {
  const { scrollYProgress } = useScroll();

  const x = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], ['-10vw', '80vw', '20vw', '70vw', '50vw']);
  const y = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], ['15vh', '30vh', '60vh', '20vh', '75vh']);
  const rotate = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], [0, 25, -15, 20, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.15, 0.5, 0.85, 1], [0.6, 1, 0.8, 1, 0.7]);

  return (
    <motion.img
      src={cosmonautFly}
      alt="Flying cosmonaut"
      className="fixed z-50 w-16 h-16 md:w-20 md:h-20 pointer-events-none drop-shadow-[0_0_15px_rgba(153,255,204,0.4)]"
      style={{ x, y, rotate, scale }}
    />
  );
}
