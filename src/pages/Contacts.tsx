import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { addDays, format, formatDistanceToNowStrict, isToday, isTomorrow } from 'date-fns';
import { CalendarClock, Link2, Plus, Search, Upload, Users, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { CHANNEL_CONFIG } from '@/lib/types';
import type { Booking, Contact, Conversation, TenantMembership } from '@/lib/types';
import { CONTACT_UPDATED_EVENT } from '@/lib/contactEvents';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar } from '@/components/Avatar';
import { ChannelBadge } from '@/components/ChannelBadge';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImportLeadsDialog } from '@/components/contacts/ImportLeadsDialog';
import { AddClientDialog } from '@/components/contacts/AddClientDialog';
import { ClientDetailsSheet } from '@/components/contacts/ClientDetailsSheet';
import { StatusPill } from '@/components/contacts/StatusPill';
import type { ClientRow, LeadStatus } from '@/components/contacts/clientTypes';
import { BOOKINGS_CHANGED_EVENT, useDateLocale } from '@/components/bookings/calendarUtils';

type Source = 'all' | 'chats' | 'added';

interface ContactLinkRow {
  contact_id: string;
  link_group_id: string;
  contact_link_group?: { display_name?: string | null };
  contactLinkGroup?: { display_name?: string | null };
}

interface ContactStatusRow {
  contact_id: string;
  status: LeadStatus | null;
}

const PAGE_SIZE = 50;
const BOOKINGS_AHEAD_DAYS = 180;
const MAX_ROW_STATUSES = 2;

