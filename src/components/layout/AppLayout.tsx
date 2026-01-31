import { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { AppSidebar } from './AppSidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

interface AppLayoutProps {
  children: ReactNode;
}

interface SidebarContextType {
  collapsed: boolean;
}

const SidebarContext = createContext<SidebarContextType>({ collapsed: false });

export const useSidebarState = () => useContext(SidebarContext);

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-screen overflow-hidden bg-background w-full">
          <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}
