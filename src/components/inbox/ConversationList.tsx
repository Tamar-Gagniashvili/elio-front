import { formatDistanceToNow } from 'date-fns';
import { Conversation } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { ChannelBadge } from '@/components/ChannelBadge';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="font-semibold text-foreground mb-1">No conversations yet</h3>
        <p className="text-sm text-muted-foreground">
          When customers message you, they'll appear here
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {conversations.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelect(conversation)}
          className={cn(
            'flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50',
            selectedId === conversation.id && 'bg-accent'
          )}
        >
          <div className="relative flex-shrink-0">
            <Avatar
              src={conversation.contact?.avatar_url}
              name={conversation.contact?.name}
              size="md"
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

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="font-medium text-foreground truncate">
                {conversation.contact?.name || 'Unknown Contact'}
              </span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {conversation.last_message_at
                  ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: false })
                  : ''}
              </span>
            </div>

            <p className="text-sm text-muted-foreground truncate">
              {conversation.last_message_preview || 'No messages yet'}
            </p>

            <div className="flex items-center gap-2 mt-1.5">
              {conversation.unread_count > 0 && (
                <Badge variant="default" className="h-5 min-w-5 px-1.5">
                  {conversation.unread_count}
                </Badge>
              )}
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
                <span className="text-xs text-muted-foreground">
                  Assigned
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
