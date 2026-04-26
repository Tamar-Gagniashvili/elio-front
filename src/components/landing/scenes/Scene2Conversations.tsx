import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send, Instagram, Facebook, User, Star } from 'lucide-react';
import cosmonautFloating from '@/assets/landing/cosmonaut-floating.png';
import AnimatedFirefly from '../AnimatedFirefly';


const chatMessages = [
  { sender: 'contact', text: 'Hey! I sent a DM on Instagram earlier 👋', time: '2:14 PM' },
  { sender: 'contact', text: 'Can we continue here on WhatsApp?', time: '2:14 PM' },
  { sender: 'agent', text: 'Of course — I have your full history right here ✨', time: '2:15 PM' },
];

export default function Scene2Conversations() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="relative py-24 md:py-32 z-10">
      <div className="container max-w-screen-xl relative">
        <motion.div
          className="text-center mb-6 md:mb-12 px-4"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-[10px] md:text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: '#99FFCC' }}>
            {t('landing.scene2Label')}
          </span>
          <h2 className="mt-2 md:mt-3 text-2xl sm:text-4xl md:text-6xl font-black tracking-tight" style={{ color: '#f0f0f0' }}>
            {t('landing.scene2Title')}{' '}
            <span style={{ color: '#99FFCC' }}>{t('landing.scene2TitleHighlight')}</span>
          </h2>
          <p className="mt-2 md:mt-3 text-sm md:text-base max-w-lg mx-auto" style={{ color: '#666' }}>
            {t('landing.scene2Desc')}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8 items-center max-w-5xl mx-auto px-4">
          <motion.div
            className="hidden md:flex items-center justify-center relative"
            initial={{ opacity: 0, x: -60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            
            <motion.img
              src={cosmonautFloating}
              alt="Floating cosmonaut"
              className="w-[280px] md:w-[340px] lg:w-[420px] h-auto drop-shadow-[0_0_40px_rgba(153,255,204,0.25)]"
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                WebkitMaskImage: 'radial-gradient(ellipse 65% 70% at 50% 45%, black 40%, transparent 75%)',
                maskImage: 'radial-gradient(ellipse 65% 70% at 50% 45%, black 40%, transparent 75%)',
              }}
            />
            {/* Firefly hovering above the astronaut's hand */}
            <motion.div
              className="absolute pointer-events-none"
              style={{ left: '18%', top: '46%' }}
              animate={{ y: [0, -10, 0, -6, 0], x: [0, 4, 0, -3, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <AnimatedFirefly size={88} />
            </motion.div>
          </motion.div>

          <div className="space-y-4">
            <motion.div
              className="rounded-2xl overflow-hidden"
              initial={{ opacity: 0, x: 60 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.3 }}
              style={{ background: '#141414', border: '1px solid #222' }}
            >
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid #222' }}>
                <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: '#1a1a1a', border: '1px solid #333' }}>
                  <User className="h-5 w-5" style={{ color: '#99FFCC' }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#e0e0e0' }}>Giorgi Beridze</p>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ background: '#25D366' }} />
                    <span className="text-xs" style={{ color: '#666' }}>WhatsApp</span>
                  </div>
                </div>
                <div className="ml-auto flex gap-1">
                  {[MessageCircle, Send, Instagram, Facebook].map((Icon, i) => (
                    <div key={i} className="h-6 w-6 rounded-full flex items-center justify-center" style={{ background: '#1a1a1a' }}>
                      <Icon className="h-3 w-3" style={{ color: '#555' }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 space-y-3 min-h-[220px]">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                      style={{
                        background: msg.sender === 'agent' ? '#99FFCC' : '#1e1e1e',
                        color: msg.sender === 'agent' ? '#0a0a0a' : '#d0d0d0',
                        borderRadius: msg.sender === 'agent' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      }}
                    >
                      <p>{msg.text}</p>
                      <p className="text-[10px] mt-1" style={{ opacity: 0.5 }}>{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="rounded-xl p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.6 }}
              style={{
                background: 'linear-gradient(135deg, #99FFCC10, #99FFCC05)',
                border: '1px dashed #99FFCC40',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: '#99FFCC20' }}>
                  <Star className="h-4 w-4" style={{ color: '#99FFCC' }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#99FFCC' }}>{t('landing.aiSuggestion')}</p>
                  <p className="text-xs mt-1" style={{ color: '#888' }}>
                    {t('landing.aiSuggestionText')}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
