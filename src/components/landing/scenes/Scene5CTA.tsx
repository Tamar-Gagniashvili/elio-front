import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import relinkLogo from '@/assets/logo.png';
import cosmonautHolding from '@/assets/landing/cosmonaut-holding.png';

export default function Scene5CTA() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="relative py-32 md:py-40 overflow-hidden z-10">
      <motion.div
        className="container max-w-screen-xl relative z-10"
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
      >
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-6">
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none" style={{ color: '#f0f0f0' }}>
              {t('landing.ctaTitle')}{' '}
              <span style={{ color: '#99FFCC' }}>{t('landing.ctaTitleHighlight')}</span>{' '}
              {t('landing.ctaTitleEnd')}
            </h2>
            <p className="mt-4 md:mt-5 text-base md:text-xl max-w-md font-light mx-auto lg:mx-0" style={{ color: '#666' }}>
              {t('landing.ctaDesc')}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center lg:items-start gap-4">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 h-12 md:h-14 px-8 md:px-10 text-base md:text-lg font-bold rounded-full transition-all duration-200 hover:scale-105"
                style={{ background: '#99FFCC', color: '#0a0a0a' }}
              >
                {t('landing.getStartedFree')}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

          </div>

          <motion.div
            className="relative flex-shrink-0 flex flex-col items-center"
            initial={{ opacity: 0, x: 60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.img
              src={cosmonautHolding}
              alt="Cosmonaut holding contact button"
              className="w-[240px] sm:w-[340px] md:w-[440px] h-auto"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 45%, black 40%, transparent 75%)',
                maskImage: 'radial-gradient(ellipse 70% 70% at 50% 45%, black 40%, transparent 75%)',
              }}
            />
            <motion.a
              href="mailto:contact@relink.io"
              className="absolute inline-flex items-center gap-2 h-11 md:h-14 px-6 md:px-10 text-sm md:text-lg font-bold rounded-full transition-colors duration-200 hover:scale-105"
              style={{
                bottom: '36%',
                border: '2px solid #99FFCC',
                color: '#99FFCC',
                background: 'rgba(153, 255, 204, 0.15)',
                boxShadow: '0 0 40px rgba(153, 255, 204, 0.3), 0 0 80px rgba(153, 255, 204, 0.1)',
              }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Mail className="h-5 w-5" />
              {t('landing.contactUs')}
            </motion.a>
          </motion.div>
        </div>
      </motion.div>

      <div className="container max-w-screen-xl mt-24 pt-8" style={{ borderTop: '1px solid #1e1e1e' }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={relinkLogo} alt="ReLink" className="h-6 w-6 object-contain rounded-md" />
            <span className="font-bold" style={{ color: '#e0e0e0' }}>ReLink</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: '#555' }}>
            <Link to="/auth" className="hover:text-[#99FFCC] transition-colors">{t('landing.login')}</Link>
            <a href="mailto:contact@relink.io" className="hover:text-[#99FFCC] transition-colors">{t('landing.contactUs')}</a>
          </div>
          <p className="text-sm" style={{ color: '#444' }}>
            © {new Date().getFullYear()} ReLink. {t('landing.allRightsReserved')}
          </p>
        </div>
      </div>
    </section>
  );
}
