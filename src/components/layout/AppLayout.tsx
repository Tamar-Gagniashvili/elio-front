import { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppSidebar } from './AppSidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import relinkLogo from '@/assets/logo.png';

interface AppLayoutProps {
  children: ReactNode;
}

interface SidebarContextType {
  collapsed: boolean;
  isMobile: boolean;
}

const SidebarContext = createContext<SidebarContextType>({ collapsed: false, isMobile: false });

export const useSidebarState = () => useContext(SidebarContext);

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export function AppLayout({ children }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  // Close mobile drawer when switching to desktop
  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  // On mobile, treat as "collapsed=false" so children render full-width content
  const effectiveCollapsed = isMobile ? false : collapsed;

  // Every app page requires a signed-in user
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarContext.Provider value={{ collapsed: effectiveCollapsed, isMobile }}>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-screen overflow-hidden bg-background w-full">
          {/* Desktop sidebar */}
          {!isMobile && (
            <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
          )}

          {/* Mobile drawer sidebar */}
          {isMobile && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetContent side="left" className="p-0 w-64 max-w-[85vw] gradient-sidebar border-sidebar-border">
                <AppSidebar
                  collapsed={false}
                  onToggle={() => setMobileOpen(false)}
                  isMobile
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
          )}

          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile topbar */}
            {isMobile && (
              <header className="flex items-center gap-2 h-14 px-3 border-b bg-background flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                  className="h-10 w-10"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Link to="/" className="flex items-center gap-2">
                  <img src={relinkLogo} alt="Elio" className="h-7 w-auto" />
                  <span className="font-bold text-base">Elio</span>
                </Link>
              </header>
            )}

            <main className="flex-1 overflow-y-auto min-w-0">
              {children}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}
