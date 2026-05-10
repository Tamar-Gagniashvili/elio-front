import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { echo } from '@/lib/echo';
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
      // Build query string for multiple contact_ids
      const queryParams = new URLSearchParams();
      contactIds.forEach(id => queryParams.append('contact_id[]', id));
      
      const contactStatusData = await api.get<any[]>(`/contact-statuses?${queryParams.toString()}`);

      if (!contactStatusData || contactStatusData.length === 0) {
        setStatusesByContact({});
        return;
      }

      // Get unique status IDs
      const uniqueStatusIds = [...new Set(contactStatusData.map(cs => cs.status_id))];

      // Fetch the status details
      const statusQueryParams = new URLSearchParams();
      uniqueStatusIds.forEach(id => statusQueryParams.append('id[]', id));

      const statusData = await api.get<any[]>(`/lead-statuses?${statusQueryParams.toString()}`);

      if (!statusData) {
        setStatusesByContact({});
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

    } catch (error) {
      console.error('Failed to fetch contact statuses:', error);
      setStatusesByContact({});
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, contactIds.join(','), enabled, refreshTrigger]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!tenantId || !enabled) return;

    // Use Laravel Echo for realtime updates
    // Note: Requires backend to broadcast a 'ContactStatusChanged' event
    const channelName = `tenant.${tenantId}.contact-statuses`;
    const channel = echo.channel(channelName);
    
    channel.listen('.ContactStatusChanged', () => {
      setRefreshTrigger(prev => prev + 1);
    });

    return () => {
      channel.stopListening('.ContactStatusChanged');
      echo.leaveChannel(channelName);
    };
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
