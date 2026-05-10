import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Contact, ChannelType } from '@/lib/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar } from '@/components/Avatar';
import { ChannelBadge } from '@/components/ChannelBadge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, Link2, Tag, X, Upload, Globe, FileSpreadsheet, UserPlus, MessageSquare } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ConversationListSkeleton } from '@/components/skeletons/ListSkeletons';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { getStatusColorClasses } from '@/pages/Statuses';
import { ImportLeadsDialog } from '@/components/contacts/ImportLeadsDialog';
import { OfflineLeadsWorkspace } from '@/components/contacts/OfflineLeadsWorkspace';
import { ReassignDialog } from '@/components/inbox/ReassignDialog';

interface LeadStatus {
  id: string;
  name: string;
  color: string;
}

interface GroupedContact {
  id: string;
  isLinked: boolean;
  displayName: string;
  contacts: Contact[];
  lastActivity: string;
  statuses: LeadStatus[];
}

export default function Contacts() {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [linkGroups, setLinkGroups] = useState<Map<string, { groupId: string; displayName?: string }>>(new Map());
  const [contactStatuses, setContactStatuses] = useState<Map<string, LeadStatus[]>>(new Map());
  const [availableStatuses, setAvailableStatuses] = useState<LeadStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'online' | 'imported'>('online');
  const [offlineCount, setOfflineCount] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedContactForReassign, setSelectedContactForReassign] = useState<string | null>(null);
  
  const { currentTenant, currentMembership, user } = useAuth();
  
  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';

  // Read status filter from URL on mount
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setSelectedStatusFilter(statusParam);
    }
  }, []);

  const fetchData = async () => {
    if (!currentTenant || !user) return;
    
    // For sales users, first get their assigned contact IDs
    let allowedContactIds: string[] | null = null;
    
    if (!isAdmin) {
      try {
        const assignedConversations = await api.get<any[]>(`/conversations?tenant_id=${currentTenant.id}&assigned_to=${user.id}`);
        allowedContactIds = assignedConversations?.map(c => c.contact_id) || [];
      } catch (error) {
        console.error('Error fetching assigned conversations:', error);
        allowedContactIds = [];
      }
      
      // If sales user has no assigned contacts, set empty and return early
      if (allowedContactIds.length === 0) {
        setContacts([]);
        setLinkGroups(new Map());
        setContactStatuses(new Map());
        setIsLoading(false);
        return;
      }
    }

    // Fetch ALL contacts first to count offline ones
    try {
      let qs = `tenant_id=${currentTenant.id}&sort_by=created_at&sort_direction=desc`;
      if (allowedContactIds !== null && allowedContactIds.length > 0) {
        qs += '&' + allowedContactIds.map(id => `id[]=${id}`).join('&');
      }
      
      const contactsData = await api.get<Contact[]>(`/contacts?${qs}`);
      const allContacts = contactsData || [];
      // Count offline contacts
      const offlineContacts = allContacts.filter(c => c.channel_type === 'offline');
      setOfflineCount(offlineContacts.length);
      // Only show online contacts in this tab
      const onlineContacts = allContacts.filter(c => c.channel_type !== 'offline');
      setContacts(onlineContacts);
    } catch (error) {
      console.error('Error fetching contacts data:', error);
    }

    // Fetch link groups
    try {
      const links = await api.get<any[]>(`/contact-links?tenant_id=${currentTenant.id}`);
      const groupMap = new Map<string, { groupId: string; displayName?: string }>();
      
      if (links) {
        for (const link of links) {
          const group = link.contact_link_group || link.contactLinkGroup;
          groupMap.set(link.contact_id, {
            groupId: link.link_group_id,
            displayName: group?.display_name || undefined,
          });
        }
      }
      
      setLinkGroups(groupMap);
    } catch (e) {
      console.error('Error fetching contact links:', e);
      setLinkGroups(new Map());
    }

    try {
      const statusesData = await api.get<any[]>(`/lead-statuses?tenant_id=${currentTenant.id}&sort_by=created_at&sort_direction=asc`);
      setAvailableStatuses(statusesData as LeadStatus[] || []);
    } catch (e) {
      console.error('Error fetching available statuses', e);
      setAvailableStatuses([]);
    }

    // Fetch contact statuses
    try {
      const contactStatusData = await api.get<any[]>(`/contact-statuses?tenant_id=${currentTenant.id}`);
      const statusMap = new Map<string, LeadStatus[]>();
      
      if (contactStatusData) {
        for (const cs of contactStatusData) {
          const status = cs.status as LeadStatus | null;
          if (status) {
            const existing = statusMap.get(cs.contact_id) || [];
            existing.push(status);
            statusMap.set(cs.contact_id, existing);
          }
        }
      }
      setContactStatuses(statusMap);
    } catch (error) {
      console.error('Error fetching contacts data:', error);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (!currentTenant || !user) return;
    fetchData();
  }, [currentTenant, user, isAdmin]);

  const groupedContacts = useMemo(() => {
    const groups = new Map<string, GroupedContact>();
    const standalone: GroupedContact[] = [];

    for (const contact of contacts) {
      const linkInfo = linkGroups.get(contact.id);
      const statuses = contactStatuses.get(contact.id) || [];

      if (linkInfo) {
        const existing = groups.get(linkInfo.groupId);
        
        if (existing) {
          existing.contacts.push(contact);
          // Merge statuses from all linked contacts
          statuses.forEach(s => {
            if (!existing.statuses.some(es => es.id === s.id)) {
              existing.statuses.push(s);
            }
          });
          if (new Date(contact.updated_at) > new Date(existing.lastActivity)) {
            existing.lastActivity = contact.updated_at;
          }
        } else {
          groups.set(linkInfo.groupId, {
            id: linkInfo.groupId,
            isLinked: true,
            displayName: linkInfo.displayName || contact.name || 'Unknown',
            contacts: [contact],
            lastActivity: contact.updated_at,
            statuses: [...statuses],
          });
        }
      } else {
        standalone.push({
          id: contact.id,
          isLinked: false,
          displayName: contact.name || 'Unknown',
          contacts: [contact],
          lastActivity: contact.updated_at,
          statuses,
        });
      }
    }

    const allGroups = [...groups.values(), ...standalone];
    allGroups.sort((a, b) => {
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

    return allGroups;
  }, [contacts, linkGroups, contactStatuses]);

  const filteredGroups = groupedContacts.filter((group) => {
    // Filter by status first
    if (selectedStatusFilter) {
      const hasStatus = group.statuses.some(s => s.id === selectedStatusFilter);
      if (!hasStatus) return false;
    }
    
    // Then filter by search query
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (group.displayName.toLowerCase().includes(query)) return true;
    
    // Search in status names too
    if (group.statuses.some(s => s.name.toLowerCase().includes(query))) return true;
    
    return group.contacts.some((contact) => {
      const name = contact.name?.toLowerCase() || '';
      const email = contact.email?.toLowerCase() || '';
      const phone = contact.phone?.toLowerCase() || '';
      return name.includes(query) || email.includes(query) || phone.includes(query);
    });
  });

  const getChannelTypes = (group: GroupedContact): ChannelType[] => {
    const types = new Set<ChannelType>();
    group.contacts.forEach(c => types.add(c.channel_type));
    return Array.from(types);
  };

  const getCombinedInfo = (group: GroupedContact) => {
    const emails = new Set<string>();
    const phones = new Set<string>();
    
    group.contacts.forEach(c => {
      if (c.email) emails.add(c.email);
      if (c.phone) phones.add(c.phone);
    });
    
    return {
      emails: Array.from(emails),
      phones: Array.from(phones),
    };
  };

  const renderStatusBadges = (statuses: LeadStatus[]) => {
    if (statuses.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {statuses.map((status) => {
          const colorClasses = getStatusColorClasses(status.color);
          return (
            <Badge
              key={status.id}
              className={cn(
                colorClasses.bg,
                colorClasses.text,
                'border',
                colorClasses.border,
                'text-[10px] py-0 px-1.5'
              )}
            >
              {status.name}
            </Badge>
          );
        })}
      </div>
    );
  };

  const renderContactRow = (contact: Contact) => {
    const statuses = contactStatuses.get(contact.id) || [];
    
    return (
      <div key={contact.id} className="flex items-center gap-3 py-3 px-4 bg-muted/30 rounded-lg">
        <Avatar
          src={contact.avatar_url}
          name={contact.name}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{contact.name || 'Unknown'}</span>
            <ChannelBadge channelType={contact.channel_type} size="sm" />
          </div>
          <div className="text-sm text-muted-foreground">
          {contact.email || contact.phone || contact.external_id || t('contacts.noContactInfo')}
        </div>
        {renderStatusBadges(statuses)}
      </div>
        <div className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true })}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 max-w-4xl mx-auto">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold">{t('contacts.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin ? t('contacts.subtitle') : t('contacts.subtitleSales')}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setImportDialogOpen(true)} variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">{t('contacts.importLeads')}</span>
              <span className="sm:hidden">{t('contacts.importLeads')}</span>
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'online' | 'imported')} className="w-full">
          <TabsList className="mb-6 max-w-4xl mx-auto">
            <TabsTrigger value="online" className="gap-2">
              <Globe className="h-4 w-4" />
              {t('contacts.onlineContacts')}
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {contacts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="imported" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {t('contacts.importedLeads')}
              {offlineCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {offlineCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="max-w-4xl mx-auto">
            <div className="mb-6 space-y-3">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('contacts.searchContactsOrStatuses')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Status Filter */}
              {availableStatuses.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t('common.filterByStatus')}:</span>
                  {availableStatuses.map((status) => {
                    const colorClasses = getStatusColorClasses(status.color);
                    const isSelected = selectedStatusFilter === status.id;
                    
                    return (
                      <button
                        key={status.id}
                        onClick={() => {
                          const newValue = isSelected ? null : status.id;
                          setSelectedStatusFilter(newValue);
                          if (newValue) {
                            setSearchParams({ status: newValue });
                          } else {
                            setSearchParams({});
                          }
                        }}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all border',
                          colorClasses.bg,
                          colorClasses.text,
                          colorClasses.border,
                          isSelected && 'ring-2 ring-primary ring-offset-1'
                        )}
                      >
                        {status.name}
                        {isSelected && <X className="h-3 w-3" />}
                      </button>
                    );
                  })}
                  {selectedStatusFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStatusFilter(null);
                        setSearchParams({});
                      }}
                      className="text-xs h-6"
                    >
                      {t('common.clearFilter')}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="border rounded-lg overflow-hidden">
                <ConversationListSkeleton count={6} />
              </div>
            ) : groupedContacts.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t('contacts.noOnlineContacts')}
                description={t('contacts.noOnlineContactsDesc')}
                action={isAdmin ? {
                  label: t('contacts.importLeads'),
                  onClick: () => setImportDialogOpen(true),
                  icon: Upload,
                } : undefined}
                secondaryAction={{
                  label: t('inbox.title') || 'Open Inbox',
                  onClick: () => window.location.assign('/inbox'),
                  icon: MessageSquare,
                }}
              />
            ) : filteredGroups.length === 0 ? (
              <EmptyState
                icon={Search}
                title={t('common.noResults') || 'No matches'}
                description={t('contacts.noMatchesDesc') || 'Try adjusting your search or filters.'}
                action={{
                  label: t('common.clearFilter') || 'Clear filters',
                  onClick: () => {
                    setSearchQuery('');
                    setSelectedStatusFilter(null);
                    setSearchParams({});
                  },
                }}
              />
            ) : (
              <div className="space-y-2">
                {filteredGroups.map((group) => {
                  const channelTypes = getChannelTypes(group);
                  const info = getCombinedInfo(group);
                  const primaryContact = group.contacts[0];

                  if (group.isLinked) {
                    return (
                      <Accordion key={group.id} type="single" collapsible>
                        <AccordionItem value={group.id} className="border rounded-lg bg-card">
                          <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-muted/50 rounded-lg [&[data-state=open]]:rounded-b-none">
                            <div className="flex items-center gap-4 flex-1 text-left">
                              <div className="relative flex-shrink-0">
                                <Avatar
                                  src={primaryContact.avatar_url}
                                  name={group.displayName}
                                  size="lg"
                                />
                                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                  <Link2 className="h-3 w-3 text-primary-foreground" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold truncate">
                                    {group.displayName}
                                  </h3>
                                  <span className="text-xs text-muted-foreground">
                                    ({group.contacts.length} {t('contacts.linked')})
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1 mb-2">
                                  {channelTypes.map((channelType) => (
                                    <ChannelBadge 
                                      key={channelType} 
                                      channelType={channelType} 
                                      size="sm" 
                                    />
                                  ))}
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                  {info.emails.slice(0, 2).map((email) => (
                                    <span key={email}>{email}</span>
                                  ))}
                                  {info.emails.length > 2 && (
                                    <span>+{info.emails.length - 2} {t('common.more')}</span>
                                  )}
                                </div>
                                {renderStatusBadges(group.statuses)}
                            </div>
                              <div className="hidden sm:flex items-center gap-3 mr-2 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedContactForReassign(primaryContact.id);
                                    setReassignDialogOpen(true);
                                  }}
                                  className="gap-1.5"
                                >
                                  <UserPlus className="h-3.5 w-3.5" />
                                  <span className="hidden md:inline">{t('contacts.reassign')}</span>
                                </Button>
                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDistanceToNow(new Date(group.lastActivity), { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-2 pt-2 border-t">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium py-2">
                                {t('contacts.linkedContacts')}
                              </p>
                              {group.contacts.map(renderContactRow)}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    );
                  }

                  return (
                    <Card key={group.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="py-3 sm:py-4">
                        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                          <Avatar
                            src={primaryContact.avatar_url}
                            name={group.displayName}
                            size="lg"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">
                                {group.displayName}
                              </h3>
                            </div>
                            
                            <div className="flex items-center gap-1 mb-2 flex-wrap">
                              {channelTypes.map((channelType) => (
                                <ChannelBadge 
                                  key={channelType} 
                                  channelType={channelType} 
                                  size="sm" 
                                />
                              ))}
                            </div>
                            
                            <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                              {info.emails.map((email) => (
                                <span key={email} className="truncate max-w-full">{email}</span>
                              ))}
                              {info.phones.map((phone) => (
                                <span key={phone}>{phone}</span>
                              ))}
                            </div>
                            {renderStatusBadges(group.statuses)}
                            <div className="text-[11px] text-muted-foreground mt-2 sm:hidden">
                              {formatDistanceToNow(new Date(group.lastActivity), { addSuffix: true })}
                            </div>
                          </div>
                          <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedContactForReassign(primaryContact.id);
                                setReassignDialogOpen(true);
                              }}
                              className="gap-1.5"
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              <span className="hidden md:inline">{t('contacts.reassign')}</span>
                            </Button>
                            <div className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(group.lastActivity), { addSuffix: true })}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContactForReassign(primaryContact.id);
                              setReassignDialogOpen(true);
                            }}
                            className="sm:hidden flex-shrink-0 h-9 w-9"
                            aria-label={t('contacts.reassign')}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="imported" className="max-w-6xl mx-auto">
            <OfflineLeadsWorkspace onRefresh={fetchData} />
          </TabsContent>
        </Tabs>
      </div>
      
      <ImportLeadsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={() => {
          fetchData();
          setActiveTab('imported');
        }}
      />
      
      <ReassignDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        contactId={selectedContactForReassign || undefined}
        onReassigned={() => {
          setSelectedContactForReassign(null);
          fetchData();
        }}
      />
    </AppLayout>
  );
}
