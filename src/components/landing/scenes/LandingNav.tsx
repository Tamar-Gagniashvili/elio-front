import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { languages } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import relinkLogo from '@/assets/logo.png';

export default function LandingNav() {
  const { t, i18n } = useTranslation();
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'hsla(0 0% 6% / 0.9)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid hsla(0 0% 100% / 0.06)',
      }}
    >
      <div className="container max-w-screen-xl relative flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src={relinkLogo}
            alt="ReLink"
            className="h-9 w-9 object-contain transition-transform group-hover:scale-105"
            style={{ filter: 'drop-shadow(0 0 10px hsla(140 100% 65% / 0.55)) drop-shadow(0 0 22px hsla(140 100% 55% / 0.25))' }}
          />
          <span
            className="text-xl tracking-[0.18em] uppercase"
            style={{
              fontFamily: '"Major Mono Display", "Space Mono", ui-monospace, monospace',
              color: '#f0f0f0',
              textShadow: '0 0 12px hsla(140 100% 65% / 0.45)',
            }}
          >
            Re<span style={{ color: '#99FFCC' }}>Link</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-[#999] hover:text-[#f0f0f0] hover:bg-white/5 rounded-full px-3 gap-1.5">
                <span className="text-base">{currentLang.flag}</span>
                <span className="text-xs hidden sm:inline">{currentLang.nativeName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  className={i18n.language === lang.code ? 'bg-accent' : ''}
                >
                  <span>{lang.flag}</span>
                  <span className="ml-2">{lang.nativeName}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild size="sm" className="bg-[#99FFCC] text-[#0a0a0a] hover:bg-[#77eebb] font-semibold rounded-full px-5">
            <Link to="/auth">{t('landing.login')}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
