import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

    // Fetch all contact_statuses for the given contacts
    const { data: contactStatusData, error: csError } = await supabase
      .from('contact_statuses')
      .select('contact_id, status_id')
      .eq('tenant_id', tenantId)
      .in('contact_id', contactIds);

    if (csError || !contactStatusData || contactStatusData.length === 0) {
      setStatusesByContact({});
      setIsLoading(false);
      return;
    }

    // Get unique status IDs
    const uniqueStatusIds = [...new Set(contactStatusData.map(cs => cs.status_id))];

    // Fetch the status details
    const { data: statusData, error: sError } = await supabase
      .from('lead_statuses')
      .select('id, name, color, icon, tenant_id, created_at, created_by')
      .in('id', uniqueStatusIds);

    if (sError || !statusData) {
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
    setIsLoading(false);
  }, [tenantId, contactIds.join(','), enabled, refreshTrigger]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!tenantId || !enabled) return;

    const channel = supabase
      .channel('contact-statuses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contact_statuses',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          // Trigger a refresh when statuses change
          setRefreshTrigger(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
