import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send, Instagram, Facebook, Globe, Phone } from 'lucide-react';

export default function Scene4Industries() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const channels = [
    { icon: MessageCircle, name: t('landing.channelWhatsapp'), desc: t('landing.channelWhatsappDesc'), accent: '#25D366' },
    { icon: Send, name: t('landing.channelTelegram'), desc: t('landing.channelTelegramDesc'), accent: '#29B6F6' },
    { icon: Instagram, name: t('landing.channelInstagram'), desc: t('landing.channelInstagramDesc'), accent: '#E1306C' },
    { icon: Facebook, name: t('landing.channelMessenger'), desc: t('landing.channelMessengerDesc'), accent: '#7C8CFF' },
    { icon: Globe, name: t('landing.channelWebchat'), desc: t('landing.channelWebchatDesc'), accent: '#99FFCC' },
    { icon: Phone, name: t('landing.channelSms'), desc: t('landing.channelSmsDesc'), accent: '#FFD666' },
  ];

  return (
    <section ref={ref} className="relative py-24 md:py-32 z-10 overflow-hidden">
      <div className="container max-w-screen-xl relative z-10">
        <motion.div
          className="text-center mb-10 md:mb-16 px-4"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="text-[10px] md:text-xs font-semibold tracking-[0.3em] uppercase" style={{ color: '#99FFCC' }}>
            {t('landing.scene4Label')}
          </span>
          <h2 className="mt-2 md:mt-3 text-2xl sm:text-4xl md:text-6xl font-black tracking-tight" style={{ color: '#f0f0f0' }}>
            {t('landing.scene4Title')}{' '}
            <span style={{ color: '#99FFCC' }}>{t('landing.scene4TitleHighlight')}</span>{' '}
            {t('landing.scene4TitleEnd')}
          </h2>
          <p className="mt-3 text-sm md:text-base max-w-xl mx-auto" style={{ color: '#666' }}>
            {t('landing.scene4Desc')}
          </p>
        </motion.div>

        {/* Channel cards grid */}
        <div className="relative max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {channels.map((c, i) => (
              <motion.div
                key={c.name}
                className="group relative rounded-xl md:rounded-2xl p-4 md:p-5 backdrop-blur-sm overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                style={{
                  background: 'rgba(18, 18, 18, 0.85)',
                  border: '1px solid #1f1f1f',
                }}
              >
                {/* Soft accent glow on hover */}
                <div
                  className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle, ${c.accent}25, transparent 70%)` }}
                />

                <div className="flex items-center gap-3 mb-2 relative">
                  <div
                    className="h-9 w-9 md:h-10 md:w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${c.accent}15`, border: `1px solid ${c.accent}30` }}
                  >
                    <c.icon className="h-4 w-4 md:h-5 md:w-5" style={{ color: c.accent }} />
                  </div>
                  <h3 className="text-sm md:text-base font-bold" style={{ color: '#e0e0e0' }}>
                    {c.name}
                  </h3>
                </div>
                <p className="text-[11px] md:text-xs leading-relaxed" style={{ color: '#777' }}>
                  {c.desc}
                </p>

                {/* Tiny connecting pulse */}
                <motion.div
                  className="absolute bottom-2 right-3 h-1.5 w-1.5 rounded-full"
                  style={{ background: c.accent, boxShadow: `0 0 8px ${c.accent}` }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
