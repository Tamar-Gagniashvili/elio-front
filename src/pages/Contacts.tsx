import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Contact, ChannelType } from '@/lib/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar } from '@/components/Avatar';
import { ChannelBadge } from '@/components/ChannelBadge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, Users, Link2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface GroupedContact {
  id: string;
  isLinked: boolean;
  displayName: string;
  contacts: Contact[];
  lastActivity: string;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [linkGroups, setLinkGroups] = useState<Map<string, { groupId: string; displayName?: string }>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const { currentTenant } = useAuth();

  useEffect(() => {
    if (!currentTenant) return;

    const fetchData = async () => {
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (contactsError) {
        console.error('Error fetching contacts:', contactsError);
      } else {
        setContacts(contactsData as Contact[]);
      }

      const { data: links } = await supabase
        .from('contact_links')
        .select(`
          contact_id,
          link_group_id,
          contact_link_groups:link_group_id (
            id,
            display_name
          )
        `)
        .eq('tenant_id', currentTenant.id);

      const groupMap = new Map<string, { groupId: string; displayName?: string }>();
      
      if (links) {
        for (const link of links) {
          const group = link.contact_link_groups as unknown as { id: string; display_name?: string } | null;
          groupMap.set(link.contact_id, {
            groupId: link.link_group_id,
            displayName: group?.display_name || undefined,
          });
        }
      }
      
      setLinkGroups(groupMap);
      setIsLoading(false);
    };

    fetchData();
  }, [currentTenant]);

  const groupedContacts = useMemo(() => {
    const groups = new Map<string, GroupedContact>();
    const standalone: GroupedContact[] = [];

    for (const contact of contacts) {
      const linkInfo = linkGroups.get(contact.id);

      if (linkInfo) {
        const existing = groups.get(linkInfo.groupId);
        
        if (existing) {
          existing.contacts.push(contact);
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
          });
        }
      } else {
        standalone.push({
          id: contact.id,
          isLinked: false,
          displayName: contact.name || 'Unknown',
          contacts: [contact],
          lastActivity: contact.updated_at,
        });
      }
    }

    const allGroups = [...groups.values(), ...standalone];
    allGroups.sort((a, b) => {
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    });

    return allGroups;
  }, [contacts, linkGroups]);

  const filteredGroups = groupedContacts.filter((group) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    if (group.displayName.toLowerCase().includes(query)) return true;
    
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

  const renderContactRow = (contact: Contact) => (
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
          {contact.email || contact.phone || contact.external_id || 'No contact info'}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true })}
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-muted-foreground">
              All customers who have messaged your business
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {groupedContacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No contacts yet</h3>
              <p className="text-sm text-muted-foreground">
                When customers message you, they'll appear here
              </p>
            </CardContent>
          </Card>
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
                                ({group.contacts.length} linked)
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
                                <span>+{info.emails.length - 2} more</span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground mr-2">
                            {formatDistanceToNow(new Date(group.lastActivity), { addSuffix: true })}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium py-2">
                            Linked Contacts
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
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
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
                          {info.emails.map((email) => (
                            <span key={email}>{email}</span>
                          ))}
                          {info.phones.map((phone) => (
                            <span key={phone}>{phone}</span>
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(group.lastActivity), { addSuffix: true })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
