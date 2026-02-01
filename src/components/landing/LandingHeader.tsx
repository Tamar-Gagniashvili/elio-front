import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import relinkLogo from '@/assets/relink-logo.png';

export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={relinkLogo} alt="ReLink" className="h-8 w-auto" />
          <span className="text-xl font-semibold text-foreground">ReLink</span>
        </Link>
        
        <Button asChild>
          <Link to="/auth">Login</Link>
        </Button>
      </div>
    </header>
  );
}
