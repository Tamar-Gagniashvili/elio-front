import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Home, Truck, Car, ShoppingBag } from 'lucide-react';
import Starfield from '@/components/landing/Starfield';
import cosmonautIndustries from '@/assets/landing/cosmonaut-industries.png';

const industries = [
  {
    icon: Home,
    title: 'Real Estate',
    description: 'Link properties to conversations. Track viewings, reservations, and buyer intent.',
    objects: ['Apartments', 'Commercial', 'Land'],
    accent: '#99FFCC',
  },
  {
    icon: Truck,
    title: 'Logistics',
    description: 'Attach shipments and orders. Real-time tracking within your inbox.',
    objects: ['Shipments', 'Orders', 'Routes'],
    accent: '#66BBFF',
  },
  {
    icon: Car,
    title: 'Automotive',
    description: 'Connect vehicles to leads. Manage test drives, offers, and inventory.',
    objects: ['Vehicles', 'Test Drives', 'Offers'],
    accent: '#FFD666',
  },
  {
    icon: ShoppingBag,
    title: 'Retail',
    description: 'Link products and orders. Turn conversations into sales effortlessly.',
    objects: ['Products', 'Orders', 'Returns'],
    accent: '#FF88AA',
  },
];

export default function Scene4Industries() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0.05, 0.18], [0, 1]);
  const titleY = useTransform(scrollYProgress, [0.05, 0.18], [40, 0]);
  const bgImgOpacity = useTransform(scrollYProgress, [0.03, 0.35], [0, 0.1]);

  return (
    <section ref={ref} className="relative h-[200vh]">
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden z-10">
        {/* Background cosmonaut */}
        <motion.img
          src={cosmonautIndustries}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: bgImgOpacity }}
        />

        <motion.div className="container max-w-screen-xl relative z-10" style={{ opacity }}>
          <motion.div className="text-center mb-8 md:mb-14 px-4" style={{ opacity: titleOpacity, y: titleY }}>
            <span className="text-[10px] md:text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: '#99FFCC' }}>
              Any Industry
            </span>
            <h2 className="mt-2 md:mt-3 text-2xl sm:text-4xl md:text-6xl font-black tracking-tight" style={{ color: '#f0f0f0' }}>
              THE SYSTEM THAT{' '}
              <span style={{ color: '#99FFCC' }}>LINKS</span> IT ALL.
            </h2>
            <p className="mt-2 md:mt-3 text-sm md:text-base max-w-lg mx-auto" style={{ color: '#666' }}>
              ReLink adapts to your business. Define your own objects, statuses, and workflows.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 max-w-5xl mx-auto px-4">
            {industries.map((ind, i) => (
              <motion.div
                key={ind.title}
                className="group rounded-xl md:rounded-2xl p-4 md:p-6 transition-all duration-300 backdrop-blur-sm"
                style={{
                  background: 'rgba(20, 20, 20, 0.85)',
                  border: '1px solid #222',
                  opacity: useTransform(scrollYProgress, [0.15 + i * 0.04, 0.28 + i * 0.04], [0, 1]),
                  y: useTransform(scrollYProgress, [0.15 + i * 0.04, 0.28 + i * 0.04], [50, 0]),
                  rotateY: useTransform(scrollYProgress, [0.15 + i * 0.04, 0.35 + i * 0.04], [i < 2 ? 8 : -8, 0]),
                  transformStyle: 'preserve-3d',
                }}
              >
                <div
                  className="h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center mb-3 md:mb-4"
                  style={{ background: `${ind.accent}15`, border: `1px solid ${ind.accent}30` }}
                >
                  <ind.icon className="h-5 w-5 md:h-6 md:w-6" style={{ color: ind.accent }} />
                </div>
                <h3 className="text-base md:text-lg font-bold mb-1 md:mb-2" style={{ color: '#e0e0e0' }}>{ind.title}</h3>
                <p className="text-xs md:text-sm mb-3 md:mb-4 leading-relaxed hidden sm:block" style={{ color: '#777' }}>{ind.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {ind.objects.map((obj) => (
                    <span
                      key={obj}
                      className="text-[10px] font-medium px-2 py-1 rounded-full"
                      style={{ background: '#1e1e1e', color: '#888', border: '1px solid #2a2a2a' }}
                    >
                      {obj}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