export default function Contacts() {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const { currentTenant, currentMembership, user } = useAuth();
  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';
  const [searchParams, setSearchParams] = useSearchParams();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [linkGroups, setLinkGroups] = useState<Map<string, { groupId: string; displayName?: string }>>(new Map());
  const [contactStatuses, setContactStatuses] = useState<Map<string, LeadStatus[]>>(new Map());
  const [availableStatuses, setAvailableStatuses] = useState<LeadStatus[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [memberNames, setMemberNames] = useState<Map<string, { name: string; avatar?: string }>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [source, setSource] = useState<Source>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(() => searchParams.get('status'));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      const now = new Date();
      const params = new URLSearchParams({ from: now.toISOString(), to: addDays(now, BOOKINGS_AHEAD_DAYS).toISOString() });
      setBookings((await api.get<Booking[]>(`/bookings?${params.toString()}`)) || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!currentTenant || !user) return;
    const tenantQs = `tenant_id=${currentTenant.id}`;

    // Sales users only see the clients whose chats are assigned to them
    let convs: Conversation[] = [];
    try {
      convs = (await api.get<Conversation[]>(
        `/conversations?${tenantQs}${isAdmin ? '' : `&assigned_to=${user.id}`}`,
      )) || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
    setConversations(convs);

    const allowedIds = isAdmin ? null : [...new Set(convs.map((c) => c.contact_id))];
    if (allowedIds && allowedIds.length === 0) {
      setContacts([]);
      setIsLoading(false);
      return;
    }

    const contactsQs = `${tenantQs}&sort_by=created_at&sort_direction=desc` +
      (allowedIds ? '&' + allowedIds.map((id) => `id[]=${id}`).join('&') : '');

    const [contactsRes, linksRes, statusesRes, contactStatusesRes, membersRes] = await Promise.allSettled([
      api.get<Contact[]>(`/contacts?${contactsQs}`),
      api.get<ContactLinkRow[]>(`/contact-links?${tenantQs}`),
      api.get<LeadStatus[]>(`/lead-statuses?${tenantQs}&sort_by=created_at&sort_direction=asc`),
      api.get<ContactStatusRow[]>(`/contact-statuses?${tenantQs}`),
      api.get<TenantMembership[]>(`/tenant-memberships?is_active=1`),
    ]);

    if (contactsRes.status === 'fulfilled') setContacts(contactsRes.value || []);

    const groupMap = new Map<string, { groupId: string; displayName?: string }>();
    if (linksRes.status === 'fulfilled') {
      for (const link of linksRes.value || []) {
        const group = link.contact_link_group || link.contactLinkGroup;
        groupMap.set(link.contact_id, { groupId: link.link_group_id, displayName: group?.display_name || undefined });
      }
    }
    setLinkGroups(groupMap);

    setAvailableStatuses(statusesRes.status === 'fulfilled' ? statusesRes.value || [] : []);

    const statusMap = new Map<string, LeadStatus[]>();
    if (contactStatusesRes.status === 'fulfilled') {
      for (const cs of contactStatusesRes.value || []) {
        if (!cs.status) continue;
        statusMap.set(cs.contact_id, [...(statusMap.get(cs.contact_id) || []), cs.status]);
      }
    }
    setContactStatuses(statusMap);

    const names = new Map<string, { name: string; avatar?: string }>();
    if (membersRes.status === 'fulfilled') {
      for (const m of membersRes.value || []) {
        if (m.profile) names.set(m.user_id, { name: m.profile.full_name || m.profile.email, avatar: m.profile.avatar_url });
      }
    }
    setMemberNames(names);

    setIsLoading(false);
  }, [currentTenant, user, isAdmin]);

  useEffect(() => {
    fetchData();
    fetchBookings();
  }, [fetchData, fetchBookings]);

  // Keep the list in step with edits made in the details panel or elsewhere
  useEffect(() => {
    const onContactUpdated = (e: Event) => {
      const updated = (e as CustomEvent<Contact>).detail;
      setContacts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    };
    window.addEventListener(CONTACT_UPDATED_EVENT, onContactUpdated);
    window.addEventListener(BOOKINGS_CHANGED_EVENT, fetchBookings);
    return () => {
      window.removeEventListener(CONTACT_UPDATED_EVENT, onContactUpdated);
      window.removeEventListener(BOOKINGS_CHANGED_EVENT, fetchBookings);
    };
  }, [fetchBookings]);

  const clients = useMemo<ClientRow[]>(() => {
    const latestConversation = new Map<string, Conversation>();
    for (const conv of conversations) {
      const current = latestConversation.get(conv.contact_id);
      if (!current || (conv.last_message_at || '') > (current.last_message_at || '')) {
        latestConversation.set(conv.contact_id, conv);
      }
    }

    const nextBooking = new Map<string, Booking>();
    for (const booking of bookings) {
      if (!booking.contact_id || booking.status === 'cancelled') continue;
      const current = nextBooking.get(booking.contact_id);
      if (!current || booking.starts_at < current.starts_at) nextBooking.set(booking.contact_id, booking);
    }

    const groups = new Map<string, Contact[]>();
    for (const contact of contacts) {
      const key = linkGroups.get(contact.id)?.groupId || contact.id;
      groups.set(key, [...(groups.get(key) || []), contact]);
    }

    const activityOf = (c: Contact) => latestConversation.get(c.id)?.last_message_at || c.updated_at;

    return [...groups.entries()]
      .map(([id, members]) => {
        const sorted = [...members].sort((a, b) => activityOf(b).localeCompare(activityOf(a)));
        const primary = sorted[0];
        const conv = sorted.map((c) => latestConversation.get(c.id)).find(Boolean) || null;
        const statuses = new Map<string, LeadStatus>();
        members.forEach((c) => (contactStatuses.get(c.id) || []).forEach((s) => statuses.set(s.id, s)));
        const next = members
          .map((c) => nextBooking.get(c.id))
          .filter((b): b is Booking => !!b)
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0] || null;

        return {
          id,
          isLinked: members.length > 1,
          displayName: linkGroups.get(primary.id)?.displayName || primary.name || t('contacts.unknown'),
          contacts: sorted,
          primary,
          lastActivity: activityOf(primary),
          statuses: [...statuses.values()],
          isOffline: members.every((c) => c.channel_type === 'offline'),
          conversationId: conv?.id || null,
          assignedTo: conv?.assigned_to || null,
          nextBooking: next,
        };
      })
      .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  }, [contacts, linkGroups, contactStatuses, conversations, bookings, t]);

  const sourceCounts = useMemo(() => ({
    all: clients.length,
    chats: clients.filter((c) => !c.isOffline).length,
    added: clients.filter((c) => c.isOffline).length,
  }), [clients]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return clients.filter((client) => {
      if (source === 'chats' && client.isOffline) return false;
      if (source === 'added' && !client.isOffline) return false;
      if (statusFilter && !client.statuses.some((s) => s.id === statusFilter)) return false;
      if (!query) return true;
      if (client.displayName.toLowerCase().includes(query)) return true;
      if (client.statuses.some((s) => s.name.toLowerCase().includes(query))) return true;
      return client.contacts.some((c) =>
        [c.name, c.email, c.phone].some((v) => v?.toLowerCase().includes(query)),
      );
    });
  }, [clients, source, statusFilter, searchQuery]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [source, statusFilter, searchQuery]);

  const selectedClient = clients.find((c) => c.id === selectedId) || null;

  const changeStatusFilter = (value: string | null) => {
    setStatusFilter(value);
    setSearchParams(value ? { status: value } : {});
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSource('all');
    changeStatusFilter(null);
  };

  const formatSession = (booking: Booking) => {
    const start = new Date(booking.starts_at);
    const time = format(start, 'HH:mm');
    if (isToday(start)) return `${t('contacts.today')}, ${time}`;
    if (isTomorrow(start)) return `${t('contacts.tomorrow')}, ${time}`;
    return format(start, 'EEE d MMM, HH:mm', { locale });
  };

  const formatActivity = (date: string) => formatDistanceToNowStrict(new Date(date), { addSuffix: true, locale });

  const contactLine = (client: ClientRow) => {
    const phone = client.contacts.find((c) => c.phone)?.phone;
    const email = client.contacts.find((c) => c.email)?.email;
    return { phone, email };
  };

  const channelsOf = (client: ClientRow) => [...new Set(client.contacts.map((c) => c.channel_type))];

  const renderAvatar = (client: ClientRow, size: 'md' | 'sm' = 'md') => {
    const channels = channelsOf(client);
    return (
      <div className="relative flex-shrink-0">
        <Avatar src={client.primary.avatar_url} name={client.displayName} size={size} />
        {client.isLinked ? (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-2 ring-card">
            <Link2 className="h-2.5 w-2.5 text-primary-foreground" />
          </span>
        ) : channels[0] && channels[0] !== 'offline' ? (
          <ChannelBadge channelType={channels[0]} size="xs" className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-card" />
        ) : null}
      </div>
    );
  };

  const renderStatuses = (client: ClientRow) => {
    if (client.statuses.length === 0) return <span className="text-muted-foreground/60">—</span>;
    const extra = client.statuses.length - MAX_ROW_STATUSES;
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {client.statuses.slice(0, MAX_ROW_STATUSES).map((s) => <StatusPill key={s.id} status={s} />)}
        {extra > 0 && <span className="text-xs text-muted-foreground">+{extra}</span>}
      </div>
    );
  };

  const sourceTabs: { value: Source; label: string }[] = [
    { value: 'all', label: t('contacts.sourceAll') },
    { value: 'chats', label: t('contacts.sourceChats') },
    { value: 'added', label: t('contacts.sourceAdded') },
  ];

  const visible = filtered.slice(0, visibleCount);
  const hasFilters = !!searchQuery || source !== 'all' || !!statusFilter;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{t('contacts.clients')}</h1>
              {!isLoading && (
                <span className="rounded-full border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {clients.length}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAdmin ? t('contacts.clientsSubtitle') : t('contacts.clientsSubtitleSales')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">{t('contacts.importLeads')}</span>
              </Button>
            )}
            <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('contacts.addClient')}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5 overflow-x-auto self-start">
              {sourceTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setSource(tab.value)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors',
                    source === tab.value
                      ? 'bg-card text-foreground shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                  <span className="text-xs text-muted-foreground">{sourceCounts[tab.value]}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 lg:w-72 lg:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('contacts.searchContactsOrStatuses')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 pr-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    aria-label={t('common.clearFilter')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {availableStatuses.length > 0 && (
                <Select value={statusFilter || 'all'} onValueChange={(v) => changeStatusFilter(v === 'all' ? null : v)}>
                  <SelectTrigger className="h-9 w-[150px] sm:w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('contacts.allStatuses')}</SelectItem>
                    {availableStatuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <StatusPill status={s} className="border-0 bg-transparent px-0" />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="py-6">
              <EmptyState
                icon={Users}
                title={t('contacts.noClientsYet')}
                description={t('contacts.noClientsYetDesc')}
                action={{ label: t('contacts.addClient'), onClick: () => setAddOpen(true), icon: Plus }}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-6">
              <EmptyState
                icon={Search}
                title={t('contacts.noResults')}
                description={t('contacts.noMatchesDesc')}
                action={hasFilters ? { label: t('contacts.clearFilters'), onClick: clearFilters } : undefined}
              />
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">{t('contacts.colClient')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('contacts.colContact')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('contacts.colStatus')}</th>
                    <th className="px-4 py-2.5 font-medium">{t('contacts.colNextSession')}</th>
                    <th className="hidden lg:table-cell px-4 py-2.5 font-medium">{t('contacts.colAssigned')}</th>
                    <th className="px-4 py-2.5 font-medium text-right">{t('contacts.colLastActivity')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {visible.map((client) => {
                    const { phone, email } = contactLine(client);
                    const assignee = client.assignedTo ? memberNames.get(client.assignedTo) : null;
                    return (
                      <tr
                        key={client.id}
                        onClick={() => setSelectedId(client.id)}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-muted/40',
                          selectedId === client.id && 'bg-muted/50',
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {renderAvatar(client)}
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[220px]">{client.displayName}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {client.isOffline
                                  ? t('contacts.addedManually')
                                  : channelsOf(client).filter((c) => c !== 'offline').map((c) => CHANNEL_CONFIG[c]?.label || c).join(' · ')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {phone || email ? (
                            <div className="min-w-0 max-w-[220px]">
                              {phone && <p className="truncate tabular-nums">{phone}</p>}
                              {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{renderStatuses(client)}</td>
                        <td className="px-4 py-3">
                          {client.nextBooking ? (
                            <div className="min-w-0">
                              <p className="whitespace-nowrap">{formatSession(client.nextBooking)}</p>
                              {client.nextBooking.staff_profile?.full_name && (
                                <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                                  {client.nextBooking.staff_profile.full_name}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3">
                          {assignee ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar src={assignee.avatar} name={assignee.name} size="sm" />
                              <span className="truncate max-w-[130px]">{assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                          {formatActivity(client.lastActivity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile list */}
              <ul className="md:hidden divide-y">
                {visible.map((client) => {
                  const { phone, email } = contactLine(client);
                  return (
                    <li key={client.id}>
                      <button
                        onClick={() => setSelectedId(client.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-muted/50"
                      >
                        {renderAvatar(client)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-medium truncate">{client.displayName}</p>
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                              {formatActivity(client.lastActivity)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {phone || email || t('contacts.noContactInfoShort')}
                          </p>
                          {(client.nextBooking || client.statuses.length > 0) && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              {client.nextBooking && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                  <CalendarClock className="h-3 w-3" />
                                  {formatSession(client.nextBooking)}
                                </span>
                              )}
                              {client.statuses.slice(0, MAX_ROW_STATUSES).map((s) => <StatusPill key={s.id} status={s} />)}
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {filtered.length > visibleCount && (
                <div className="border-t p-3 text-center">
                  <Button variant="ghost" size="sm" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
                    {t('contacts.showMore')} · {filtered.length - visibleCount}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ClientDetailsSheet
        client={selectedClient}
        assigneeName={selectedClient?.assignedTo ? memberNames.get(selectedClient.assignedTo)?.name : null}
        canReassign={isAdmin || (!!selectedClient && selectedClient.assignedTo === user?.id)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onChanged={() => {
          fetchData();
          fetchBookings();
        }}
      />

      <AddClientDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(contact) => {
          setContacts((prev) => [contact, ...prev]);
          setSelectedId(contact.id);
        }}
      />

      <ImportLeadsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => {
          fetchData();
          setSource('added');
        }}
      />
    </AppLayout>
  );
}
