import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLinkedContacts } from '@/hooks/useLinkedContacts';
import { Badge } from '@/components/ui/badge';
import { Tag, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusColorClasses } from '@/pages/Statuses';

interface LeadStatus {
  id: string;
  name: string;
  color: string;
}

interface ContactStatusesDisplayProps {
  contactId: string;
  tenantId: string;
}

export function ContactStatusesDisplay({ contactId, tenantId }: ContactStatusesDisplayProps) {
  const { linkedContactIds, isLinked, isLoading: isLoadingLinks } = useLinkedContacts(contactId, tenantId);
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoadingLinks && linkedContactIds.length > 0) {
      fetchContactStatuses();
    }
  }, [linkedContactIds, isLoadingLinks]);

  const fetchContactStatuses = async () => {
    setIsLoading(true);
    
    // Get status IDs assigned to ALL linked contacts
    const { data: contactStatusData } = await supabase
      .from('contact_statuses')
      .select('status_id')
      .in('contact_id', linkedContactIds);

    if (!contactStatusData || contactStatusData.length === 0) {
      setStatuses([]);
      setIsLoading(false);
      return;
    }

    // Get unique status IDs
    const uniqueStatusIds = [...new Set(contactStatusData.map(cs => cs.status_id))];

    // Fetch the status details
    const { data: statusData } = await supabase
      .from('lead_statuses')
      .select('id, name, color')
      .in('id', uniqueStatusIds);

    setStatuses(statusData || []);
    setIsLoading(false);
  };

  if (isLoading || isLoadingLinks || statuses.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 px-4">
      <div className="flex items-center gap-2 mb-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Lead Status
        </h4>
        {isLinked && (
          <span title="Shared across linked contacts">
            <Link2 className="h-3 w-3 text-muted-foreground" />
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {statuses.map((status) => {
          const colorClasses = getStatusColorClasses(status.color);
          return (
            <Badge
              key={status.id}
              className={cn(
                colorClasses.bg,
                colorClasses.text,
                'border',
                colorClasses.border,
                'text-xs'
              )}
            >
              {status.name}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
