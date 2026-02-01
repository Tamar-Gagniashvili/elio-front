import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BusinessObject, ObjectType, ObjectStatus } from '@/lib/objectTypes';

export interface LinkedObject extends BusinessObject {
  object_type?: ObjectType;
  linked_at?: string;
  link_id?: string;
}

export function useConversationObjects(conversationId: string | null, tenantId: string | null) {
  const [linkedObjects, setLinkedObjects] = useState<LinkedObject[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLinkedObjects = useCallback(async () => {
    if (!conversationId || !tenantId) {
      setLinkedObjects([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversation_objects')
        .select(`
          id,
          linked_at,
          object_id,
          objects (
            id,
            display_name,
            metadata,
            status_id,
            object_type_id,
            created_at,
            object_statuses (
              id,
              name,
              color
            ),
            object_types (
              id,
              name,
              name_plural,
              icon
            )
          )
        `)
        .eq('conversation_id', conversationId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const objects: LinkedObject[] = (data || []).map((link: any) => ({
        ...link.objects,
        status: link.objects?.object_statuses,
        object_type: link.objects?.object_types,
        linked_at: link.linked_at,
        link_id: link.id,
      }));

      setLinkedObjects(objects);
    } catch (error) {
      console.error('Error fetching linked objects:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, tenantId]);

  useEffect(() => {
    fetchLinkedObjects();
  }, [fetchLinkedObjects]);

  const linkObject = async (objectId: string) => {
    if (!conversationId || !tenantId) return false;

    try {
      const { error } = await supabase
        .from('conversation_objects')
        .insert({
          conversation_id: conversationId,
          object_id: objectId,
          tenant_id: tenantId,
        });

      if (error) throw error;
      await fetchLinkedObjects();
      return true;
    } catch (error) {
      console.error('Error linking object:', error);
      return false;
    }
  };

  const unlinkObject = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('conversation_objects')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      await fetchLinkedObjects();
      return true;
    } catch (error) {
      console.error('Error unlinking object:', error);
      return false;
    }
  };

  return {
    linkedObjects,
    loading,
    linkObject,
    unlinkObject,
    refetch: fetchLinkedObjects,
  };
}
