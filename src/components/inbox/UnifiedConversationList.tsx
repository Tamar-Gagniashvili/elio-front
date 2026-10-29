import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { differenceInCalendarDays, format, isToday, isYesterday } from 'date-fns';
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

const ROW_HEIGHT = 78;
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

/** Messenger-style timestamp: 14:05, Yesterday, Mon, 12 Oct */
function formatListTime(date: Date): string {
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return i18n.t('inbox.yesterday');
  if (differenceInCalendarDays(new Date(), date) < 7) return format(date, 'EEE');
  return format(date, 'd MMM');
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

  const totalUnread = Object.values(group.unreadByChannel).reduce((sum, n) => sum + (n || 0), 0);
  const avatarChannel = primaryContact?.channel_type ?? channelTypes[0];
  const assigneeLabel = isAdmin
    ? assigneeName ?? (!latestConversation?.assigned_to ? t('inbox.filters.unassigned').toLowerCase() : null)
    : null;
  const hasMeta = group.isUnified || groupStatuses.length > 0 || (isAdmin && (assigneeLabel || status !== 'open'));

  return (
    <button
      onClick={() => onSelectGroup(group)}
      style={style}
      className={cn(
        'relative flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/60',
        isSelected && 'bg-primary/[0.07] hover:bg-primary/10'
      )}
    >
      {isSelected && <span className="absolute left-0 inset-y-2 w-[3px] rounded-r-full bg-primary" />}

      {/* Avatar with channel badge, like messaging apps */}
      <div className="relative flex-shrink-0">
        <Avatar src={primaryContact?.avatar_url} name={group.displayName} size="md" />
        {avatarChannel && (
          <ChannelBadge
            channelType={avatarChannel}
            size="xs"
            className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-card"
          />
        )}
        {group.isUnified && (
          <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary ring-2 ring-card flex items-center justify-center">
            <Link2 className="h-2 w-2 text-primary-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn('text-sm truncate text-foreground', totalUnread > 0 ? 'font-semibold' : 'font-medium')}>
            {group.displayName}
          </span>
          <span className={cn('text-[11px] flex-shrink-0 tabular-nums', totalUnread > 0 ? 'text-primary font-medium' : 'text-muted-foreground')}>
            {group.lastMessageAt ? formatListTime(new Date(group.lastMessageAt)) : ''}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn('text-[13px] truncate', totalUnread > 0 ? 'text-foreground' : 'text-muted-foreground')}>
            {latestConversation?.last_message_preview || t('inbox.noMessagesYet')}
          </p>
          {totalUnread > 0 && (
            <span className="h-[18px] min-w-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>

        {hasMeta && (
          <div className="flex items-center gap-1.5 mt-1 h-4 min-w-0 text-[10px] text-muted-foreground">
            {/* Unified contacts: jump straight to one channel's conversation */}
            {group.isUnified &&
              channelTypes.map((channelType) => (
                <span
                  key={channelType}
                  role="button"
                  className="relative flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectChannel?.(group, channelType);
                  }}
                >
                  <ChannelBadge channelType={channelType} size="xs" className="hover:ring-2 hover:ring-primary/40 rounded-full" />
                  {(group.unreadByChannel[channelType] || 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-destructive ring-1 ring-card" />
                  )}
                </span>
              ))}

            {groupStatuses.slice(0, 3).map((leadStatus) => (
              <span
                key={leadStatus.id}
                className="flex items-center gap-1 h-4 px-1.5 rounded-full bg-muted max-w-24 flex-shrink-0"
                title={leadStatus.name}
              >
                <StatusIndicator
                  icon={leadStatus.icon}
                  color={getColorHex(leadStatus.color)}
                  colorDotClass="h-1.5 w-1.5"
                  iconClass="h-2.5 w-2.5"
                />
                <span className="truncate text-foreground/80">{leadStatus.name}</span>
              </span>
            ))}
            {groupStatuses.length > 3 && <span>+{groupStatuses.length - 3}</span>}

            {isAdmin && (
              <span className="ml-auto flex items-center gap-1 min-w-0 flex-shrink">
                {assigneeLabel && <span className="truncate">{assigneeLabel}</span>}
                {status !== 'open' && (
                  <>
                    {assigneeLabel && <span>·</span>}
                    <span className="flex-shrink-0">{t(`common.${status}`)}</span>
                  </>
                )}
              </span>
            )}
          </div>
        )}
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
    <div className="flex flex-col py-1">
      {groupedConversations.map((group) => (
        <ConversationRow key={group.id} group={group} data={rowData} />
      ))}
    </div>
  );
}
