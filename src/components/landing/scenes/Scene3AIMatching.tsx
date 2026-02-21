import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Brain, Zap, ArrowRight, MessageSquare, Package } from 'lucide-react';

export default function Scene3AIMatching() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const titleY = useTransform(scrollYProgress, [0.05, 0.2], [50, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0.05, 0.2], [0, 1]);
  const lineWidth = useTransform(scrollYProgress, [0.25, 0.5], ['0%', '100%']);
  const leftRotate = useTransform(scrollYProgress, [0.15, 0.6], [5, 0]);
  const rightRotate = useTransform(scrollYProgress, [0.15, 0.6], [-5, 0]);
  const statsOpacity = useTransform(scrollYProgress, [0.4, 0.55], [0, 1]);
  const statsY = useTransform(scrollYProgress, [0.4, 0.55], [30, 0]);

  return (
    <section ref={ref} className="relative h-[200vh]" style={{ perspective: '1000px' }}>
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden bg-background z-10">
        <motion.div className="container max-w-screen-xl" style={{ opacity }}>
          {/* Title */}
          <motion.div className="text-center mb-16" style={{ opacity: titleOpacity, y: titleY }}>
            <span className="text-sm font-semibold tracking-widest uppercase text-primary">
              Intelligence Layer
            </span>
            <h2 className="mt-2 text-3xl md:text-5xl font-bold text-foreground">
              From Message to <span className="text-primary">Meaning</span>
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-lg mx-auto">
              AI connects conversations to inventory, automatically surfacing the right match.
            </p>
          </motion.div>

          {/* Matching visualization */}
          <div className="max-w-4xl mx-auto relative">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
              {/* Left: Chat panel */}
              <motion.div
                className="rounded-2xl border border-border/50 bg-card p-5 shadow-lg"
                style={{ rotateY: leftRotate, transformStyle: 'preserve-3d' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground text-sm">Active Conversations</span>
                </div>
                {['Looking for 2BR under $100k', 'Need office space downtown', 'Interested in new builds'].map((msg, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-2 last:mb-0"
                    style={{
                      opacity: useTransform(scrollYProgress, [0.15 + i * 0.04, 0.25 + i * 0.04], [0, 1]),
                    }}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{String.fromCharCode(65 + i)}</span>
                    </div>
                    <p className="text-xs text-foreground">{msg}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Center: Connecting line + brain */}
              <div className="flex flex-col items-center gap-2 px-4">
                <motion.div
                  className="h-px bg-gradient-to-r from-primary/50 via-primary to-primary/50 w-24"
                  style={{ scaleX: useTransform(scrollYProgress, [0.25, 0.45], [0, 1]) }}
                />
                <motion.div
                  className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center"
                  style={{
                    scale: useTransform(scrollYProgress, [0.3, 0.45], [0.5, 1]),
                    opacity: useTransform(scrollYProgress, [0.3, 0.45], [0, 1]),
                  }}
                >
                  <Brain className="h-7 w-7 text-primary" />
                </motion.div>
                <motion.div
                  className="h-px bg-gradient-to-r from-primary/50 via-primary to-primary/50 w-24"
                  style={{ scaleX: useTransform(scrollYProgress, [0.35, 0.5], [0, 1]) }}
                />
              </div>

              {/* Right: Objects panel */}
              <motion.div
                className="rounded-2xl border border-border/50 bg-card p-5 shadow-lg"
                style={{ rotateY: rightRotate, transformStyle: 'preserve-3d' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground text-sm">Matched Objects</span>
                </div>
                {[
                  { name: '2BR Studio — Saburtalo', match: '94%' },
                  { name: 'Office — Vera', match: '87%' },
                  { name: 'New Build — Didi Dighomi', match: '91%' },
                ].map((obj, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 mb-2 last:mb-0"
                    style={{
                      opacity: useTransform(scrollYProgress, [0.3 + i * 0.04, 0.42 + i * 0.04], [0, 1]),
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      <p className="text-xs text-foreground">{obj.name}</p>
                    </div>
                    <span className="text-xs font-bold text-primary">{obj.match}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Stats row */}
            <motion.div
              className="grid grid-cols-3 gap-6 mt-12"
              style={{ opacity: statsOpacity, y: statsY }}
            >
              {[
                { icon: Zap, label: 'Avg. Response', value: '< 2 min' },
                { icon: Brain, label: 'Match Accuracy', value: '94%' },
                { icon: ArrowRight, label: 'Deals Closed Faster', value: '3.2×' },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-5 rounded-2xl bg-card border border-border/50">
                  <stat.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
