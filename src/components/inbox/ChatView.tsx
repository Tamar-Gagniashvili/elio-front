import { useState, useRef, useEffect } from 'react';
import { Conversation, Message, Contact } from '@/lib/types';
import { GroupedConversation } from '@/hooks/useUnifiedContacts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Avatar } from '@/components/Avatar';
import { ChannelBadge } from '@/components/ChannelBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Send, MoreVertical, User, Mail, Phone, Link2, Tag, UserPlus, AlertCircle, X } from 'lucide-react';
import { ChatMediaUpload } from './ChatMediaUpload';
import { ChatMessageBubble } from './ChatMessageBubble';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LinkContactDialog } from './LinkContactDialog';
import { ManageStatusDialog } from './ManageStatusDialog';
import { ContactNotes } from './ContactNotes';
import { ContactStatusesDisplay } from './ContactStatusesDisplay';
import { ReassignDialog } from './ReassignDialog';
import { LinkedObjectsPanel } from './LinkedObjectsPanel';
import { AISuggestionsPanel } from './AISuggestionsPanel';
import { useConversationObjects } from '@/hooks/useConversationObjects';

interface MediaUpload {
  url: string;
  type: 'image' | 'file';
  filename: string;
}

interface ChatViewProps {
  conversation: Conversation;
  messages: Message[];
  onSendMessage: (content: string, media?: MediaUpload) => Promise<void>;
  onStatusChange: (status: 'open' | 'assigned' | 'resolved' | 'archived') => void;
  linkedContacts?: Contact[];
  onLinksChanged?: () => void;
  selectedGroup?: GroupedConversation | null;
  onSelectConversation?: (conversation: Conversation) => void;
  onReassigned?: () => void;
  reassignerName?: string;
  onDismissReason?: () => void;
  tenantId?: string;
}

