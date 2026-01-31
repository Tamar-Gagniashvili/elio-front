import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Conversation, Message, Contact, ConversationStatus, ChannelType } from '@/lib/types';
import { useUnifiedContacts, GroupedConversation } from '@/hooks/useUnifiedContacts';
import { AppLayout, useSidebarState } from '@/components/layout/AppLayout';
import { UnifiedConversationList } from '@/components/inbox/UnifiedConversationList';
import { ChatView, ContactDetails } from '@/components/inbox/ChatView';
import { InboxSubNav, InboxFilter } from '@/components/inbox/InboxSubNav';
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
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Use unified contacts hook
  const { groupedConversations, refreshLinks } = useUnifiedContacts({
    conversations,
    tenantId: currentTenant?.id,
  });

  // Fetch contacts with specific status for status filter
  useEffect(() => {
    if (!currentTenant || currentFilter.type !== 'status') {
      setContactsWithStatus(new Set());
      return;
    }

    const fetchContactsWithStatus = async () => {
      const { data, error } = await supabase
        .from('contact_statuses')
        .select('contact_id')
        .eq('tenant_id', currentTenant.id)
        .eq('status_id', currentFilter.statusId);

      if (!error && data) {
        setContactsWithStatus(new Set(data.map(cs => cs.contact_id)));
      }
    };

    fetchContactsWithStatus();
  }, [currentTenant, currentFilter]);

  // Filter grouped conversations based on current filter and search
  const filteredGroups = groupedConversations.filter((group) => {
    // Apply filter based on type
    let passesFilter = true;
    
    if (currentFilter.type === 'mine') {
      // At least one conversation assigned to current user
      passesFilter = group.conversations.some(c => c.assigned_to === user?.id);
    } else if (currentFilter.type === 'unassigned') {
      // At least one conversation is unassigned
      passesFilter = group.conversations.some(c => !c.assigned_to);
    } else if (currentFilter.type === 'status') {
      // At least one contact in the group has the selected status
      passesFilter = group.contacts.some(c => contactsWithStatus.has(c.id));
    }
    // 'all' passes all

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
    if (!currentTenant) return;

    const fetchConversations = async () => {
      setIsLoading(true);
      const query = supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq('tenant_id', currentTenant.id)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching conversations:', error);
      } else {
        // Filter out offline contacts - they belong in the Contacts workspace
        const onlineConversations = (data || []).filter(
          (conv: any) => conv.contact?.channel_type !== 'offline'
        );
        setConversations(onlineConversations as unknown as Conversation[]);
      }
      setIsLoading(false);
    };

    fetchConversations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant]);

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

    // First, check if this contact has a link group
    const { data: linkData } = await supabase
      .from('contact_links')
      .select('link_group_id')
      .eq('contact_id', contactId)
      .maybeSingle();

    if (!linkData?.link_group_id) {
      setLinkedContacts([]);
      return;
    }

    // Fetch all linked contacts in the same group (excluding current)
    const { data: linkedData } = await supabase
      .from('contact_links')
      .select('contact_id')
      .eq('link_group_id', linkData.link_group_id)
      .neq('contact_id', contactId);

    if (linkedData && linkedData.length > 0) {
      const contactIds = linkedData.map(l => l.contact_id);
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .in('id', contactIds);
      
      setLinkedContacts((contacts || []) as Contact[]);
    } else {
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
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data as Message[]);
      }
    };

    const markAsRead = async () => {
      // Reset unread count on conversation
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', selectedConversation.id);

      // Update local state
      setSelectedConversation((prev) => prev ? { ...prev, unread_count: 0 } : null);
      setConversations((prev) => 
        prev.map((c) => c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c)
      );
    };

    fetchMessages();
    fetchLinkedContacts();
    
    // Mark as read when opening conversation
    if (selectedConversation.unread_count > 0) {
      markAsRead();
    }

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation || !user) return;

    const channelType = selectedConversation.contact?.channel_type;

    // If this is a Telegram conversation, send via Telegram API first
    if (channelType === 'telegram') {
      const { data, error: telegramError } = await supabase.functions.invoke('send-telegram', {
        body: {
          conversation_id: selectedConversation.id,
          content
        }
      });

      if (telegramError) {
        console.error('Error sending to Telegram:', telegramError);
        toast({
          title: 'Error',
          description: 'Failed to send message to Telegram',
          variant: 'destructive',
        });
        return;
      }
    }

    // Save message to database
    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversation.id,
      sender_type: 'agent',
      sender_id: user.id,
      content,
    });

    if (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      return;
    }

    // Update conversation last message
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.substring(0, 100),
      })
      .eq('id', selectedConversation.id);
  };

  const handleStatusChange = async (status: ConversationStatus) => {
    if (!selectedConversation) return;

    const { error } = await supabase
      .from('conversations')
      .update({ status })
      .eq('id', selectedConversation.id);

    if (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update conversation status',
        variant: 'destructive',
      });
    } else {
      setSelectedConversation((prev) => prev ? { ...prev, status } : null);
      toast({
        title: 'Status updated',
        description: `Conversation marked as ${status}`,
      });
    }
  };

  const handleLinksChanged = () => {
    fetchLinkedContacts();
    refreshLinks();
  };

  return (
    <div className="flex h-full">
      {/* Sub Navigation - shown only when sidebar is collapsed */}
      {sidebarCollapsed && (
        <InboxSubNav
          tenantId={currentTenant?.id}
          currentFilter={currentFilter}
          onFilterChange={setCurrentFilter}
        />
      )}

      {/* Conversation List Panel */}
      <div className="w-80 border-r flex flex-col bg-card">
        <div className="p-4 border-b">
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
              />
            </div>
            <div className="w-72 hidden lg:block">
              <ContactDetails 
                conversation={selectedConversation}
                linkedContacts={linkedContacts}
                selectedGroup={selectedGroup}
                onSelectConversation={setSelectedConversation}
                tenantId={currentTenant?.id}
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
