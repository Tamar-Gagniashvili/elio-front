import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LeadStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Inbox, User, UserX, Sparkles } from 'lucide-react';

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
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
        isActive(filter)
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {color && (
        <span 
          className="h-2.5 w-2.5 rounded-full flex-shrink-0" 
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );

  return (
    <div className="border-b bg-card/50">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-2 px-4 py-2">
          {/* Core filters */}
          <NavButton filter={{ type: 'all' }} icon={Inbox} label="All" />
          <NavButton filter={{ type: 'mine' }} icon={User} label="Mine" />
          <NavButton filter={{ type: 'unassigned' }} icon={UserX} label="Unassigned" />
          
          {/* Divider */}
          {statuses.length > 0 && (
            <div className="h-4 w-px bg-border mx-1" />
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
