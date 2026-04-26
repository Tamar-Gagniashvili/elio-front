import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Contact } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/Avatar';
import { ChannelBadge } from '@/components/ChannelBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Search, Plus, X, Link2, Loader2, Pencil, Check } from 'lucide-react';

interface LinkContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  onLinksChanged: () => void;
}

export function LinkContactDialog({
  open,
  onOpenChange,
  contact,
  onLinksChanged,
}: LinkContactDialogProps) {
  const [linkedContacts, setLinkedContacts] = useState<Contact[]>([]);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentLinkGroupId, setCurrentLinkGroupId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  
  const { currentTenant, user } = useAuth();
  const { toast } = useToast();

  // Fetch linked contacts and available contacts
  useEffect(() => {
    if (!open || !currentTenant || !contact) return;

    const fetchData = async () => {
      setIsLoading(true);
      
      // First, check if this contact has a link group
      const { data: linkData } = await supabase
        .from('contact_links')
        .select(`
          link_group_id,
          contact_link_groups:link_group_id (
            id,
            display_name
          )
        `)
        .eq('contact_id', contact.id)
        .single();

      const linkGroupId = linkData?.link_group_id || null;
      setCurrentLinkGroupId(linkGroupId);
      
      // Set display name from group or default to contact name
      const group = linkData?.contact_link_groups as unknown as { id: string; display_name?: string } | null;
      setDisplayName(group?.display_name || contact.name || 'Unknown Contact');

      // Fetch all linked contacts in the same group
      if (linkGroupId) {
        const { data: linkedData } = await supabase
          .from('contact_links')
          .select('contact_id')
          .eq('link_group_id', linkGroupId)
          .neq('contact_id', contact.id);

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
      } else {
        setLinkedContacts([]);
      }

      // Fetch all contacts that can be linked (not already linked to this contact)
      const { data: allContacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .neq('id', contact.id)
        .order('name', { ascending: true });

      // Filter out contacts that are already linked to this contact's group
      const linkedIds = new Set(linkedContacts.map(c => c.id));
      linkedIds.add(contact.id);
      
      const available = (allContacts || []).filter(
        c => !linkedIds.has(c.id)
      ) as Contact[];
      
      setAvailableContacts(available);
      setIsLoading(false);
    };

    fetchData();
  }, [open, currentTenant, contact?.id]);

  // Filter available contacts by search query (also exclude currently linked)
  const filteredContacts = availableContacts.filter(c => {
    const linkedIds = new Set(linkedContacts.map(lc => lc.id));
    if (linkedIds.has(c.id)) return false;
    
    if (!searchQuery) return true;
    const name = c.name?.toLowerCase() || '';
    const email = c.email?.toLowerCase() || '';
    const phone = c.phone?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query) || phone.includes(query);
  });

  const handleUpdateDisplayName = async () => {
    if (!currentLinkGroupId || !displayName.trim()) return;

    try {
      const { error } = await supabase
        .from('contact_link_groups')
        .update({ display_name: displayName.trim() })
        .eq('id', currentLinkGroupId);

      if (error) throw error;

      setIsEditingName(false);
      toast({
        title: 'Name updated',
        description: 'The contact group name has been updated.',
      });
      onLinksChanged();
    } catch (error) {
      console.error('Error updating display name:', error);
      toast({
        title: 'Error',
        description: 'Failed to update name. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleLinkContact = async (targetContact: Contact) => {
    if (!user || !currentTenant) return;

    try {
      // Check if target contact already has a link group
      const { data: targetLink } = await supabase
        .from('contact_links')
        .select('link_group_id')
        .eq('contact_id', targetContact.id)
        .single();

      let newGroupId = currentLinkGroupId;

      if (!currentLinkGroupId && !targetLink?.link_group_id) {
        // Neither has a group, create a new one
        const groupName = displayName || contact.name || 'Linked Contact';
        
        // Create the link group first
        const { data: newGroup, error: groupError } = await supabase
          .from('contact_link_groups')
          .insert({
            tenant_id: currentTenant.id,
            display_name: groupName,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (groupError) throw groupError;
        newGroupId = newGroup.id;
        
        // Insert both contacts into the new group
        const { error } = await supabase.from('contact_links').insert([
          {
            tenant_id: currentTenant.id,
            contact_id: contact.id,
            link_group_id: newGroupId,
            created_by: user.id,
          },
          {
            tenant_id: currentTenant.id,
            contact_id: targetContact.id,
            link_group_id: newGroupId,
            created_by: user.id,
          },
        ]);

        if (error) throw error;
      } else if (currentLinkGroupId && !targetLink?.link_group_id) {
        // Current contact has a group, add target to it
        const { error } = await supabase.from('contact_links').insert({
          tenant_id: currentTenant.id,
          contact_id: targetContact.id,
          link_group_id: currentLinkGroupId,
          created_by: user.id,
        });

        if (error) throw error;
        newGroupId = currentLinkGroupId;
      } else if (!currentLinkGroupId && targetLink?.link_group_id) {
        // Target has a group, add current to it
        const { error } = await supabase.from('contact_links').insert({
          tenant_id: currentTenant.id,
          contact_id: contact.id,
          link_group_id: targetLink.link_group_id,
          created_by: user.id,
        });

        if (error) throw error;
        newGroupId = targetLink.link_group_id;
        
        // Fetch display name from target's group
        const { data: groupData } = await supabase
          .from('contact_link_groups')
          .select('display_name')
          .eq('id', targetLink.link_group_id)
          .single();
        
        if (groupData?.display_name) {
          setDisplayName(groupData.display_name);
        }
      } else if (currentLinkGroupId && targetLink?.link_group_id && currentLinkGroupId !== targetLink.link_group_id) {
        // Both have different groups, merge them into current group
        const { error } = await supabase
          .from('contact_links')
          .update({ link_group_id: currentLinkGroupId })
          .eq('link_group_id', targetLink.link_group_id);

        if (error) throw error;
        
        // Delete the old group
        await supabase
          .from('contact_link_groups')
          .delete()
          .eq('id', targetLink.link_group_id);
          
        newGroupId = currentLinkGroupId;
      }

      setCurrentLinkGroupId(newGroupId);
      setLinkedContacts(prev => [...prev, targetContact]);
      setAvailableContacts(prev => prev.filter(c => c.id !== targetContact.id));
      
      toast({
        title: 'Contact linked',
        description: `${targetContact.name || 'Contact'} has been linked successfully.`,
      });
      
      onLinksChanged();
    } catch (error) {
      console.error('Error linking contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to link contact. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUnlinkContact = async (targetContact: Contact) => {
    if (!currentLinkGroupId) return;

    try {
      const { error } = await supabase
        .from('contact_links')
        .delete()
        .eq('contact_id', targetContact.id)
        .eq('link_group_id', currentLinkGroupId);

      if (error) throw error;

      // Check if current contact is now alone in the group
      const { data: remainingLinks } = await supabase
        .from('contact_links')
        .select('id')
        .eq('link_group_id', currentLinkGroupId);

      if (remainingLinks && remainingLinks.length <= 1) {
        // Only current contact left, remove their link and the group
        await supabase
          .from('contact_links')
          .delete()
          .eq('link_group_id', currentLinkGroupId);
          
        await supabase
          .from('contact_link_groups')
          .delete()
          .eq('id', currentLinkGroupId);
          
        setCurrentLinkGroupId(null);
        setDisplayName(contact.name || 'Unknown Contact');
      }

      setLinkedContacts(prev => prev.filter(c => c.id !== targetContact.id));
      setAvailableContacts(prev => [...prev, targetContact]);
      
      toast({
        title: 'Contact unlinked',
        description: `${targetContact.name || 'Contact'} has been unlinked.`,
      });
      
      onLinksChanged();
    } catch (error) {
      console.error('Error unlinking contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to unlink contact. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Contacts
          </DialogTitle>
          <DialogDescription>
            Link contacts from different channels that represent the same person.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Display Name Editor */}
          {(linkedContacts.length > 0 || currentLinkGroupId) && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Contact Name</h4>
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter display name..."
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleUpdateDisplayName}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsEditingName(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 font-medium">{displayName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setIsEditingName(true)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Currently linked contacts */}
          {linkedContacts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Linked Channels</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {/* Show current contact first */}
                <div className="flex items-center justify-between p-2 rounded-md bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <ChannelBadge
                      channelType={contact.channel_type}
                      size="md"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {contact.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">Current</span>
                    </div>
                  </div>
                </div>
                
                {linkedContacts.map((linkedContact) => (
                  <div
                    key={linkedContact.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <ChannelBadge
                        channelType={linkedContact.channel_type}
                        size="md"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {linkedContact.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {linkedContact.email || linkedContact.phone || ''}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleUnlinkContact(linkedContact)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search for contacts to link */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Link Another Contact</h4>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Available contacts list */}
          <div className="flex-1 overflow-y-auto space-y-1 min-h-[150px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                {searchQuery ? 'No contacts found' : 'No other contacts available'}
              </div>
            ) : (
              filteredContacts.map((availableContact) => (
                <div
                  key={availableContact.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ChannelBadge
                      channelType={availableContact.channel_type}
                      size="md"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {availableContact.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {availableContact.email || availableContact.phone || ''}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => handleLinkContact(availableContact)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
