import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tag } from 'lucide-react';
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
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContactStatuses();
  }, [contactId, tenantId]);

  const fetchContactStatuses = async () => {
    setIsLoading(true);
    
    // First get the status IDs assigned to this contact
    const { data: contactStatusData } = await supabase
      .from('contact_statuses')
      .select('status_id')
      .eq('contact_id', contactId);

    if (!contactStatusData || contactStatusData.length === 0) {
      setStatuses([]);
      setIsLoading(false);
      return;
    }

    const statusIds = contactStatusData.map(cs => cs.status_id);

    // Then fetch the status details
    const { data: statusData } = await supabase
      .from('lead_statuses')
      .select('id, name, color')
      .in('id', statusIds);

    setStatuses(statusData || []);
    setIsLoading(false);
  };

  if (isLoading || statuses.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 px-4">
      <div className="flex items-center gap-2 mb-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Lead Status
        </h4>
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
