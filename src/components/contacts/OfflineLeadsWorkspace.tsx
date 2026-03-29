import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Contact } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { ChannelBadge } from '@/components/ChannelBadge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Users, 
  Tag, 
  X, 
  StickyNote, 
  Mail,
  Phone,
  Building2,
  Calendar,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { getStatusColorClasses } from '@/pages/Statuses';
import { ManageStatusDialog } from '@/components/inbox/ManageStatusDialog';
import { ContactNotes } from '@/components/inbox/ContactNotes';
import { ReassignDialog } from '@/components/inbox/ReassignDialog';

interface LeadStatus {
  id: string;
  name: string;
  color: string;
}

interface OfflineLeadsWorkspaceProps {
  onRefresh?: () => void;
}

export function OfflineLeadsWorkspace({ onRefresh }: OfflineLeadsWorkspaceProps) {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactStatuses, setContactStatuses] = useState<Map<string, LeadStatus[]>>(new Map());
  const [availableStatuses, setAvailableStatuses] = useState<LeadStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<Map<string, { name: string; id: string }>>(new Map());
  const [assignmentReasons, setAssignmentReasons] = useState<Map<string, { reason: string; reassignedBy: string | null }>>(new Map());
  const [reassignerProfiles, setReassignerProfiles] = useState<Map<string, string>>(new Map());
  
  const { currentTenant, currentMembership, user } = useAuth();
  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';
  
  const currentAssignee = selectedContact ? assignedUsers.get(selectedContact.id)?.id : null;
  const canReassign = isAdmin || (selectedContact && currentAssignee === user?.id);

  const fetchData = async () => {
    if (!currentTenant || !user) return;
    
    setIsLoading(true);
    
    let allowedContactIds: string[] | null = null;
    
    try {
      if (!isAdmin) {
        const assignedConversations = await api.get<any[]>(`/conversations?assigned_to=${user.id}`);
        allowedContactIds = assignedConversations?.map(c => c.contact_id) || [];
        
        if (allowedContactIds.length === 0) {
          setContacts([]);
          setIsLoading(false);
          return;
        }
      }

      let contactsData = await api.get<Contact[]>(`/contacts`);
      contactsData = contactsData.filter(c => c.channel_type === 'offline');
      contactsData.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      if (allowedContactIds !== null) {
        contactsData = contactsData.filter(c => allowedContactIds!.includes(c.id));
      }

      setContacts(contactsData);
      
      if (contactsData.length > 0 && !selectedContact) {
        setSelectedContact(contactsData[0]);
      }

      const conversations = await api.get<any[]>(`/conversations`);

      if (conversations) {
        const assignedToIds = [...new Set(conversations.map(c => c.assigned_to).filter(Boolean))];
        const reassignedByIds = [...new Set(conversations.map(c => c.reassigned_by).filter(Boolean))];
        const allUserIds = [...new Set([...assignedToIds, ...reassignedByIds])];
        
        if (allUserIds.length > 0) {
          const profiles = await api.get<any[]>(`/profiles`);

          const assignmentMap = new Map<string, { name: string; id: string }>();
          const reasonsMap = new Map<string, { reason: string; reassignedBy: string | null }>();
          const reassignerMap = new Map<string, string>();
          
          profiles?.forEach(p => {
            if (allUserIds.includes(p.user_id)) {
              reassignerMap.set(p.user_id, p.full_name || p.email || 'Unknown');
            }
          });
          
          conversations.forEach(conv => {
            if (conv.assigned_to) {
              const profile = profiles?.find(p => p.user_id === conv.assigned_to);
              assignmentMap.set(conv.contact_id, {
                id: conv.assigned_to,
                name: profile?.full_name || profile?.email || 'Unknown'
              });
            }
            if (conv.assignment_reason) {
              reasonsMap.set(conv.contact_id, {
                reason: conv.assignment_reason,
                reassignedBy: conv.reassigned_by
              });
            }
          });
          
          setAssignedUsers(assignmentMap);
          setAssignmentReasons(reasonsMap);
          setReassignerProfiles(reassignerMap);
        }
      }

      const statusesData = await api.get<LeadStatus[]>(`/lead-statuses`);
      setAvailableStatuses(statusesData);

      const contactStatusData = await api.get<any[]>(`/contact-statuses`);
      const statusMap = new Map<string, LeadStatus[]>();
      
      for (const cs of contactStatusData) {
        const status = statusesData.find(s => s.id === cs.status_id);
        if (status) {
          const existing = statusMap.get(cs.contact_id) || [];
          existing.push(status);
          statusMap.set(cs.contact_id, existing);
        }
      }
      
      setContactStatuses(statusMap);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentTenant, user, isAdmin]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      if (selectedStatusFilter) {
        const statuses = contactStatuses.get(contact.id) || [];
        if (!statuses.some(s => s.id === selectedStatusFilter)) return false;
      }
      
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      
      const name = contact.name?.toLowerCase() || '';
      const email = contact.email?.toLowerCase() || '';
      const phone = contact.phone?.toLowerCase() || '';
      
      return name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [contacts, searchQuery, selectedStatusFilter, contactStatuses]);

  const getMetadata = (contact: Contact) => {
    const metadata = contact.metadata as Record<string, unknown> | null;
    const originalRow = metadata?.original_row as Record<string, unknown> | undefined;
    return {
      company: originalRow?.Company as string | undefined,
      importedAt: metadata?.imported_at as string | undefined,
      importSource: metadata?.import_source as string | undefined,
    };
  };

  const renderStatusBadges = (contactId: string) => {
    const statuses = contactStatuses.get(contactId) || [];
    if (statuses.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1">
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

  const selectedStatuses = selectedContact ? contactStatuses.get(selectedContact.id) || [] : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">{t('contacts.noImportedLeads')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('contacts.noImportedLeadsDesc')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-[calc(100vh-180px)] gap-4">
      {/* Lead List Panel */}
      <div className="w-80 flex-shrink-0 flex flex-col border rounded-lg bg-card">
        <div className="p-3 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('contacts.searchLeads')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          
          {availableStatuses.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {availableStatuses.slice(0, 4).map((status) => {
                const colorClasses = getStatusColorClasses(status.color);
                const isSelected = selectedStatusFilter === status.id;
                
                return (
                  <button
                    key={status.id}
                    onClick={() => setSelectedStatusFilter(isSelected ? null : status.id)}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all',
                      colorClasses.bg,
                      colorClasses.text,
                      colorClasses.border,
                      isSelected && 'ring-2 ring-primary ring-offset-1'
                    )}
                  >
                    {status.name}
                  </button>
                );
              })}
              {selectedStatusFilter && (
                <button
                  onClick={() => setSelectedStatusFilter(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredContacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;
              const assignment = assignedUsers.get(contact.id);
              
              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={cn(
                    'p-3 rounded-lg cursor-pointer transition-colors',
                    isSelected 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      src={contact.avatar_url}
                      name={contact.name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {contact.name || t('common.unknown')}
                        </span>
                        <ChannelBadge channelType={contact.channel_type} size="sm" />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.email || contact.phone || t('contacts.noContactInfoShort')}
                      </p>
                      {isAdmin && assignment && (
                        <p className="text-xs text-primary truncate mt-0.5">
                          → {assignment.name}
                        </p>
                      )}
                      <div className="mt-1">
                        {renderStatusBadges(contact.id)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        <div className="p-2 border-t text-xs text-muted-foreground text-center">
          {t('contacts.leadsCount', { filtered: filteredContacts.length, total: contacts.length })}
        </div>
      </div>

      {/* Lead Detail Panel */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col border rounded-lg bg-card overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-start gap-4">
              <Avatar
                src={selectedContact.avatar_url}
                name={selectedContact.name}
                size="xl"
              />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold truncate">
                  {selectedContact.name || t('common.unknown')}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <ChannelBadge channelType={selectedContact.channel_type} size="sm" />
                  {isAdmin && assignedUsers.get(selectedContact.id) && (
                    <Badge variant="outline" className="text-xs">
                      {t('contacts.assignedTo', { name: assignedUsers.get(selectedContact.id)?.name })}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {renderStatusBadges(selectedContact.id)}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatusDialogOpen(true)}
                    className="h-5 px-1.5 text-xs"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {t('contacts.manage')}
                  </Button>
                  {canReassign && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReassignDialogOpen(true)}
                      className="h-5 px-1.5 text-xs"
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      {t('contacts.reassign')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reassignment Reason Banner */}
          {selectedContact && assignmentReasons.get(selectedContact.id) && (
            <Alert className="mx-4 mt-4 border-primary/50 bg-primary/10">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <span className="font-medium">
                  {reassignerProfiles.get(assignmentReasons.get(selectedContact.id)?.reassignedBy || '') || t('common.unknown')}
                </span>
                {': '}
                {assignmentReasons.get(selectedContact.id)?.reason}
              </AlertDescription>
            </Alert>
          )}

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {/* Contact Info */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium">{t('contacts.contactInformation')}</CardTitle>
                </CardHeader>
                <CardContent className="py-3 px-4 space-y-3">
                  {selectedContact.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${selectedContact.email}`} className="text-primary hover:underline">
                        {selectedContact.email}
                      </a>
                    </div>
                  )}
                  {selectedContact.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selectedContact.phone}`} className="text-primary hover:underline">
                        {selectedContact.phone}
                      </a>
                    </div>
                  )}
                  {getMetadata(selectedContact).company && (
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{getMetadata(selectedContact).company}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {t('contacts.imported')} {formatDistanceToNow(new Date(selectedContact.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  {t('contacts.notesAndReminders')}
                </h3>
                {currentTenant && (
                  <ContactNotes contactId={selectedContact.id} tenantId={currentTenant.id} />
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center border rounded-lg bg-card">
          <div className="text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('contacts.selectLeadToView')}</p>
          </div>
        </div>
      )}

      {/* Status Dialog */}
      {selectedContact && (
        <ManageStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          contact={selectedContact}
          onStatusesChanged={fetchData}
        />
      )}

      {/* Reassign Dialog */}
      {selectedContact && (
        <ReassignDialog
          open={reassignDialogOpen}
          onOpenChange={setReassignDialogOpen}
          contactId={selectedContact.id}
          currentAssignee={currentAssignee}
          onReassigned={() => {
            fetchData();
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
