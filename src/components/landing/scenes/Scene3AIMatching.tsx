import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Brain, Zap, ArrowRight, MessageSquare, Package } from 'lucide-react';
import cosmonautAi from '@/assets/landing/cosmonaut-ai.png';

export default function Scene3AIMatching() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="relative py-24 md:py-32 z-10">
      <div className="relative w-full flex items-center overflow-hidden">
        <img
          src={cosmonautAi}
          alt=""
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] object-contain pointer-events-none opacity-[0.15]"
        />

        <div className="container max-w-screen-xl relative z-10">
          <motion.div
            className="text-center mb-8 md:mb-16 px-4"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="text-[10px] md:text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: '#99FFCC' }}>
              {t('landing.scene3Label')}
            </span>
            <h2 className="mt-2 md:mt-3 text-2xl sm:text-4xl md:text-6xl font-black tracking-tight" style={{ color: '#f0f0f0' }}>
              {t('landing.scene3Title')}{' '}
              <span style={{ color: '#99FFCC' }}>{t('landing.scene3TitleHighlight')}</span>
            </h2>
            <p className="mt-2 md:mt-3 text-sm md:text-base max-w-lg mx-auto" style={{ color: '#666' }}>
              {t('landing.scene3Desc')}
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto relative px-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
              <motion.div
                className="rounded-2xl p-3 md:p-5"
                initial={{ opacity: 0, x: -40 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.2 }}
                style={{ background: '#141414', border: '1px solid #222' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="h-5 w-5" style={{ color: '#99FFCC' }} />
                  <span className="font-bold text-sm" style={{ color: '#e0e0e0' }}>{t('landing.activeConversations')}</span>
                </div>
                {['Looking for 2BR under $100k', 'Need office space downtown', 'Interested in new builds'].map((msg, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg mb-2 last:mb-0"
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.4 + i * 0.15 }}
                    style={{ background: '#1a1a1a' }}
                  >
                    <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#99FFCC15', border: '1px solid #99FFCC30' }}>
                      <span className="text-xs font-bold" style={{ color: '#99FFCC' }}>{String.fromCharCode(65 + i)}</span>
                    </div>
                    <p className="text-xs" style={{ color: '#aaa' }}>{msg}</p>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                className="hidden md:flex flex-col items-center gap-2 px-4"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="h-px w-24" style={{ background: 'linear-gradient(to right, transparent, #99FFCC, transparent)' }} />
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: '#99FFCC15', border: '1px solid #99FFCC30' }}>
                  <Brain className="h-7 w-7" style={{ color: '#99FFCC' }} />
                </div>
                <div className="h-px w-24" style={{ background: 'linear-gradient(to right, transparent, #99FFCC, transparent)' }} />
              </motion.div>

              <motion.div
                className="rounded-2xl p-3 md:p-5"
                initial={{ opacity: 0, x: 40 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.3 }}
                style={{ background: '#141414', border: '1px solid #222' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5" style={{ color: '#99FFCC' }} />
                  <span className="font-bold text-sm" style={{ color: '#e0e0e0' }}>{t('landing.matchedObjects')}</span>
                </div>
                {[
                  { name: '2BR Studio — Saburtalo', match: '94%' },
                  { name: 'Office — Vera', match: '87%' },
                  { name: 'New Build — Didi Dighomi', match: '91%' },
                ].map((obj, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg mb-2 last:mb-0"
                    initial={{ opacity: 0 }}
                    animate={isInView ? { opacity: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.15 }}
                    style={{ background: '#1a1a1a' }}
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

            <motion.div
              className="grid grid-cols-3 gap-3 md:gap-6 mt-8 md:mt-12"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              {[
                { icon: Zap, label: t('landing.avgResponse'), value: '< 2 min' },
                { icon: Brain, label: t('landing.matchAccuracy'), value: '94%' },
                { icon: ArrowRight, label: t('landing.dealsClosedFaster'), value: '3.2×' },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-3 md:p-5 rounded-2xl" style={{ background: '#141414', border: '1px solid #222' }}>
                  <stat.icon className="h-5 w-5 md:h-6 md:w-6 mx-auto mb-2" style={{ color: '#99FFCC' }} />
                  <p className="text-lg md:text-2xl font-black" style={{ color: '#f0f0f0' }}>{stat.value}</p>
                  <p className="text-[8px] md:text-[10px] mt-1 tracking-wider uppercase" style={{ color: '#666' }}>{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
