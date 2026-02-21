import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Home, Truck, Car, ShoppingBag } from 'lucide-react';

const industries = [
  {
    icon: Home,
    title: 'Real Estate',
    description: 'Link properties to conversations. Track viewings, reservations, and buyer intent.',
    objects: ['Apartments', 'Commercial', 'Land'],
    accent: 'hsl(173 80% 40%)',
  },
  {
    icon: Truck,
    title: 'Logistics',
    description: 'Attach shipments and orders. Real-time tracking within your inbox.',
    objects: ['Shipments', 'Orders', 'Routes'],
    accent: 'hsl(221 90% 55%)',
  },
  {
    icon: Car,
    title: 'Automotive',
    description: 'Connect vehicles to leads. Manage test drives, offers, and inventory.',
    objects: ['Vehicles', 'Test Drives', 'Offers'],
    accent: 'hsl(38 92% 50%)',
  },
  {
    icon: ShoppingBag,
    title: 'Retail',
    description: 'Link products and orders. Turn conversations into sales effortlessly.',
    objects: ['Products', 'Orders', 'Returns'],
    accent: 'hsl(330 80% 55%)',
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

  return (
    <section ref={ref} className="relative h-[200vh]">
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden bg-background z-10">
        <motion.div className="container max-w-screen-xl" style={{ opacity }}>
          <motion.div className="text-center mb-14" style={{ opacity: titleOpacity, y: titleY }}>
            <span className="text-sm font-semibold tracking-widest uppercase text-primary">
              Any Industry
            </span>
            <h2 className="mt-2 text-3xl md:text-5xl font-bold text-foreground">
              The System That <span className="text-primary">Links</span> It All
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-lg mx-auto">
              ReLink adapts to your business. Define your own objects, statuses, and workflows.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {industries.map((ind, i) => (
              <motion.div
                key={ind.title}
                className="group rounded-2xl border border-border/50 bg-card p-6 shadow-lg hover:shadow-xl transition-shadow"
                style={{
                  opacity: useTransform(scrollYProgress, [0.15 + i * 0.04, 0.28 + i * 0.04], [0, 1]),
                  y: useTransform(scrollYProgress, [0.15 + i * 0.04, 0.28 + i * 0.04], [50, 0]),
                  rotateY: useTransform(scrollYProgress, [0.15 + i * 0.04, 0.35 + i * 0.04], [i < 2 ? 8 : -8, 0]),
                  transformStyle: 'preserve-3d',
                }}
              >
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${ind.accent}18` }}
                >
                  <ind.icon className="h-6 w-6" style={{ color: ind.accent }} />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{ind.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{ind.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {ind.objects.map((obj) => (
                    <span
                      key={obj}
                      className="text-[10px] font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground"
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
