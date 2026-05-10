import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
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
    
    try {
      const queryParams = new URLSearchParams();
      linkedContactIds.forEach(id => queryParams.append('contact_id[]', id));
      
      const contactStatusData = await api.get<any[]>(`/contact-statuses?${queryParams.toString()}`);

      if (!contactStatusData || contactStatusData.length === 0) {
        setStatuses([]);
        setIsLoading(false);
        return;
      }

      const uniqueStatusIds = [...new Set(contactStatusData.map((cs: any) => cs.status_id))];
      
      const statusQueryParams = new URLSearchParams();
      uniqueStatusIds.forEach(id => statusQueryParams.append('id[]', id as string));

      const statusData = await api.get<any[]>(`/lead-statuses?${statusQueryParams.toString()}`);
      setStatuses(statusData as LeadStatus[] || []);
    } catch (error) {
      console.error('Error fetching contact statuses:', error);
      setStatuses([]);
    }
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
