import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Conversation, Contact, UnifiedContact, ChannelType } from '@/lib/types';

interface UseUnifiedContactsProps {
  conversations: Conversation[];
  tenantId: string | undefined;
}

export interface GroupedConversation {
  id: string; // groupId or conversation.id
  isUnified: boolean;
  displayName: string;
  contacts: Contact[];
  conversations: Conversation[];
  totalUnreadCount: number;
  lastMessageAt?: string;
  unreadByChannel: Record<ChannelType, number>;
}

export function useUnifiedContacts({ conversations, tenantId }: UseUnifiedContactsProps) {
  const [linkGroups, setLinkGroups] = useState<Map<string, { groupId: string; displayName?: string }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all contact links for the tenant
  useEffect(() => {
    if (!tenantId) return;

    const fetchLinks = async () => {
      setIsLoading(true);
      
      try {
        // Fetch all contact_links with their groups from our Laravel API
        const links = await api.get<any[]>('/contact-links');

        const groupMap = new Map<string, { groupId: string; displayName?: string }>();
        
        if (links) {
          for (const link of links) {
            // Laravel converts relation names depending on casing, we check both
            const group = link.contact_link_group || link.contactLinkGroup;
            groupMap.set(link.contact_id, {
              groupId: link.link_group_id,
              displayName: group?.display_name || undefined,
            });
          }
        }
        
        setLinkGroups(groupMap);
      } catch (error) {
        console.error('Failed to fetch contact links', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinks();
  }, [tenantId]);

  // Group conversations by link group
  const groupedConversations = useMemo(() => {
    const groups = new Map<string, GroupedConversation>();
    const standalone: GroupedConversation[] = [];

    for (const conv of conversations) {
      const contactId = conv.contact_id;
      const linkInfo = linkGroups.get(contactId);

      if (linkInfo) {
        // This contact is part of a link group
        const existing = groups.get(linkInfo.groupId);
        
        if (existing) {
          // Add to existing group
          if (conv.contact && !existing.contacts.find(c => c.id === conv.contact?.id)) {
            existing.contacts.push(conv.contact);
          }
          existing.conversations.push(conv);
          existing.totalUnreadCount += conv.unread_count;
          
          // Update unread by channel
          if (conv.contact) {
            const channelType = conv.contact.channel_type;
            existing.unreadByChannel[channelType] = 
              (existing.unreadByChannel[channelType] || 0) + conv.unread_count;
          }
          
          // Update last message time
          if (conv.last_message_at) {
            if (!existing.lastMessageAt || new Date(conv.last_message_at) > new Date(existing.lastMessageAt)) {
              existing.lastMessageAt = conv.last_message_at;
            }
          }
        } else {
          // Create new group
          const unreadByChannel: Record<ChannelType, number> = {} as Record<ChannelType, number>;
          if (conv.contact) {
            unreadByChannel[conv.contact.channel_type] = conv.unread_count;
          }
          
          groups.set(linkInfo.groupId, {
            id: linkInfo.groupId,
            isUnified: true,
            displayName: linkInfo.displayName || conv.contact?.name || 'Unknown',
            contacts: conv.contact ? [conv.contact] : [],
            conversations: [conv],
            totalUnreadCount: conv.unread_count,
            lastMessageAt: conv.last_message_at,
            unreadByChannel,
          });
        }
      } else {
        // Standalone contact (not linked)
        const unreadByChannel: Record<ChannelType, number> = {} as Record<ChannelType, number>;
        if (conv.contact) {
          unreadByChannel[conv.contact.channel_type] = conv.unread_count;
        }
        
        standalone.push({
          id: conv.id,
          isUnified: false,
          displayName: conv.contact?.name || 'Unknown',
          contacts: conv.contact ? [conv.contact] : [],
          conversations: [conv],
          totalUnreadCount: conv.unread_count,
          lastMessageAt: conv.last_message_at,
          unreadByChannel,
        });
      }
    }

    // Combine and sort by last message
    const allGroups = [...groups.values(), ...standalone];
    allGroups.sort((a, b) => {
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    });

    return allGroups;
  }, [conversations, linkGroups]);

  const refreshLinks = async () => {
    if (!tenantId) return;
    
    try {
      const links = await api.get<any[]>('/contact-links');

      const groupMap = new Map<string, { groupId: string; displayName?: string }>();
      
      if (links) {
        for (const link of links) {
          const group = link.contact_link_group || link.contactLinkGroup;
          groupMap.set(link.contact_id, {
            groupId: link.link_group_id,
            displayName: group?.display_name || undefined,
          });
        }
      }
      
      setLinkGroups(groupMap);
    } catch (error) {
      console.error('Failed to refresh contact links', error);
    }
  };

  return {
    groupedConversations,
    isLoading,
    refreshLinks,
  };
}
