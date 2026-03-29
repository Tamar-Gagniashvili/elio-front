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
      const conversationObjects = await api.get<any[]>(`/conversation-objects?conversation_id=${conversationId}`);
      const __objects = await api.get<any[]>(`/relink-objects`);
      const objectTypes = await api.get<any[]>(`/object-types`);
      const objectStatuses = await api.get<any[]>(`/object-statuses`);

      const objects: LinkedObject[] = conversationObjects.map((link: any) => {
        const matchedObj = __objects.find(o => o.id === link.object_id);
        if (!matchedObj) return null;

        return {
          ...matchedObj,
          status: objectStatuses.find(s => s.id === matchedObj.status_id),
          object_type: objectTypes.find(t => t.id === matchedObj.object_type_id),
          linked_at: link.linked_at,
          link_id: link.id,
        };
      }).filter(Boolean);

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
        try {
          await api.put(`/relink-objects/${objectId}`, { status_id: newStatusId });
        } catch (statusError) {
          throw statusError;
        }
      }

      // Link the object to the conversation
      try {
        await api.post('/conversation-objects', {
          conversation_id: conversationId,
          object_id: objectId,
          });
      } catch (error) {
        throw error;
      }

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
