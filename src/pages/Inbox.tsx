import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { echo } from '@/lib/echo';
import { Conversation, Message, Contact, ConversationStatus, ChannelType, Profile } from '@/lib/types';
import { useUnifiedContacts, GroupedConversation } from '@/hooks/useUnifiedContacts';
import { useContactStatuses } from '@/hooks/useContactStatuses';
import { AppLayout, useSidebarState } from '@/components/layout/AppLayout';
import { UnifiedConversationList } from '@/components/inbox/UnifiedConversationList';
import { ChatView, ContactDetails } from '@/components/inbox/ChatView';
import { InboxSubNav, InboxFilter } from '@/components/inbox/InboxSubNav';
import { NotificationBanner } from '@/components/notifications/NotificationBanner';
import { Input } from '@/components/ui/input';
import { Search, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';


function InboxContent() {
  const { currentTenant, user, currentMembership } = useAuth();
  const { collapsed: sidebarCollapsed } = useSidebarState();
  const isMobile = useIsMobile();
  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupedConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [linkedContacts, setLinkedContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Sales users default to "Mine" filter
  const [currentFilter, setCurrentFilter] = useState<InboxFilter>(() => 
    isAdmin ? { type: 'all' } : { type: 'mine' }
  );
  const [contactsWithStatus, setContactsWithStatus] = useState<Set<string>>(new Set());
  const [unrepliedConversationIds, setUnrepliedConversationIds] = useState<Set<string>>(new Set());
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [reassignerProfiles, setReassignerProfiles] = useState<Record<string, Profile>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Use unified contacts hook
  const { groupedConversations, refreshLinks } = useUnifiedContacts({
    conversations,
    tenantId: currentTenant?.id,
  });

  // Get all contact IDs from conversations for status fetching
  const allContactIds = conversations.map(c => c.contact_id).filter(Boolean);
  
  // Use contact statuses hook with real-time updates
  const { statusesByContact, refresh: refreshStatuses } = useContactStatuses(
    allContactIds,
    currentTenant?.id,
    allContactIds.length > 0
  );

  // Fetch team member profiles for admin view and reassigner info
  useEffect(() => {
    if (!currentTenant) {
      setProfiles({});
      setReassignerProfiles({});
      return;
    }

    const fetchProfiles = async () => {
      // Get all assigned user IDs from conversations
      const assignedUserIds = [...new Set(
        conversations
          .map(c => c.assigned_to)
          .filter((id): id is string => !!id)
      )];

      // Get all reassigner IDs from conversations
      const reassignerUserIds = [...new Set(
        conversations
          .map(c => c.reassigned_by)
          .filter((id): id is string => !!id)
      )];

      const allUserIds = [...new Set([...assignedUserIds, ...reassignerUserIds])];

      if (allUserIds.length === 0) {
        setProfiles({});
        setReassignerProfiles({});
        return;
      }

      try {
        const queryParams = new URLSearchParams();
        allUserIds.forEach(id => queryParams.append('user_id[]', id));
        const data = await api.get<any[]>(`/profiles?${queryParams.toString()}`);

        if (data) {
          const profileMap: Record<string, Profile> = {};
          const reassignerMap: Record<string, Profile> = {};
          // Support both paginated and raw array responses
          const items = Array.isArray(data) ? data : data.data || [];
          items.forEach((p: any) => {
            profileMap[p.user_id] = p as Profile;
            reassignerMap[p.user_id] = p as Profile;
          });
          setProfiles(profileMap);
          setReassignerProfiles(reassignerMap);
        }
      } catch (error) {
        console.error('Failed to fetch profiles', error);
      }
    };

    fetchProfiles();
  }, [currentTenant, conversations]);

  // Fetch contacts with specific status for status filter
  useEffect(() => {
    if (!currentTenant || currentFilter.type !== 'status') {
      setContactsWithStatus(new Set());
      return;
    }

    const fetchContactsWithStatus = async () => {
      try {
        const data = await api.get<any[]>(`/contact-statuses?status_id=${currentFilter.statusId}`);
        if (data) {
          const items = Array.isArray(data) ? data : data.data || [];
          setContactsWithStatus(new Set(items.map((cs: any) => cs.contact_id)));
        }
      } catch (e) {
        console.error('Failed to fetch contact statuses', e);
      }
    };

    fetchContactsWithStatus();
  }, [currentTenant, currentFilter]);

  // Fetch unreplied conversation IDs (last message from contact)
  useEffect(() => {
    if (!currentTenant || conversations.length === 0) {
      setUnrepliedConversationIds(new Set());
      return;
    }

    const fetchUnrepliedConversations = async () => {
      // Get the last message for each conversation
      const conversationIds = conversations.map(c => c.id);
      
      // Query messages to find conversations where last message is from contact
      const unrepliedIds = new Set<string>();
      
      for (const conv of conversations) {
        try {
          const res = await api.get<any>(`/messages?conversation_id=${conv.id}&per_page=1&sort_by=created_at&sort_direction=desc`);
          const data = Array.isArray(res) ? res[0] : res.data?.[0];
          
          if (data?.sender_type === 'contact') {
            unrepliedIds.add(conv.id);
          }
        } catch (e) {
          // ignore individual errors to continue loop
        }
      }
      
      setUnrepliedConversationIds(unrepliedIds);
    };

    fetchUnrepliedConversations();
  }, [currentTenant, conversations]);

  // Filter grouped conversations based on current filter and search
  const filteredGroups = groupedConversations.filter((group) => {
    // Apply filter based on type
    let passesFilter = true;
    
    if (currentFilter.type === 'archived') {
      // Only show archived conversations
      passesFilter = group.conversations.some(c => c.status === 'archived');
    } else {
      // For all other filters, exclude archived conversations first
      const nonArchivedConversations = group.conversations.filter(c => c.status !== 'archived');
      if (nonArchivedConversations.length === 0) return false;
      
      if (currentFilter.type === 'mine') {
        passesFilter = nonArchivedConversations.some(c => c.assigned_to === user?.id);
      } else if (currentFilter.type === 'unassigned') {
        passesFilter = nonArchivedConversations.some(c => !c.assigned_to);
      } else if (currentFilter.type === 'unreplied') {
        passesFilter = nonArchivedConversations.some(c => unrepliedConversationIds.has(c.id));
      } else if (currentFilter.type === 'newly_assigned') {
        passesFilter = nonArchivedConversations.some(
          c => c.assigned_to === user?.id && !c.assignment_seen_by_assignee
        );
      } else if (currentFilter.type === 'status') {
        passesFilter = group.contacts.some(c => contactsWithStatus.has(c.id)) && 
                       nonArchivedConversations.length > 0;
      }
      // 'all' passes all non-archived
    }

    if (!passesFilter) return false;

    // Apply search filter
    if (!searchQuery) return true;
    const displayName = group.displayName.toLowerCase();
    const hasMatchingContact = group.contacts.some(c => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const hasMatchingPreview = group.conversations.some(c =>
      c.last_message_preview?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return displayName.includes(searchQuery.toLowerCase()) || hasMatchingContact || hasMatchingPreview;
  });

  // Fetch conversations
  useEffect(() => {
    if (!currentTenant || !user) return;

    const fetchConversations = async () => {
      setIsLoading(true);
      
      try {
        let endpoint = `/conversations?sort_by=last_message_at&sort_direction=desc`;
        if (!isAdmin) {
          endpoint += `&assigned_to=${user.id}`;
        }
        
        const data = await api.get<any>(endpoint);
        const items = Array.isArray(data) ? data : data.data || [];
        
        // Filter out offline contacts - they belong in the Contacts workspace
        const onlineConversations = items.filter(
          (conv: any) => conv.contact?.channel_type !== 'offline'
        );
        setConversations(onlineConversations as unknown as Conversation[]);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();

    // Subscribe to realtime updates via Echo
    const channelName = `tenant.${currentTenant.id}`;
    const channel = echo.channel(channelName);
    
    channel.listen('.ConversationUpdated', () => {
      fetchConversations();
    });

    return () => {
      channel.stopListening('.ConversationUpdated');
      echo.leaveChannel(channelName);
    };
  }, [currentTenant, user, isAdmin]);

  // Handle conversation query parameter from reminder notifications
  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && conversations.length > 0) {
      const targetConv = conversations.find(c => c.id === conversationId);
      if (targetConv) {
        setSelectedConversation(targetConv);
        // Find and set the group
        const targetGroup = groupedConversations.find(g => 
          g.conversations.some(c => c.id === conversationId)
        );
        if (targetGroup) {
          setSelectedGroup(targetGroup);
        }
        // Clear the query param
        setSearchParams({});
      }
    }
  }, [searchParams, conversations, groupedConversations, setSearchParams]);

  // Fetch linked contacts for the selected conversation's contact
  const fetchLinkedContacts = useCallback(async () => {
    if (!selectedConversation?.contact) {
      setLinkedContacts([]);
      return;
    }

    const contactId = selectedConversation.contact.id;

    try {
      const linkRes = await api.get<any>(`/contact-links?contact_id=${contactId}&per_page=1`);
      const linkData = Array.isArray(linkRes) ? linkRes[0] : linkRes.data?.[0];
      
      if (!linkData?.link_group_id) {
        setLinkedContacts([]);
        return;
      }

      const linkedRes = await api.get<any>(`/contact-links?link_group_id=${linkData.link_group_id}`);
      const linkedData = Array.isArray(linkedRes) ? linkedRes : linkedRes.data || [];
      const otherLinks = linkedData.filter((l: any) => l.contact_id !== contactId);

      if (otherLinks.length > 0) {
        const contactIds = otherLinks.map((l: any) => l.contact_id);
        const queryParams = new URLSearchParams();
        contactIds.forEach((id: string) => queryParams.append('id[]', id));
        const contactsRes = await api.get<any>(`/contacts?${queryParams.toString()}`);
        setLinkedContacts((Array.isArray(contactsRes) ? contactsRes : contactsRes.data || []) as Contact[]);
      } else {
        setLinkedContacts([]);
      }
    } catch (e) {
      console.error(e);
      setLinkedContacts([]);
    }
  }, [selectedConversation?.contact?.id]);

  // Fetch messages for selected conversation and mark as read
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setLinkedContacts([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const res = await api.get<any>(`/messages?conversation_id=${selectedConversation.id}&sort_by=created_at&sort_direction=asc`);
        setMessages((Array.isArray(res) ? res : res.data || []) as Message[]);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    const markAsRead = async () => {
      try {
        // Reset unread count on conversation
        await api.put(`/conversations/${selectedConversation.id}`, { unread_count: 0 });

        // Update local state
        setSelectedConversation((prev) => prev ? { ...prev, unread_count: 0 } : null);
        setConversations((prev) => 
          prev.map((c) => c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c)
        );
      } catch (e) {
        console.error('Failed to mark as read', e);
      }
    };

    const markAssignmentAsSeen = async () => {
      // Mark assignment as seen when the assignee opens the conversation
      if (selectedConversation.assigned_to === user?.id && !selectedConversation.assignment_seen_by_assignee) {
        try {
          await api.put(`/conversations/${selectedConversation.id}`, { assignment_seen_by_assignee: true });

          // Update local state
          setSelectedConversation((prev) => prev ? { ...prev, assignment_seen_by_assignee: true } : null);
          setConversations((prev) => 
            prev.map((c) => c.id === selectedConversation.id ? { ...c, assignment_seen_by_assignee: true } : c)
          );
        } catch (e) {
          console.error('Failed to mark assignment as seen', e);
        }
      }
    };

    fetchMessages();
    fetchLinkedContacts();
    
    // Mark as read when opening conversation
    if (selectedConversation.unread_count > 0) {
      markAsRead();
    }

    // Mark assignment as seen
    markAssignmentAsSeen();

    // Subscribe to new messages via Echo
    const channelName = `conversation.${selectedConversation.id}`;
    const channel = echo.channel(channelName);
    
    channel.listen('.MessageSent', (payload: any) => {
      if (payload.message) {
        setMessages((prev) => [...prev, payload.message as Message]);
      } else if (payload.new) {
        // Fallback in case payload matches supabase structure temporarily
        setMessages((prev) => [...prev, payload.new as Message]);
      }
    });

    return () => {
      channel.stopListening('.MessageSent');
      echo.leaveChannel(channelName);
    };
  }, [selectedConversation?.id, fetchLinkedContacts]);

  const handleSelectGroup = (group: GroupedConversation) => {
    setSelectedGroup(group);
    // Select the most recent conversation from the group
    const latestConv = group.conversations.reduce((latest, conv) => {
      if (!latest) return conv;
      if (!conv.last_message_at) return latest;
      if (!latest.last_message_at) return conv;
      return new Date(conv.last_message_at) > new Date(latest.last_message_at) ? conv : latest;
    }, undefined as Conversation | undefined);
    
    if (latestConv) {
      setSelectedConversation(latestConv);
    }
  };

  const handleSelectChannel = (group: GroupedConversation, channelType: ChannelType) => {
    setSelectedGroup(group);
    // Find the conversation for this channel
    const channelConv = group.conversations.find(
      c => c.contact?.channel_type === channelType
    );
    if (channelConv) {
      setSelectedConversation(channelConv);
    }
  };

  const handleSendMessage = async (content: string, media?: { url: string; type: 'image' | 'file'; filename: string }) => {
    if (!selectedConversation || !user) {
      throw new Error('No conversation selected');
    }

    const channelType = selectedConversation.contact?.channel_type;

    // If this is a Telegram conversation, send via Telegram API
    if (channelType === 'telegram' && (content.trim() || media)) {
      const { error: telegramError } = await api.invoke('send-telegram', {
        body: {
          conversation_id: selectedConversation.id,
          content: content || undefined,
          media: media ? { url: media.url, type: media.type, filename: media.filename } : undefined,
        }
      });
      if (telegramError) {
        console.error('Error sending to Telegram:', telegramError);
        throw new Error(telegramError.message || 'Failed to send to Telegram');
      }
    }

    // If this is a Messenger conversation, send via Messenger API first
    if (channelType === 'messenger') {
      const { error: messengerError } = await api.invoke('send-messenger', {
        body: { conversation_id: selectedConversation.id, content }
      });
      if (messengerError) {
        console.error('Error sending to Messenger:', messengerError);
        throw new Error(messengerError.message || 'Failed to send to Messenger');
      }
    }

    // Save message to database with media metadata if provided
    const messageInsert = {
      conversation_id: selectedConversation.id,
      sender_type: 'agent' as const,
      sender_id: user.id,
      content: content || (media ? `[${media.type === 'image' ? 'Image' : 'File'}: ${media.filename}]` : ''),
      metadata: media ? {
        media_url: media.url,
        media_type: media.type,
        media_filename: media.filename,
      } : null,
      media_url: media?.url ?? null,
      media_type: media?.type ?? null,
      media_filename: media?.filename ?? null,
    };

    try {
      await api.post('/messages', messageInsert);

      // Update conversation last message
      await api.put(`/conversations/${selectedConversation.id}`, {
        last_message_at: new Date().toISOString(),
        last_message_preview: (content || (media?.filename ? `📎 ${media.filename}` : '')).substring(0, 100),
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      throw new Error(error.message || 'Failed to save message');
    }
  };

  const handleStatusChange = async (status: ConversationStatus) => {
    if (!selectedConversation) return;

    try {
      await api.put(`/conversations/${selectedConversation.id}`, { status });
      setSelectedConversation((prev) => prev ? { ...prev, status } : null);
      toast({
        title: 'Status updated',
        description: `Conversation marked as ${status}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update conversation status',
        variant: 'destructive',
      });
    }
  };

  const handleLinksChanged = () => {
    fetchLinkedContacts();
    refreshLinks();
  };

  const handleDismissReason = async () => {
    if (!selectedConversation) return;
    
    try {
      await api.put(`/conversations/${selectedConversation.id}`, { assignment_reason: null, reassigned_by: null });
      setSelectedConversation((prev) => prev ? { ...prev, assignment_reason: null, reassigned_by: null } : null);
      setConversations((prev) => 
        prev.map((c) => c.id === selectedConversation.id ? { ...c, assignment_reason: null, reassigned_by: null } : c)
      );
    } catch (error) {
      console.error('Failed to dismiss reason', error);
    }
  };

  // Get reassigner name for current conversation
  const reassignerName = selectedConversation?.reassigned_by 
    ? reassignerProfiles[selectedConversation.reassigned_by]?.full_name 
    : undefined;

  // Mobile: stacked navigation — list view OR chat view
  if (isMobile) {
    const showChat = !!selectedConversation;
    return (
      <div className="flex flex-col h-full">
        {!showChat ? (
          <>
            {/* Horizontal filter strip */}
            <InboxSubNav
              tenantId={currentTenant?.id}
              currentFilter={currentFilter}
              onFilterChange={setCurrentFilter}
              conversations={conversations}
              groupedConversations={groupedConversations}
              userId={user?.id}
              unrepliedConversationIds={unrepliedConversationIds}
              horizontal
            />

            {/* Search */}
            <div className="p-3 border-b space-y-2 bg-card">
              <NotificationBanner />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* List fills the rest */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <UnifiedConversationList
                groupedConversations={filteredGroups}
                selectedGroupId={selectedGroup?.id}
                selectedConversationId={selectedConversation?.id}
                onSelectGroup={handleSelectGroup}
                onSelectChannel={handleSelectChannel}
                isAdmin={isAdmin}
                profiles={profiles}
                statusesByContact={statusesByContact}
                isLoading={isLoading}
              />
            </div>
          </>
        ) : (
          <ChatView
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
            onStatusChange={handleStatusChange}
            linkedContacts={linkedContacts}
            onLinksChanged={handleLinksChanged}
            selectedGroup={selectedGroup}
            onSelectConversation={setSelectedConversation}
            onReassigned={() => {
              setSelectedConversation(null);
              setSelectedGroup(null);
            }}
            reassignerName={reassignerName}
            onDismissReason={handleDismissReason}
            tenantId={currentTenant?.id}
            onBack={() => {
              setSelectedConversation(null);
              setSelectedGroup(null);
            }}
            showDetailsButton
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sub Navigation - always mounted for realtime, hidden when sidebar expanded */}
      <div className={sidebarCollapsed ? '' : 'hidden'}>
        <InboxSubNav
          tenantId={currentTenant?.id}
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
          conversations={conversations}
          groupedConversations={groupedConversations}
          userId={user?.id}
          unrepliedConversationIds={unrepliedConversationIds}
        />
      </div>

      {/* Conversation List Panel */}
      <div className="w-80 border-r flex flex-col bg-card">
        <div className="p-3 border-b space-y-2">
          <NotificationBanner />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <UnifiedConversationList
            groupedConversations={filteredGroups}
            selectedGroupId={selectedGroup?.id}
            selectedConversationId={selectedConversation?.id}
            onSelectGroup={handleSelectGroup}
            onSelectChannel={handleSelectChannel}
            isAdmin={isAdmin}
            profiles={profiles}
            statusesByContact={statusesByContact}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex min-w-0">
        {selectedConversation ? (
          <>
            <div className="flex-1 min-w-0">
              <ChatView
                conversation={selectedConversation}
                messages={messages}
                onSendMessage={handleSendMessage}
                onStatusChange={handleStatusChange}
                linkedContacts={linkedContacts}
                onLinksChanged={handleLinksChanged}
                selectedGroup={selectedGroup}
                onSelectConversation={setSelectedConversation}
                onReassigned={() => {
                  // Refresh conversations list after reassignment
                  setSelectedConversation(null);
                  setSelectedGroup(null);
                }}
                reassignerName={reassignerName}
                onDismissReason={handleDismissReason}
                tenantId={currentTenant?.id}
                showDetailsButton
              />
            </div>
            <div className="w-72 hidden lg:block">
              <ContactDetails 
                conversation={selectedConversation}
                messages={messages}
                linkedContacts={linkedContacts}
                selectedGroup={selectedGroup}
                onSelectConversation={setSelectedConversation}
                tenantId={currentTenant?.id}
                onSendToChat={(message) => handleSendMessage(message)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/30">
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the list to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export default function Inbox() {
  const { dataLoaded } = useAuth();

  if (!dataLoaded) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full w-full bg-background">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <InboxContent />
    </AppLayout>
  );
}
