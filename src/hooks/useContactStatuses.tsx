import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { LeadStatus } from '@/lib/types';

interface ContactStatusInfo {
  statuses: LeadStatus[];
}

export function useContactStatuses(
  contactIds: string[],
  tenantId: string | undefined,
  enabled: boolean = true
) {
  const [statusesByContact, setStatusesByContact] = useState<Record<string, LeadStatus[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchStatuses = useCallback(async () => {
    if (!tenantId || contactIds.length === 0 || !enabled) {
      setStatusesByContact({});
      return;
    }

    setIsLoading(true);

    try {
      const allContactStatuses = await api.get<any[]>(`/contact-statuses`);
      const contactStatusData = allContactStatuses.filter(cs => contactIds.includes(cs.contact_id));

      if (contactStatusData.length === 0) {
        setStatusesByContact({});
        setIsLoading(false);
        return;
      }

      // Get unique status IDs
      const uniqueStatusIds = [...new Set(contactStatusData.map(cs => cs.status_id))];

      // Fetch the status details
      const allStatuses = await api.get<any[]>(`/lead-statuses`);
      const statusData = allStatuses.filter(s => uniqueStatusIds.includes(s.id));

      if (statusData.length === 0) {
        setStatusesByContact({});
        setIsLoading(false);
        return;
      }

      // Build a map of status_id -> status
      const statusMap: Record<string, LeadStatus> = {};
      statusData.forEach(s => {
        statusMap[s.id] = s as LeadStatus;
      });

      // Build the result grouped by contact
      const result: Record<string, LeadStatus[]> = {};
      contactStatusData.forEach(cs => {
        if (!result[cs.contact_id]) {
          result[cs.contact_id] = [];
        }
        const status = statusMap[cs.status_id];
        if (status && !result[cs.contact_id].find(s => s.id === status.id)) {
          result[cs.contact_id].push(status);
        }
      });

      setStatusesByContact(result);
    } catch (e) {
      setStatusesByContact({});
    }
    
    setIsLoading(false);
  }, [tenantId, contactIds.join(','), enabled, refreshTrigger]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Subscribe to realtime changes (disabled)
  useEffect(() => {
    if (!tenantId || !enabled) return;
    return () => {};
  }, [tenantId, enabled]);

  const refresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return {
    statusesByContact,
    isLoading,
    refresh,
  };
}
