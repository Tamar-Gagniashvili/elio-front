import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { echo } from '@/lib/echo';
import { LeadStatus, Conversation } from '@/lib/types';
import { GroupedConversation } from '@/hooks/useUnifiedContacts';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Inbox, User, UserX, MessageCircle, Archive, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StatusIndicator } from '@/components/StatusIcon';
import { getColorHex } from '@/pages/Statuses';

export type InboxFilter =
  | { type: 'all' }
  | { type: 'mine' }
  | { type: 'unassigned' }
  | { type: 'unreplied' }
  | { type: 'archived' }
  | { type: 'newly_assigned' }
  | { type: 'status'; statusId: string; statusName: string };

interface InboxSubNavProps {
  tenantId: string | undefined;
  currentFilter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  conversations: Conversation[];
  groupedConversations: GroupedConversation[];
  userId: string | undefined;
  unrepliedConversationIds: Set<string>;
  horizontal?: boolean;
}

const SUB_NAV_COLLAPSED_KEY = 'inbox-subnav-collapsed';

export function InboxSubNav({ 
  tenantId, 
  currentFilter, 
  onFilterChange, 
  conversations,
  groupedConversations,
  userId,
  unrepliedConversationIds,
  horizontal = false,
}: InboxSubNavProps) {
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(SUB_NAV_COLLAPSED_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(SUB_NAV_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (!tenantId) return;

    const fetchStatuses = async () => {
      try {
        const data = await api.get<any[]>(`/lead-statuses?tenant_id=${tenantId}&sort_by=name&sort_direction=asc`);
        setStatuses(data as LeadStatus[] || []);
      } catch (e) {
        console.error('Failed to fetch lead statuses', e);
      }
    };

    fetchStatuses();
  }, [tenantId]);

  // Fetch status counts with a ref to avoid stale closure
  const [statusCountsTrigger, setStatusCountsTrigger] = useState(0);

  useEffect(() => {
    if (!tenantId || statuses.length === 0 || groupedConversations.length === 0) {
      setStatusCounts({});
      return;
    }

    const fetchStatusCounts = async () => {
      const counts: Record<string, number> = {};
      
      // Get all contact IDs from grouped conversations (for status lookup)
      const allContactIds = new Set<string>();
      for (const group of groupedConversations) {
        for (const contact of group.contacts) {
          allContactIds.add(contact.id);
        }
      }
      
      if (allContactIds.size === 0) {
        setStatusCounts({});
        return;
      }

      try {
        const queryParams = new URLSearchParams();
        queryParams.append('tenant_id', tenantId);
        Array.from(allContactIds).forEach(id => queryParams.append('contact_id[]', id));
        
        const contactStatusData = await api.get<any[]>(`/contact-statuses?${queryParams.toString()}`);
        
        // Create a map of contact_id -> Set of status_ids
        const contactStatusMap = new Map<string, Set<string>>();
        if (contactStatusData) {
          for (const cs of contactStatusData) {
            if (!contactStatusMap.has(cs.contact_id)) {
              contactStatusMap.set(cs.contact_id, new Set());
            }
            contactStatusMap.get(cs.contact_id)!.add(cs.status_id);
          }
        }

      // Count grouped conversations (treating linked contacts as 1)
      for (const status of statuses) {
        let count = 0;
        
        for (const group of groupedConversations) {
          // Check if ANY contact in the group has this status
          const hasStatus = group.contacts.some(contact => 
            contactStatusMap.get(contact.id)?.has(status.id)
          );
          
          if (hasStatus) {
            // Count the group as 1, regardless of how many contacts have the status
            count++;
          }
        }
        
        counts[status.id] = count;
      }

      } catch (e) {
        console.error('Failed to fetch contact status counts', e);
      }
    };

    fetchStatusCounts();
  }, [tenantId, statuses, groupedConversations, statusCountsTrigger]);

  // Separate effect for realtime subscription (currently polling/disabled until backend events)
  useEffect(() => {
    if (!tenantId) return;

    // Use Laravel Echo for realtime later when events are configured
    const channelName = `tenant.${tenantId}`;
    const channel = echo.channel(channelName);
    
    // As a temporary measure, if any conversation updates, we refresh statuses just in case
    channel.listen('.ConversationUpdated', () => {
      setTimeout(() => {
        setStatusCountsTrigger(prev => prev + 1);
      }, 500);
    });

    return () => {
      channel.stopListening('.ConversationUpdated');
      echo.leaveChannel(channelName);
    };
  }, [tenantId]);

  // Calculate counts for core filters (exclude archived from non-archived filters)
  const nonArchivedConversations = conversations.filter(c => c.status !== 'archived');
  const allCount = nonArchivedConversations.length;
  const mineCount = nonArchivedConversations.filter(c => c.assigned_to === userId).length;
  const unassignedCount = nonArchivedConversations.filter(c => !c.assigned_to).length;
  const unrepliedCount = nonArchivedConversations.filter(c => unrepliedConversationIds.has(c.id)).length;
  const archivedCount = conversations.filter(c => c.status === 'archived').length;
  const newlyAssignedCount = nonArchivedConversations.filter(
    c => c.assigned_to === userId && !c.assignment_seen_by_assignee
  ).length;

  const isActive = (filter: InboxFilter) => {
    if (filter.type !== currentFilter.type) return false;
    if (filter.type === 'status' && currentFilter.type === 'status') {
      return filter.statusId === currentFilter.statusId;
    }
    return true;
  };

  const NavButton = ({ 
    filter, 
    icon: Icon, 
    label, 
    color,
    statusIcon,
    count
  }: { 
    filter: InboxFilter; 
    icon?: React.ComponentType<{ className?: string }>; 
    label: string;
    color?: string;
    statusIcon?: string | null;
    count?: number;
  }) => {
    const button = (
      <button
        onClick={() => onFilterChange(filter)}
        className={cn(
          'flex items-center w-full rounded-md text-xs font-medium transition-colors text-left',
          collapsed ? 'justify-center px-2 py-2' : 'gap-1.5 px-2 py-1.5',
          isActive(filter)
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
        {color && !Icon && (
          <StatusIndicator 
            icon={statusIcon} 
            color={color}
            colorDotClass="h-2.5 w-2.5"
            iconClass="h-3.5 w-3.5"
          />
        )}
        {!collapsed && (
          <>
            <span className="truncate flex-1">{label}</span>
            {count !== undefined && (
              <span className={cn(
                "text-[10px] tabular-nums",
                isActive(filter) ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {count}
              </span>
            )}
          </>
        )}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {label}
            {count !== undefined && (
              <span className="text-muted-foreground">({count})</span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  // Horizontal (mobile) variant — chip strip
  if (horizontal) {
    const HChip = ({
      filter,
      icon: Icon,
      label,
      color,
      statusIcon,
      count,
    }: {
      filter: InboxFilter;
      icon?: React.ComponentType<{ className?: string }>;
      label: string;
      color?: string;
      statusIcon?: string | null;
      count?: number;
    }) => (
      <button
        onClick={() => onFilterChange(filter)}
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors border',
          isActive(filter)
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted'
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {color && !Icon && (
          <StatusIndicator
            icon={statusIcon}
            color={color}
            colorDotClass="h-2 w-2"
            iconClass="h-3 w-3"
          />
        )}
        <span>{label}</span>
        {count !== undefined && count > 0 && (
          <span
            className={cn(
              'tabular-nums text-[10px] rounded-full px-1.5 py-0.5',
              isActive(filter) ? 'bg-primary-foreground/20' : 'bg-muted'
            )}
          >
            {count}
          </span>
        )}
      </button>
    );

    return (
      <div className="border-b bg-card/50 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-2 px-3 py-2 min-w-max">
          <HChip filter={{ type: 'all' }} icon={Inbox} label={t('inbox.filters.all')} count={allCount} />
          <HChip filter={{ type: 'mine' }} icon={User} label={t('inbox.filters.mine')} count={mineCount} />
          <HChip filter={{ type: 'unassigned' }} icon={UserX} label={t('inbox.filters.unassigned')} count={unassignedCount} />
          <HChip filter={{ type: 'unreplied' }} icon={MessageCircle} label={t('inbox.filters.unreplied')} count={unrepliedCount} />
          <HChip filter={{ type: 'archived' }} icon={Archive} label={t('inbox.filters.archived')} count={archivedCount} />
          {newlyAssignedCount > 0 && (
            <HChip
              filter={{ type: 'newly_assigned' }}
              icon={UserPlus}
              label={t('inbox.filters.newlyAssigned')}
              count={newlyAssignedCount}
            />
          )}
          {statuses.map((status) => (
            <HChip
              key={status.id}
              filter={{ type: 'status', statusId: status.id, statusName: status.name }}
              label={status.name}
              color={getColorHex(status.color)}
              statusIcon={status.icon}
              count={statusCounts[status.id] || 0}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "border-r bg-card/50 flex flex-col transition-all duration-200",
      collapsed ? "w-12" : "w-48"
    )}>
      {/* Collapse toggle */}
      <div className={cn(
        "p-1 border-b flex",
        collapsed ? "justify-center" : "justify-end"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-2">
          {/* Core filters */}
          <NavButton filter={{ type: 'all' }} icon={Inbox} label={t('inbox.filters.all')} count={allCount} />
          <NavButton filter={{ type: 'mine' }} icon={User} label={t('inbox.filters.mine')} count={mineCount} />
          <NavButton filter={{ type: 'unassigned' }} icon={UserX} label={t('inbox.filters.unassigned')} count={unassignedCount} />
          <NavButton filter={{ type: 'unreplied' }} icon={MessageCircle} label={t('inbox.filters.unreplied')} count={unrepliedCount} />
          <NavButton filter={{ type: 'archived' }} icon={Archive} label={t('inbox.filters.archived')} count={archivedCount} />
          
          {/* Newly Assigned section */}
          {newlyAssignedCount > 0 && (
            <>
              <div className="h-px bg-border my-2" />
              <NavButton 
                filter={{ type: 'newly_assigned' }} 
                icon={UserPlus} 
                label={t('inbox.filters.newlyAssigned')} 
                count={newlyAssignedCount} 
              />
            </>
          )}
          
          {/* Divider before statuses */}
          {statuses.length > 0 && (
            <div className="h-px bg-border my-2" />
          )}
          
          {/* Status filters */}
          {statuses.map((status) => (
            <NavButton
              key={status.id}
              filter={{ type: 'status', statusId: status.id, statusName: status.name }}
              label={status.name}
              color={getColorHex(status.color)}
              statusIcon={status.icon}
              count={statusCounts[status.id] || 0}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
