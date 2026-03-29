import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { echo } from '@/lib/echo';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
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


function InboxContent() {
  const { currentTenant, user, currentMembership } = useAuth();
  const { collapsed: sidebarCollapsed } = useSidebarState();
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
  const { groupedConversations, refreshLinks, isLoading: linksLoading } = useUnifiedContacts({
    conversations,
    tenantId: currentTenant?.id,
  });

  // Combined loading: wait for both conversations AND contact-link groups
  const isDataLoading = isLoading || linksLoading;

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
        const allProfiles = await api.get<Profile[]>('/profiles');
        const data = allProfiles.filter(p => allUserIds.includes(p.user_id));
        
        const profileMap: Record<string, Profile> = {};
        const reassignerMap: Record<string, Profile> = {};
        data.forEach(p => {
          profileMap[p.user_id] = p;
          reassignerMap[p.user_id] = p;
        });
        setProfiles(profileMap);
        setReassignerProfiles(reassignerMap);
      } catch (error) {
        console.error('Error fetching profiles', error);
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
        const data = await api.get<any[]>(`/contact-statuses`);
        const filtered = data.filter(cs => cs.status_id === currentFilter.statusId);
        setContactsWithStatus(new Set(filtered.map(cs => cs.contact_id)));
      } catch (error) {
        console.error('Error fetching filtered contact statuses', error);
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
          const msgs = await api.get<any[]>(`/messages?conversation_id=${conv.id}`);
          msgs.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          if (msgs[0]?.sender_type === 'contact') {
            unrepliedIds.add(conv.id);
          }
        } catch (error) {
          console.error('Error fetching messages for unreplied conversations', error);
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
      try {
        let convsData = await api.get<any[]>(`/conversations`);

        // Sales users only see their assigned conversations
        if (!isAdmin) {
          convsData = convsData.filter(c => c.assigned_to === user.id);
        }
        
        // Contacts injection lookup
        const contactsData = await api.get<any[]>(`/contacts`);
        
        const mergedData = convsData.map(c => ({
          ...c,
          contact: contactsData.find(con => con.id === c.contact_id)
        }));

        mergedData.sort((a,b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

        // Filter out offline contacts - they belong in the Contacts workspace
        const onlineConversations = mergedData.filter(
          (conv: any) => conv.contact?.channel_type !== 'offline'
        );
        setConversations(onlineConversations as unknown as Conversation[]);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      }
      setIsLoading(false);
    };

    fetchConversations();

    // Listen for real-time conversation updates via Laravel Reverb
    if (currentTenant?.id) {
      const tenantChannel = echo.channel(`tenant.${currentTenant.id}`);
      tenantChannel.listen('ConversationUpdated', () => {
        fetchConversations();
      });
      return () => {
        echo.leaveChannel(`tenant.${currentTenant.id}`);
      };
    }
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
      // First, check if this contact has a link group
      const allLinks = await api.get<any[]>('/contact-links');
      const linkData = allLinks.find(l => l.contact_id === contactId);

      if (!linkData?.link_group_id) {
        setLinkedContacts([]);
        return;
      }

      // Fetch all linked contacts in the same group (excluding current)
      const linkedData = allLinks.filter(l => l.link_group_id === linkData.link_group_id && l.contact_id !== contactId);

      if (linkedData && linkedData.length > 0) {
        const contactIds = linkedData.map(l => l.contact_id);
        const allContacts = await api.get<any[]>('/contacts');
        const contacts = allContacts.filter(c => contactIds.includes(c.id));
        setLinkedContacts((contacts || []) as Contact[]);
      } else {
        setLinkedContacts([]);
      }
    } catch(e) {
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
        const data = await api.get<Message[]>(`/messages?conversation_id=${selectedConversation.id}`);
        data.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    const markAsRead = async () => {
      try {
        await api.put(`/conversations/${selectedConversation.id}`, { unread_count: 0 });
        // Update local state
        setSelectedConversation((prev) => prev ? { ...prev, unread_count: 0 } : null);
        setConversations((prev) => 
          prev.map((c) => c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c)
        );
      } catch (error) {
        console.error('Failed to mark unread messages');
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
        } catch(e) {}
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

    // Listen for real-time messages via Laravel Reverb
    const channelName = `conversation.${selectedConversation.id}`;
    const channel = echo.channel(channelName);

    channel.listen('MessageSent', (e: { message: Message }) => {
      setMessages(prev => {
        if (prev.some(m => m.id === e.message.id)) return prev;
        return [...prev, e.message].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      });
      
      // Automatically mark as read if contact sends a message while we are looking at it
      if (e.message.sender_type !== 'agent') {
        markAsRead();
      }
    });

    // Re-fetch once after Echo connects to catch any messages that arrived
    // before the WebSocket handshake completed (guards against refresh gaps).
    const safetyCatchTimeout = setTimeout(fetchMessages, 2000);

    return () => {
      clearTimeout(safetyCatchTimeout);
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
    if (!selectedConversation || !user) return;

    const channelType = selectedConversation.contact?.channel_type;

    // If this is a Telegram conversation, send via Telegram API first
    if (channelType === 'telegram') {
      const { error: telegramError } = await api.invoke('send-telegram', {
        body: { conversation_id: selectedConversation.id, content }
      });
      if (telegramError) {
        console.error('Error sending to Telegram:', telegramError);
        toast({ title: 'Error', description: 'Failed to send message to Telegram', variant: 'destructive' });
        return;
      }
    }

    // If this is a Messenger conversation, send via Messenger API first
    if (channelType === 'messenger') {
      const { error: messengerError } = await api.invoke('send-messenger', {
        body: { conversation_id: selectedConversation.id, content }
      });
      if (messengerError) {
        console.error('Error sending to Messenger:', messengerError);
        toast({ title: 'Error', description: 'Failed to send message to Messenger', variant: 'destructive' });
        return;
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
      // Store in dedicated columns for edge function queries
      media_url: media?.url ?? null,
      media_type: media?.type ?? null,
      media_filename: media?.filename ?? null,
    };

    try {
      // Optimistic UI update: Instantly show the message in the chat
      const tempMessage = {
        id: crypto.randomUUID(),
        ...messageInsert,
        is_read: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as Message;
      
      setMessages(prev => [...prev, tempMessage]);

      const previewText = (content || (media?.filename ? `📎 ${media.filename}` : '')).substring(0, 100);
      
      // Optimistic UI update: Instantly show conversation list preview
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation.id ? { 
          ...c, 
          last_message_at: new Date().toISOString(),
          last_message_preview: previewText
        } : c
      ));

      await api.post('/messages', messageInsert);
      
      // Update conversation last message on server
      await api.put(`/conversations/${selectedConversation.id}`, {
        last_message_at: new Date().toISOString(),
        last_message_preview: previewText,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      return;
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
    } catch(e) {}
  };

  // Get reassigner name for current conversation
  const reassignerName = selectedConversation?.reassigned_by 
    ? reassignerProfiles[selectedConversation.reassigned_by]?.full_name 
    : undefined;

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
          />
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex">
        {selectedConversation ? (
          <>
            <div className="flex-1">
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
  return (
    <AppLayout>
      <InboxContent />
    </AppLayout>
  );
}
