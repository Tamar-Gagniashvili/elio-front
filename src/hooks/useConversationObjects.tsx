import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
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
      const data = await api.get<any[]>(`/conversation-objects?conversation_id=${conversationId}`);

      const objects: LinkedObject[] = (data || []).map((link: any) => ({
        ...link.relink_object,
        status: link.relink_object?.status,
        object_type: link.relink_object?.type,
        linked_at: link.linked_at || link.created_at,
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

  const linkObject = async (objectId: string, newStatusId?: string) => {
    if (!conversationId || !tenantId) return false;

    try {
      // If a new status is provided, update the object's status first
      if (newStatusId) {
        await api.put(`/relink-objects/${objectId}`, { status_id: newStatusId });
      }

      // Link the object to the conversation
      await api.post('/conversation-objects', {
        conversation_id: conversationId,
        object_id: objectId,
        tenant_id: tenantId,
      });

      await fetchLinkedObjects();
      return true;
    } catch (error) {
      console.error('Error linking object:', error);
      return false;
    }
  };

  const unlinkObject = async (linkId: string) => {
    try {
      await api.delete(`/conversation-objects/${linkId}`);
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
