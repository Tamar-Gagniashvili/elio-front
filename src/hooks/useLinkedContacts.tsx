import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

    // First, check if this contact is part of a link group
    const { data: linkData } = await supabase
      .from('contact_links')
      .select('link_group_id')
      .eq('contact_id', contactId)
      .eq('tenant_id', tenantId)
      .single();

    if (!linkData?.link_group_id) {
      // Not linked, return just this contact
      setLinkedContactIds([contactId]);
      setLinkGroupId(null);
      setIsLoading(false);
      return;
    }

    // Get all contacts in the same link group
    const { data: allLinks } = await supabase
      .from('contact_links')
      .select('contact_id')
      .eq('link_group_id', linkData.link_group_id)
      .eq('tenant_id', tenantId);

    const contactIds = allLinks?.map(l => l.contact_id) || [contactId];
    
    setLinkedContactIds(contactIds);
    setLinkGroupId(linkData.link_group_id);
    setIsLoading(false);
  };

  return {
    linkedContactIds,
    isLinked: linkedContactIds.length > 1,
    linkGroupId,
    isLoading,
  };
}
