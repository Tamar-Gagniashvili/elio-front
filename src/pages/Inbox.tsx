import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Conversation, Message, Contact, ConversationStatus } from '@/lib/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { ConversationList } from '@/components/inbox/ConversationList';
import { ChatView, ContactDetails } from '@/components/inbox/ChatView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type FilterStatus = 'all' | 'open' | 'assigned' | 'resolved';

export default function Inbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [linkedContacts, setLinkedContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const { currentTenant, user } = useAuth();
  const { toast } = useToast();

  // Fetch conversations
  useEffect(() => {
    if (!currentTenant) return;

    const fetchConversations = async () => {
      setIsLoading(true);
      let query = supabase
        .from('conversations')
        .select(`
          *,
          contact:contacts(*)
        `)
        .eq('tenant_id', currentTenant.id)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching conversations:', error);
      } else {
        setConversations((data || []) as unknown as Conversation[]);
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
  }, [currentTenant, filterStatus]);

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
      .single();

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

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const contactName = conv.contact?.name?.toLowerCase() || '';
    const preview = conv.last_message_preview?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return contactName.includes(query) || preview.includes(query);
  });

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Conversation List Panel */}
        <div className="w-80 border-r flex flex-col bg-card">
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                <TabsTrigger value="open" className="flex-1">Open</TabsTrigger>
                <TabsTrigger value="assigned" className="flex-1">Mine</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedConversation?.id}
              onSelect={setSelectedConversation}
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
                  onLinksChanged={fetchLinkedContacts}
                />
              </div>
              <div className="w-72 hidden lg:block">
                <ContactDetails 
                  conversation={selectedConversation} 
                  linkedContacts={linkedContacts}
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
    </AppLayout>
  );
}
