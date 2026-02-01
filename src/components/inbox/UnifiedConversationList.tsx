import { formatDistanceToNow } from 'date-fns';
import { Conversation, ChannelType, Profile } from '@/lib/types';
import { GroupedConversation } from '@/hooks/useUnifiedContacts';
import { Avatar } from '@/components/Avatar';
import { ChannelBadge } from '@/components/ChannelBadge';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Link2 } from 'lucide-react';

interface UnifiedConversationListProps {
  groupedConversations: GroupedConversation[];
  selectedGroupId?: string;
  selectedConversationId?: string;
  onSelectGroup: (group: GroupedConversation) => void;
  onSelectChannel?: (group: GroupedConversation, channelType: ChannelType) => void;
  isAdmin?: boolean;
  profiles?: Record<string, Profile>;
}

export function UnifiedConversationList({ 
  groupedConversations, 
  selectedGroupId,
  selectedConversationId,
  onSelectGroup,
  onSelectChannel,
  isAdmin = false,
  profiles = {},
}: UnifiedConversationListProps) {
  if (groupedConversations.length === 0) {
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

  // Get unique channel types from a group's contacts
  const getChannelTypes = (group: GroupedConversation): ChannelType[] => {
    const types = new Set<ChannelType>();
    group.contacts.forEach(c => types.add(c.channel_type));
    return Array.from(types);
  };

  // Get the latest conversation from the group
  const getLatestConversation = (group: GroupedConversation): Conversation | undefined => {
    return group.conversations.reduce((latest, conv) => {
      if (!latest) return conv;
      if (!conv.last_message_at) return latest;
      if (!latest.last_message_at) return conv;
      return new Date(conv.last_message_at) > new Date(latest.last_message_at) ? conv : latest;
    }, undefined as Conversation | undefined);
  };

  // Get the latest conversation's status
  const getGroupStatus = (group: GroupedConversation): string => {
    const latest = getLatestConversation(group);
    return latest?.status || 'open';
  };

  // Get assignee name from the latest conversation
  const getAssigneeName = (group: GroupedConversation): string | null => {
    const latest = getLatestConversation(group);
    if (!latest?.assigned_to) return null;
    const profile = profiles[latest.assigned_to];
    if (profile) {
      return profile.full_name || profile.email?.split('@')[0] || null;
    }
    return null;
  };

  return (
    <div className="flex flex-col divide-y divide-border">
      {groupedConversations.map((group) => {
        const isSelected = selectedGroupId === group.id || 
          group.conversations.some(c => c.id === selectedConversationId);
        const latestConversation = getLatestConversation(group);
        const channelTypes = getChannelTypes(group);
        const status = getGroupStatus(group);
        const primaryContact = group.contacts[0];
        const assigneeName = isAdmin ? getAssigneeName(group) : null;

        return (
          <button
            key={group.id}
            onClick={() => onSelectGroup(group)}
            className={cn(
              'flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50',
              isSelected && 'bg-accent'
            )}
          >
            <div className="relative flex-shrink-0">
              <Avatar
                src={primaryContact?.avatar_url}
                name={group.displayName}
                size="md"
              />
              {/* Show link indicator for unified contacts */}
              {group.isUnified && (
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                  <Link2 className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-medium text-foreground truncate">
                  {group.displayName}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {group.lastMessageAt
                    ? formatDistanceToNow(new Date(group.lastMessageAt), { addSuffix: false })
                    : ''}
                </span>
              </div>

              <p className="text-sm text-muted-foreground truncate">
                {latestConversation?.last_message_preview || 'No messages yet'}
              </p>

              {/* Channel badges row with per-channel unread counts */}
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {channelTypes.map((channelType) => {
                  const unreadCount = group.unreadByChannel[channelType] || 0;
                  const channelConv = group.conversations.find(
                    c => c.contact?.channel_type === channelType
                  );
                  
                  return (
                    <div
                      key={channelType}
                      className="relative cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectChannel && channelConv) {
                          onSelectChannel(group, channelType);
                        }
                      }}
                    >
                      <ChannelBadge 
                        channelType={channelType} 
                        size="md"
                        className="hover:ring-2 hover:ring-primary/50 rounded-full transition-all"
                      />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                  );
                })}

                <div className="flex-1" />
                
                {/* Show assignee name for admins, or status badge */}
                {isAdmin && assigneeName ? (
                  <span className="text-[10px] text-muted-foreground truncate max-w-20">
                    {assigneeName}
                  </span>
                ) : isAdmin && !latestConversation?.assigned_to ? (
                  <Badge 
                    variant="outline"
                    className="h-5 text-[10px]"
                  >
                    unassigned
                  </Badge>
                ) : null}

                {/* Status badge - only show for admins */}
                {isAdmin && (
                  <Badge 
                    variant={status === 'open' ? 'default' : 'secondary'}
                    className={cn(
                      'h-5 text-[10px]',
                      status === 'open' && 'bg-success text-success-foreground'
                    )}
                  >
                    {status}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
