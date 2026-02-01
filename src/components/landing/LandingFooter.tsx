import { Link } from 'react-router-dom';
import relinkLogo from '@/assets/relink-logo.png';

export default function LandingFooter() {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container max-w-screen-xl py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and name */}
          <div className="flex items-center gap-3">
            <img src={relinkLogo} alt="ReLink" className="h-8 w-auto" />
            <span className="font-bold text-lg text-foreground">ReLink</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <Link to="/auth" className="hover:text-foreground transition-colors">
              Login
            </Link>
            <a href="mailto:contact@relink.io" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ReLink. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
