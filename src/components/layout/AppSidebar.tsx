import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Inbox,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Plug,
  StickyNote,
  Tag,
  Zap,
  PanelLeftClose,
  PanelLeft,
  Package,
} from 'lucide-react';
import relinkLogo from '@/assets/relink-logo.png';
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

const navItems = [
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/objects', label: 'Inventory', icon: Package },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/statuses', label: 'Statuses', icon: Tag },
  { href: '/rules', label: 'Rules', icon: Zap, adminOnly: true },
  { href: '/channels', label: 'Channels', icon: Plug },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const { profile, currentTenant, currentMembership, memberships, signOut, setCurrentTenant } = useAuth();

  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';

  return (
    <aside 
      className={cn(
        "h-screen flex flex-col gradient-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo & Tenant Selector */}
      <div className="p-3 border-b border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 mb-3",
          collapsed && "justify-center"
        )}>
          <img src={relinkLogo} alt="ReLink" className="h-10 w-10 flex-shrink-0" />
          {!collapsed && (
            <span className="font-bold text-lg text-sidebar-foreground">ReLink</span>
          )}
        </div>

        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <span className="truncate">{currentTenant?.name || 'Select workspace'}</span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {memberships.map((membership) => (
                <DropdownMenuItem
                  key={membership.id}
                  onClick={() => membership.tenant && setCurrentTenant(membership.tenant)}
                  className={cn(
                    currentTenant?.id === membership.tenant_id && 'bg-accent'
                  )}
                >
                  {membership.tenant?.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="w-10 h-10 text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" className="w-56">
                  <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {memberships.map((membership) => (
                    <DropdownMenuItem
                      key={membership.id}
                      onClick={() => membership.tenant && setCurrentTenant(membership.tenant)}
                      className={cn(
                        currentTenant?.id === membership.tenant_id && 'bg-accent'
                      )}
                    >
                      {membership.tenant?.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent side="right">
              {currentTenant?.name || 'Select workspace'}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            const linkContent = (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && item.label}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-2 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={collapsed ? "icon" : "sm"}
              onClick={onToggle}
              className={cn(
                "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                collapsed ? "w-full" : "w-full justify-start gap-2"
              )}
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* User Profile */}
      <div className="p-2 border-t border-sidebar-border">
        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Avatar
                  src={profile?.avatar_url}
                  name={profile?.full_name}
                  size="sm"
                />
                <div className="flex-1 text-left truncate">
                  <p className="text-sm font-medium truncate">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {profile?.email}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="w-full h-10 text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <Avatar
                      src={profile?.avatar_url}
                      name={profile?.full_name}
                      size="sm"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" className="w-56">
                  <DropdownMenuLabel>
                    <p className="font-medium">{profile?.full_name || 'User'}</p>
                    <p className="text-xs font-normal text-muted-foreground">{profile?.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent side="right">
              {profile?.full_name || 'User'}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}
