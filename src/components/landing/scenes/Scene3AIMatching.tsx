import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Brain, Zap, ArrowRight, MessageSquare, Package } from 'lucide-react';
import Starfield from '@/components/landing/Starfield';
import cosmonautAi from '@/assets/landing/cosmonaut-ai.png';

export default function Scene3AIMatching() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const titleY = useTransform(scrollYProgress, [0.05, 0.2], [50, 0]);
  const titleOpacity = useTransform(scrollYProgress, [0.05, 0.2], [0, 1]);
  const leftRotate = useTransform(scrollYProgress, [0.15, 0.6], [5, 0]);
  const rightRotate = useTransform(scrollYProgress, [0.15, 0.6], [-5, 0]);
  const statsOpacity = useTransform(scrollYProgress, [0.4, 0.55], [0, 1]);
  const statsY = useTransform(scrollYProgress, [0.4, 0.55], [30, 0]);
  const bgImgOpacity = useTransform(scrollYProgress, [0.1, 0.3], [0, 0.15]);
  const bgImgScale = useTransform(scrollYProgress, [0.1, 0.6], [0.9, 1.05]);

  return (
    <section ref={ref} className="relative h-[200vh]" style={{ perspective: '1000px' }}>
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden z-10" style={{ background: 'transparent' }}>
        {/* Background cosmonaut */}
        <motion.img
          src={cosmonautAi}
          alt=""
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] object-contain pointer-events-none"
          style={{ opacity: bgImgOpacity, scale: bgImgScale }}
        />

        <motion.div className="container max-w-screen-xl relative z-10" style={{ opacity }}>
          {/* Title */}
          <motion.div className="text-center mb-16" style={{ opacity: titleOpacity, y: titleY }}>
            <span className="text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: '#99FFCC' }}>
              Intelligence Layer
            </span>
            <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight" style={{ color: '#f0f0f0' }}>
              FROM MESSAGE TO{' '}
              <span style={{ color: '#99FFCC' }}>MEANING.</span>
            </h2>
            <p className="mt-3 text-base max-w-lg mx-auto" style={{ color: '#666' }}>
              AI connects conversations to inventory, automatically surfacing the right match.
            </p>
          </motion.div>

          {/* Matching visualization */}
          <div className="max-w-4xl mx-auto relative">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
              {/* Left: Chat panel */}
              <motion.div
                className="rounded-2xl p-5"
                style={{
                  background: '#141414',
                  border: '1px solid #222',
                  rotateY: leftRotate,
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="h-5 w-5" style={{ color: '#99FFCC' }} />
                  <span className="font-bold text-sm" style={{ color: '#e0e0e0' }}>Active Conversations</span>
                </div>
                {['Looking for 2BR under $100k', 'Need office space downtown', 'Interested in new builds'].map((msg, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg mb-2 last:mb-0"
                    style={{
                      background: '#1a1a1a',
                      opacity: useTransform(scrollYProgress, [0.15 + i * 0.04, 0.25 + i * 0.04], [0, 1]),
                    }}
                  >
                    <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#99FFCC15', border: '1px solid #99FFCC30' }}>
                      <span className="text-xs font-bold" style={{ color: '#99FFCC' }}>{String.fromCharCode(65 + i)}</span>
                    </div>
                    <p className="text-xs" style={{ color: '#aaa' }}>{msg}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Center: Brain */}
              <div className="flex flex-col items-center gap-2 px-4">
                <motion.div
                  className="h-px w-24"
                  style={{
                    background: 'linear-gradient(to right, transparent, #99FFCC, transparent)',
                    scaleX: useTransform(scrollYProgress, [0.25, 0.45], [0, 1]),
                  }}
                />
                <motion.div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: '#99FFCC15',
                    border: '1px solid #99FFCC30',
                    scale: useTransform(scrollYProgress, [0.3, 0.45], [0.5, 1]),
                    opacity: useTransform(scrollYProgress, [0.3, 0.45], [0, 1]),
                  }}
                >
                  <Brain className="h-7 w-7" style={{ color: '#99FFCC' }} />
                </motion.div>
                <motion.div
                  className="h-px w-24"
                  style={{
                    background: 'linear-gradient(to right, transparent, #99FFCC, transparent)',
                    scaleX: useTransform(scrollYProgress, [0.35, 0.5], [0, 1]),
                  }}
                />
              </div>

              {/* Right: Objects panel */}
              <motion.div
                className="rounded-2xl p-5"
                style={{
                  background: '#141414',
                  border: '1px solid #222',
                  rotateY: rightRotate,
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5" style={{ color: '#99FFCC' }} />
                  <span className="font-bold text-sm" style={{ color: '#e0e0e0' }}>Matched Objects</span>
                </div>
                {[
                  { name: '2BR Studio — Saburtalo', match: '94%' },
                  { name: 'Office — Vera', match: '87%' },
                  { name: 'New Build — Didi Dighomi', match: '91%' },
                ].map((obj, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg mb-2 last:mb-0"
                    style={{
                      background: '#1a1a1a',
                      opacity: useTransform(scrollYProgress, [0.3 + i * 0.04, 0.42 + i * 0.04], [0, 1]),
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ background: '#99FFCC' }} />
                      <p className="text-xs" style={{ color: '#aaa' }}>{obj.name}</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: '#99FFCC' }}>{obj.match}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Stats row */}
            <motion.div className="grid grid-cols-3 gap-6 mt-12" style={{ opacity: statsOpacity, y: statsY }}>
              {[
                { icon: Zap, label: 'Avg. Response', value: '< 2 min' },
                { icon: Brain, label: 'Match Accuracy', value: '94%' },
                { icon: ArrowRight, label: 'Deals Closed Faster', value: '3.2×' },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-5 rounded-2xl" style={{ background: '#141414', border: '1px solid #222' }}>
                  <stat.icon className="h-6 w-6 mx-auto mb-2" style={{ color: '#99FFCC' }} />
                  <p className="text-2xl font-black" style={{ color: '#f0f0f0' }}>{stat.value}</p>
                  <p className="text-[10px] mt-1 tracking-wider uppercase" style={{ color: '#666' }}>{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
