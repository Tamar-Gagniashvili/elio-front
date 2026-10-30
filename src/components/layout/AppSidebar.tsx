import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { cn } from '@/lib/utils';
import {
  Inbox,
  Users,
  Settings,
  LogOut,
  ChevronsUpDown,
  Plug,
  StickyNote,
  Tag,
  Zap,
  PanelLeftClose,
  PanelLeft,
  CalendarCheck,
  // Package,
} from 'lucide-react';
import relinkLogo from '@/assets/logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  href: string;
  labelKey: string;
  icon: typeof Inbox;
  adminOnly?: boolean;
}

const navSections: { labelKey: string; items: NavItem[] }[] = [
  {
    labelKey: 'sidebar.sectionMain',
    items: [
      { href: '/inbox', labelKey: 'nav.inbox', icon: Inbox },
      { href: '/contacts', labelKey: 'nav.contacts', icon: Users },
      // { href: '/objects', labelKey: 'nav.inventory', icon: Package },
      { href: '/bookings', labelKey: 'nav.bookings', icon: CalendarCheck },
      { href: '/notes', labelKey: 'nav.notes', icon: StickyNote },
    ],
  },
  {
    labelKey: 'sidebar.sectionManage',
    items: [
      { href: '/statuses', labelKey: 'nav.statuses', icon: Tag },
      { href: '/rules', labelKey: 'nav.rules', icon: Zap, adminOnly: true },
      { href: '/channels', labelKey: 'nav.channels', icon: Plug },
      { href: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onNavigate?: () => void;
}

export function AppSidebar({ collapsed, onToggle, isMobile = false, onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const { profile, currentTenant, currentMembership, memberships, signOut, setCurrentTenant } = useAuth();

  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';

  const workspaceMenu = (
    <DropdownMenuContent side={collapsed ? 'right' : 'bottom'} align="start" className="w-56">
      <DropdownMenuLabel>{t('sidebar.workspaces')}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {memberships.map((membership) => (
        <DropdownMenuItem
          key={membership.id}
          onClick={() => membership.tenant && setCurrentTenant(membership.tenant)}
          className={cn('gap-2', currentTenant?.id === membership.tenant_id && 'bg-accent')}
        >
          <span className="h-5 w-5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
            {membership.tenant?.name?.charAt(0).toUpperCase()}
          </span>
          <span className="truncate">{membership.tenant?.name}</span>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  );

  const accountMenu = (
    <DropdownMenuContent side={collapsed ? 'right' : 'top'} align={collapsed ? 'end' : 'start'} className="w-56">
      <DropdownMenuLabel>
        <p className="font-medium">{profile?.full_name || 'User'}</p>
        <p className="text-xs font-normal text-muted-foreground truncate">{profile?.email}</p>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={signOut}>
        <LogOut className="mr-2 h-4 w-4" />
        {t('common.logout')}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const tenantInitial = currentTenant?.name?.charAt(0).toUpperCase() || '?';

  return (
    <aside
      className={cn(
        'h-screen flex flex-col gradient-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-14 px-3', collapsed ? 'justify-center' : 'justify-between')}>
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <img src={relinkLogo} alt="Elio" className="h-7 w-auto flex-shrink-0" />
          {!collapsed && (
            <span className="font-semibold text-[15px] tracking-tight text-sidebar-accent-foreground truncate">Elio</span>
          )}
        </Link>
        {!isMobile && !collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-7 w-7 flex-shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t('nav.collapse')}</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pb-3">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'flex items-center w-full rounded-lg border border-sidebar-border bg-sidebar-background shadow-sm transition-colors hover:bg-sidebar-accent',
                    collapsed ? 'justify-center h-10' : 'gap-2.5 p-1.5 pr-2'
                  )}
                >
                  <span className="h-7 w-7 rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold flex items-center justify-center flex-shrink-0">
                    {tenantInitial}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 min-w-0 text-left">
                        <span className="block text-[13px] font-semibold text-sidebar-accent-foreground truncate">
                          {currentTenant?.name || t('sidebar.selectWorkspace')}
                        </span>
                        <span className="block text-[11px] text-sidebar-foreground/70 truncate">
                          {t('sidebar.workspace')}
                        </span>
                      </span>
                      <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">{currentTenant?.name || t('sidebar.selectWorkspace')}</TooltipContent>
            )}
          </Tooltip>
          {workspaceMenu}
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-5">
        {navSections.map((section, sectionIndex) => {
          const items = section.items.filter((item) => !item.adminOnly || isAdmin);
          if (items.length === 0) return null;
          return (
            <div key={section.labelKey} className="space-y-0.5">
              {collapsed ? (
                sectionIndex > 0 && <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" />
              ) : (
                <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
                  {t(section.labelKey)}
                </p>
              )}
              {items.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                const label = t(item.labelKey);

                const linkContent = (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'group flex items-center gap-3 h-9 rounded-lg text-[13px] font-medium transition-colors',
                      collapsed ? 'justify-center w-10 mx-auto' : 'px-2.5',
                      isActive
                        ? 'bg-sidebar-primary/10 text-sidebar-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                        isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground'
                      )}
                    />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right">{label}</TooltipContent>
                    </Tooltip>
                  );
                }

                return linkContent;
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer: language, expand, account */}
      <div className="p-3 space-y-1">
        <LanguageSwitcher collapsed={collapsed} />

        {!isMobile && collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="w-full h-10 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t('nav.expand')}</TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center w-full rounded-lg transition-colors hover:bg-sidebar-accent',
                collapsed ? 'justify-center h-10' : 'gap-2.5 p-1.5 pr-2 border border-sidebar-border'
              )}
            >
              <Avatar src={profile?.avatar_url} name={profile?.full_name} size="sm" />
              {!collapsed && (
                <>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-[13px] font-medium text-sidebar-accent-foreground truncate">
                      {profile?.full_name || 'User'}
                    </span>
                    <span className="block text-[11px] text-sidebar-foreground/70 truncate">{profile?.email}</span>
                  </span>
                  <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          {accountMenu}
        </DropdownMenu>
      </div>
    </aside>
  );
}