export function ChatView({ 
  conversation, 
  messages, 
  onSendMessage, 
  onStatusChange, 
  linkedContacts = [], 
  onLinksChanged,
  selectedGroup,
  onSelectConversation,
  onReassigned,
  reassignerName,
  onDismissReason,
  tenantId,
}: ChatViewProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<MediaUpload | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, profile, currentMembership } = useAuth();
  
  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';

  // Get channel types from the group
  const channelTypes = selectedGroup?.contacts.map(c => c.channel_type) || 
    (conversation.contact ? [conversation.contact.channel_type] : []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if ((!newMessage.trim() && !pendingMedia) || isSending) return;
    
    setIsSending(true);
    try {
      await onSendMessage(newMessage.trim(), pendingMedia || undefined);
      setNewMessage('');
      setPendingMedia(null);
    } finally {
      setIsSending(false);
    }
  };

  const handleMediaUpload = (media: MediaUpload) => {
    setPendingMedia(media);
  };

  const removePendingMedia = () => {
    setPendingMedia(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar
              src={conversation.contact?.avatar_url}
              name={conversation.contact?.name}
              size="lg"
            />
            {conversation.contact && (
              <div className="absolute -bottom-1 -right-1">
                <ChannelBadge 
                  channelType={conversation.contact.channel_type} 
                  size="sm"
                />
              </div>
            )}
          </div>
          <div>
            <h2 className="font-semibold text-foreground">
              {conversation.contact?.name || 'Unknown Contact'}
            </h2>
            {/* Only show status and assignment info for admins */}
            {isAdmin && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge 
                  variant={conversation.status === 'open' ? 'default' : 'secondary'}
                  className={cn(
                    'h-5 text-[10px]',
                    conversation.status === 'open' && 'bg-success text-success-foreground'
                  )}
                >
                  {conversation.status}
                </Badge>
                {conversation.assigned_to && (
                  <span>Assigned to {conversation.assigned_profile?.full_name || 'Agent'}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {conversation.contact && (
              <>
                {/* Sales can reassign their own leads, admins can reassign any */}
                {(isAdmin || conversation.assigned_to === user?.id) && (
                  <DropdownMenuItem onClick={() => setIsReassignDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Reassign Contact
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setIsLinkDialogOpen(true)}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Link Contact
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsStatusDialogOpen(true)}>
                  <Tag className="h-4 w-4 mr-2" />
                  Manage Status
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => onStatusChange('resolved')}>
              Mark as Resolved
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStatusChange('archived')}>
              Archive
            </DropdownMenuItem>
            {conversation.status === 'archived' && (
              <DropdownMenuItem onClick={() => onStatusChange('open')}>
                Reopen
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Reassign Dialog */}
      <ReassignDialog
        open={isReassignDialogOpen}
        onOpenChange={setIsReassignDialogOpen}
        conversationId={conversation.id}
        currentAssignee={conversation.assigned_to}
        onReassigned={onReassigned}
      />

      {/* Link Contact Dialog */}
      {conversation.contact && (
        <>
          <LinkContactDialog
            open={isLinkDialogOpen}
            onOpenChange={setIsLinkDialogOpen}
            contact={conversation.contact}
            onLinksChanged={onLinksChanged || (() => {})}
          />
          <ManageStatusDialog
            open={isStatusDialogOpen}
            onOpenChange={setIsStatusDialogOpen}
            contact={conversation.contact}
          />
        </>
      )}
      {/* Reassignment Reason Alert */}
      {conversation.assignment_reason && (
        <div className="px-4 pt-4">
          <Alert className="bg-amber-500/10 border-amber-500/50 text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between">
              <span>Reassignment Note</span>
              {onDismissReason && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 -mr-2"
                  onClick={onDismissReason}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </AlertTitle>
            <AlertDescription>
              {reassignerName && (
                <span className="font-medium">{reassignerName}: </span>
              )}
              {conversation.assignment_reason}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 scrollbar-thin">
        {messages.map((message) => {
          const isAgent = message.sender_type === 'agent';
          const isSystem = message.sender_type === 'system';

          if (isSystem) {
            return (
              <div key={message.id} className="flex justify-center">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {message.content}
                </span>
              </div>
            );
          }

          return (
            <ChatMessageBubble
              key={message.id}
              message={message}
              isAgent={isAgent}
              contactAvatar={conversation.contact?.avatar_url}
              contactName={conversation.contact?.name}
              agentAvatar={profile?.avatar_url}
              agentName={profile?.full_name}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-card">
        {/* Pending media preview */}
        {pendingMedia && (
          <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded-md">
            {pendingMedia.type === 'image' ? (
              <img src={pendingMedia.url} alt="" className="h-12 w-12 object-cover rounded" />
            ) : (
              <div className="h-12 w-12 bg-muted-foreground/10 rounded flex items-center justify-center">
                <span className="text-xs text-muted-foreground">FILE</span>
              </div>
            )}
            <span className="flex-1 text-sm truncate">{pendingMedia.filename}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={removePendingMedia}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex items-end gap-2">
          {tenantId && (
            <ChatMediaUpload
              tenantId={tenantId}
              conversationId={conversation.id}
              onUploadComplete={handleMediaUpload}
              disabled={isSending}
            />
          )}
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-32 resize-none flex-1"
            rows={1}
          />
          <Button 
            onClick={handleSend} 
            disabled={(!newMessage.trim() && !pendingMedia) || isSending}
            size="icon"
            className="flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ContactDetails({ 
  conversation, 
  messages = [],
  linkedContacts = [],
  selectedGroup,
  onSelectConversation,
  tenantId,
  onSendToChat,
}: { 
  conversation: Conversation;
  messages?: Message[];
  linkedContacts?: Contact[];
  selectedGroup?: GroupedConversation | null;
  onSelectConversation?: (conversation: Conversation) => void;
  tenantId?: string;
  onSendToChat?: (message: string) => void;
}) {
  const contact = conversation.contact;
  
  // Get display name from group or contact
  const displayName = selectedGroup?.displayName || contact?.name || 'Unknown Contact';
  
  // Get all channels from the group
  const channels = selectedGroup?.contacts || (contact ? [contact] : []);

  // Linked objects hook
  const {
    linkedObjects,
    loading: objectsLoading,
    linkObject,
    unlinkObject,
  } = useConversationObjects(conversation.id, tenantId || null);

  return (
    <div className="h-full bg-card border-l flex flex-col overflow-y-auto">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Contact Details
        </h3>
      </div>

      <div className="p-4 flex flex-col items-center">
        <Avatar
          src={contact?.avatar_url}
          name={displayName}
          size="xl"
        />
        <h3 className="font-semibold text-lg mt-3">
          {displayName}
        </h3>
        
        {/* Channel icons for unified contacts */}
        {selectedGroup && selectedGroup.isUnified ? (
          <div className="flex items-center gap-2 mt-2">
            {channels.map((channelContact) => {
              const isActive = channelContact.id === contact?.id;
              const channelConv = selectedGroup.conversations.find(
                c => c.contact?.id === channelContact.id
              );
              
              return (
                <button
                  key={channelContact.id}
                  onClick={() => channelConv && onSelectConversation?.(channelConv)}
                  className={cn(
                    'p-1 rounded-full transition-all',
                    isActive 
                      ? 'ring-2 ring-primary ring-offset-2' 
                      : 'hover:ring-2 hover:ring-muted-foreground/50'
                  )}
                >
                  <ChannelBadge 
                    channelType={channelContact.channel_type} 
                    size="md"
                  />
                </button>
              );
            })}
          </div>
        ) : contact && (
          <ChannelBadge 
            channelType={contact.channel_type} 
            showLabel 
            className="mt-1"
          />
        )}
      </div>

      <div className="px-4 space-y-3">
        {contact?.email && (
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{contact.email}</span>
          </div>
        )}
        {contact?.phone && (
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{contact.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-3 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            Customer since {contact?.created_at 
              ? new Date(contact.created_at).toLocaleDateString() 
              : 'Unknown'}
          </span>
        </div>
      </div>

      {/* Lead Statuses Section */}
      {contact && tenantId && (
        <ContactStatusesDisplay contactId={contact.id} tenantId={tenantId} />
      )}

      {/* All Channels Section for unified contacts */}
      {selectedGroup && selectedGroup.isUnified && channels.length > 1 && (
        <div className="mt-6 px-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              All Channels
            </h4>
          </div>
          <div className="space-y-2">
            {channels.map((channelContact) => {
              const isActive = channelContact.id === contact?.id;
              const channelConv = selectedGroup.conversations.find(
                c => c.contact?.id === channelContact.id
              );
              
              return (
                <button
                  key={channelContact.id}
                  onClick={() => channelConv && onSelectConversation?.(channelConv)}
                  className={cn(
                    'w-full flex items-center gap-2 p-2 rounded-md transition-colors text-left',
                    isActive 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'bg-muted/50 hover:bg-muted'
                  )}
                >
                  <ChannelBadge
                    channelType={channelContact.channel_type}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {channelContact.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {channelContact.email || channelContact.phone || ''}
                    </p>
                  </div>
                  {isActive && (
                    <Badge variant="secondary" className="text-[10px]">
                      Active
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Linked Contacts Section (fallback for non-unified) */}
      {!selectedGroup?.isUnified && linkedContacts.length > 0 && (
        <div className="mt-6 px-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Linked Contacts
            </h4>
          </div>
          <div className="space-y-2">
            {linkedContacts.map((linkedContact) => (
              <div
                key={linkedContact.id}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
              >
                <Avatar
                  src={linkedContact.avatar_url}
                  name={linkedContact.name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {linkedContact.name || 'Unknown'}
                  </p>
                  <ChannelBadge
                    channelType={linkedContact.channel_type}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Objects Section */}
      {tenantId && (
        <LinkedObjectsPanel
          linkedObjects={linkedObjects}
          loading={objectsLoading}
          onLink={linkObject}
          onUnlink={unlinkObject}
          onSendToChat={onSendToChat}
          tenantId={tenantId}
          conversationId={conversation.id}
        />
      )}

      {/* AI Suggestions Section */}
      {tenantId && (
        <AISuggestionsPanel
          messages={messages.map(m => ({ 
            id: m.id, 
            content: m.content, 
            sender_type: m.sender_type 
          }))}
          tenantId={tenantId}
          conversationId={conversation.id}
          linkedObjectIds={linkedObjects.map(o => o.id)}
          onLink={linkObject}
        />
      )}

      {/* Contact Notes Section */}
      {contact && tenantId && (
        <ContactNotes contactId={contact.id} tenantId={tenantId} />
      )}
    </div>
  );
}
