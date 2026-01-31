import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeadStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    <button
      onClick={() => onFilterChange(filter)}
      className={cn(
        'flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs font-medium transition-colors text-left',
        isActive(filter)
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
      {color && (
        <span 
          className="h-2.5 w-2.5 rounded-full flex-shrink-0" 
          style={{ backgroundColor: color }}
        />
      )}
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div className="w-48 border-r bg-card/50 flex flex-col">
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-2">
          {/* Core filters */}
          <NavButton filter={{ type: 'all' }} icon={Inbox} label="All" />
          <NavButton filter={{ type: 'mine' }} icon={User} label="Mine" />
          <NavButton filter={{ type: 'unassigned' }} icon={UserX} label="Unassigned" />
          
          {/* Divider */}
          {statuses.length > 0 && (
            <div className="h-px bg-border my-2" />
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
