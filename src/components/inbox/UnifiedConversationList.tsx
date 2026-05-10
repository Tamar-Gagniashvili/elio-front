import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { useMemo, useRef, useEffect, useState } from 'react';
import { List, type RowComponentProps } from 'react-window';
import { Conversation, ChannelType, Profile, LeadStatus } from '@/lib/types';
import { GroupedConversation } from '@/hooks/useUnifiedContacts';
import { Avatar } from '@/components/Avatar';
import { ChannelBadge } from '@/components/ChannelBadge';
import { StatusIndicator } from '@/components/StatusIcon';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Link2, MessageCircle } from 'lucide-react';
import { getColorHex } from '@/pages/Statuses';
import { EmptyState } from '@/components/EmptyState';
import { ConversationListSkeleton } from '@/components/skeletons/ListSkeletons';

interface UnifiedConversationListProps {
  groupedConversations: GroupedConversation[];
  selectedGroupId?: string;
  selectedConversationId?: string;
  onSelectGroup: (group: GroupedConversation) => void;
  onSelectChannel?: (group: GroupedConversation, channelType: ChannelType) => void;
  isAdmin?: boolean;
  profiles?: Record<string, Profile>;
  statusesByContact?: Record<string, LeadStatus[]>;
  isLoading?: boolean;
}

const ROW_HEIGHT = 104;
const VIRTUALIZE_THRESHOLD = 50;

interface RowData {
  groups: GroupedConversation[];
  selectedGroupId?: string;
  selectedConversationId?: string;
  onSelectGroup: (group: GroupedConversation) => void;
  onSelectChannel?: (group: GroupedConversation, channelType: ChannelType) => void;
  isAdmin: boolean;
  profiles: Record<string, Profile>;
  statusesByContact: Record<string, LeadStatus[]>;
  t: (key: string) => string;
}

function getLatestConversation(group: GroupedConversation): Conversation | undefined {
  return group.conversations.reduce((latest, conv) => {
    if (!latest) return conv;
    if (!conv.last_message_at) return latest;
    if (!latest.last_message_at) return conv;
    return new Date(conv.last_message_at) > new Date(latest.last_message_at) ? conv : latest;
  }, undefined as Conversation | undefined);
}

function ConversationRow({
  group,
  data,
  style,
}: {
  group: GroupedConversation;
  data: RowData;
  style?: React.CSSProperties;
}) {
  const {
    selectedGroupId,
    selectedConversationId,
    onSelectGroup,
    onSelectChannel,
    isAdmin,
    profiles,
    statusesByContact,
    t,
  } = data;

  const isSelected =
    selectedGroupId === group.id ||
    group.conversations.some((c) => c.id === selectedConversationId);
  const latestConversation = getLatestConversation(group);

  const channelTypes = useMemo(() => {
    const types = new Set<ChannelType>();
    group.contacts.forEach((c) => types.add(c.channel_type));
    return Array.from(types);
  }, [group.contacts]);

  const status = latestConversation?.status || 'open';
  const primaryContact = group.contacts[0];

  const assigneeName = (() => {
    if (!isAdmin || !latestConversation?.assigned_to) return null;
    const profile = profiles[latestConversation.assigned_to];
    if (profile) return profile.full_name || profile.email?.split('@')[0] || null;
    return null;
  })();

  const groupStatuses = useMemo(() => {
    const uniqueStatuses: LeadStatus[] = [];
    const seenIds = new Set<string>();
    for (const contact of group.contacts) {
      const contactStatuses = statusesByContact[contact.id] || [];
      for (const s of contactStatuses) {
        if (!seenIds.has(s.id)) {
          seenIds.add(s.id);
          uniqueStatuses.push(s);
        }
      }
    }
    return uniqueStatuses;
  }, [group.contacts, statusesByContact]);

  return (
    <button
      onClick={() => onSelectGroup(group)}
      style={style}
      className={cn(
        'flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 border-b border-border w-full',
        isSelected && 'bg-accent'
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar src={primaryContact?.avatar_url} name={group.displayName} size="md" />
        {group.isUnified && (
          <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
            <Link2 className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-medium text-foreground truncate">{group.displayName}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {group.lastMessageAt
              ? formatDistanceToNow(new Date(group.lastMessageAt), { addSuffix: false })
              : ''}
          </span>
        </div>

        <p className="text-sm text-muted-foreground truncate">
          {latestConversation?.last_message_preview || t('inbox.noMessagesYet')}
        </p>

        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {channelTypes.map((channelType) => {
            const unreadCount = group.unreadByChannel[channelType] || 0;
            const channelConv = group.conversations.find(
              (c) => c.contact?.channel_type === channelType
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

          {isAdmin && assigneeName ? (
            <span className="text-[10px] text-muted-foreground truncate max-w-20">
              {assigneeName}
            </span>
          ) : isAdmin && !latestConversation?.assigned_to ? (
            <Badge variant="outline" className="h-5 text-[10px]">
              {t('inbox.filters.unassigned').toLowerCase()}
            </Badge>
          ) : null}

          {isAdmin && (
            <Badge
              variant={status === 'open' ? 'default' : 'secondary'}
              className={cn(
                'h-5 text-[10px]',
                status === 'open' && 'bg-success text-success-foreground'
              )}
            >
              {t(`common.${status}`)}
            </Badge>
          )}

          {groupStatuses.length > 0 && (
            <div className="flex items-center gap-1">
              {groupStatuses.slice(0, 3).map((leadStatus) => (
                <div key={leadStatus.id} title={leadStatus.name} className="flex-shrink-0">
                  <StatusIndicator
                    icon={leadStatus.icon}
                    color={getColorHex(leadStatus.color)}
                    colorDotClass="h-3 w-3"
                    iconClass="h-3.5 w-3.5"
                  />
                </div>
              ))}
              {groupStatuses.length > 3 && (
                <span className="text-[9px] text-muted-foreground">
                  +{groupStatuses.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function VirtualRow({ index, style, groups, ...rest }: RowComponentProps<Omit<RowData, 'groups'> & { groups: GroupedConversation[] }>) {
  const data = { groups, ...rest } as RowData;
  return <ConversationRow group={groups[index]} data={data} style={style} />;
}

export function UnifiedConversationList({
  groupedConversations,
  selectedGroupId,
  selectedConversationId,
  onSelectGroup,
  onSelectChannel,
  isAdmin = false,
  profiles = {},
  statusesByContact = {},
  isLoading = false,
}: UnifiedConversationListProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setHeight(el.clientHeight || 600);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (isLoading) {
    return <ConversationListSkeleton count={6} />;
  }

  if (groupedConversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <EmptyState
          variant="plain"
          icon={MessageCircle}
          title={t('inbox.noConversations')}
          description={t('inbox.noConversationsDesc')}
        />
      </div>
    );
  }

  const rowData: RowData = {
    groups: groupedConversations,
    selectedGroupId,
    selectedConversationId,
    onSelectGroup,
    onSelectChannel,
    isAdmin,
    profiles,
    statusesByContact,
    t,
  };

  // Use virtualization only for large lists to preserve smooth UX on small ones
  if (groupedConversations.length > VIRTUALIZE_THRESHOLD) {
    return (
      <div ref={containerRef} className="h-full w-full">
        <List
          rowCount={groupedConversations.length}
          rowHeight={ROW_HEIGHT}
          rowComponent={VirtualRow}
          rowProps={rowData}
          style={{ height, width: '100%' }}
          overscanCount={5}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {groupedConversations.map((group) => (
        <ConversationRow key={group.id} group={group} data={rowData} />
      ))}
    </div>
  );
}
