import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeadStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Inbox, User, UserX } from 'lucide-react';

export type InboxFilter = 
  | { type: 'all' }
  | { type: 'mine' }
  | { type: 'unassigned' }
  | { type: 'status'; statusId: string; statusName: string };

interface InboxSubNavProps {
  tenantId: string | undefined;
  currentFilter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
}

export function InboxSubNav({ tenantId, currentFilter, onFilterChange }: InboxSubNavProps) {
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);

  useEffect(() => {
    if (!tenantId) return;

    const fetchStatuses = async () => {
      const { data, error } = await supabase
        .from('lead_statuses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      if (!error && data) {
        setStatuses(data as LeadStatus[]);
      }
    };

    fetchStatuses();
  }, [tenantId]);

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
    color 
  }: { 
    filter: InboxFilter; 
    icon?: React.ComponentType<{ className?: string }>; 
    label: string;
    color?: string;
  }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onFilterChange(filter)}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
            isActive(filter)
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          {Icon && <Icon className="h-4 w-4" />}
          {color && (
            <span 
              className="h-4 w-4 rounded-full border-2 border-background" 
              style={{ backgroundColor: color }}
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        {label}
      </TooltipContent>
    </Tooltip>
  );

  return (
    <div className="w-14 border-r bg-card/50 flex flex-col">
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center gap-2 py-3 px-2">
          {/* Core filters */}
          <NavButton filter={{ type: 'all' }} icon={Inbox} label="All" />
          <NavButton filter={{ type: 'mine' }} icon={User} label="Mine" />
          <NavButton filter={{ type: 'unassigned' }} icon={UserX} label="Unassigned" />
          
          {/* Divider */}
          {statuses.length > 0 && (
            <div className="w-6 h-px bg-border my-1" />
          )}
          
          {/* Status filters */}
          {statuses.map((status) => (
            <NavButton
              key={status.id}
              filter={{ type: 'status', statusId: status.id, statusName: status.name }}
              label={status.name}
              color={status.color}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
