import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface LinkedContactsResult {
  linkedContactIds: string[];
  isLinked: boolean;
  linkGroupId: string | null;
  isLoading: boolean;
}

export function useLinkedContacts(contactId: string, tenantId: string): LinkedContactsResult {
  const [linkedContactIds, setLinkedContactIds] = useState<string[]>([contactId]);
  const [linkGroupId, setLinkGroupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLinkedContacts();
  }, [contactId, tenantId]);

  const fetchLinkedContacts = async () => {
    if (!contactId || !tenantId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // First, check if this contact is part of a link group
      const linkData = await api.get<any[]>(`/contact-links?contact_id=${contactId}&tenant_id=${tenantId}`);
      
      if (!linkData || linkData.length === 0 || !linkData[0].link_group_id) {
        // Not linked, return just this contact
        setLinkedContactIds([contactId]);
        setLinkGroupId(null);
        setIsLoading(false);
        return;
      }

      const groupId = linkData[0].link_group_id;

      // Get all contacts in the same link group
      const allLinks = await api.get<any[]>(`/contact-links?link_group_id=${groupId}&tenant_id=${tenantId}`);

      const contactIds = allLinks?.map(l => l.contact_id) || [contactId];
      
      setLinkedContactIds(contactIds);
      setLinkGroupId(groupId);
    } catch (e) {
      console.error('Error fetching linked contacts:', e);
      setLinkedContactIds([contactId]);
      setLinkGroupId(null);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    linkedContactIds,
    isLinked: linkedContactIds.length > 1,
    linkGroupId,
    isLoading,
  };
}
