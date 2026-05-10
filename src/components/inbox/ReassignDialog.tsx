import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTeamPresence } from '@/hooks/useTeamPresence';
import { TenantMembership, Profile } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/Avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, Circle, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  membership: TenantMembership;
  profile: Profile;
}

interface ReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  contactId?: string;
  currentAssignee?: string | null;
  onReassigned?: () => void;
}

export function ReassignDialog({
  open,
  onOpenChange,
  conversationId,
  contactId,
  currentAssignee,
  onReassigned,
}: ReassignDialogProps) {
  const { t } = useTranslation();
  const { currentTenant, user } = useAuth();
  const { isOnline, onlineUsers } = useTeamPresence();
  const { toast } = useToast();

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false); // Default to showing all users
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [reassignReason, setReassignReason] = useState('');

  // Reset filters when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setSelectedPosition(null);
      setShowOnlineOnly(false);
      setReassignReason('');
    }
  }, [open]);

  // Fetch team members and positions
  useEffect(() => {
    if (!open || !currentTenant) return;

    const fetchTeamMembers = async () => {
      setIsLoading(true);

      // Fetch team members - sales can only assign to other sales, admins can assign to anyone
      try {
        const currentUserData = await api.get<any[]>(`/tenant-memberships?tenant_id=${currentTenant.id}&user_id=${user?.id || ''}`);
        const currentUserMembership = currentUserData?.[0];
        
        const isSalesRole = currentUserMembership?.role === 'sales';
        
        // Sales users can only assign to other sales members
        // Admins/Owners can assign to anyone (sales, admin, owner)
        const queryParams = new URLSearchParams({
          tenant_id: currentTenant.id,
          is_active: '1'
        });
        
        if (isSalesRole) {
          queryParams.append('role[]', 'sales');
        } else {
          queryParams.append('role[]', 'sales');
          queryParams.append('role[]', 'admin');
          queryParams.append('role[]', 'owner');
        }
        
        const memberships = await api.get<any[]>(`/tenant-memberships?${queryParams.toString()}`);

        if (!memberships || memberships.length === 0) {
          setTeamMembers([]);
          setPositions([]);
          setIsLoading(false);
          return;
        }

        // Combine memberships with profiles
        const members: TeamMember[] = memberships
          .filter((m) => m.profile)
          .map((m) => ({
            membership: m as TenantMembership,
            profile: m.profile as Profile,
          }));

        setTeamMembers(members);

        // Extract unique positions
        const uniquePositions = [
          ...new Set(
            memberships
              .map((m) => m.position)
              .filter((p): p is string => !!p && p.trim() !== '')
          ),
        ];
        setPositions(uniquePositions);
      } catch (err) {
        console.error('Error fetching memberships:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamMembers();
  }, [open, currentTenant]);

  // Filter team members
  const filteredMembers = useMemo(() => {
    return teamMembers.filter((member) => {
      // Exclude current assignee
      if (currentAssignee && member.membership.user_id === currentAssignee) {
        return false;
      }

      // Filter by online status
      if (showOnlineOnly && !isOnline(member.membership.user_id)) {
        return false;
      }

      // Filter by position
      if (selectedPosition && member.membership.position !== selectedPosition) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = member.profile.full_name?.toLowerCase() || '';
        const email = member.profile.email?.toLowerCase() || '';
        const position = member.membership.position?.toLowerCase() || '';
        return name.includes(query) || email.includes(query) || position.includes(query);
      }

      return true;
    });
  }, [teamMembers, currentAssignee, showOnlineOnly, selectedPosition, searchQuery, isOnline]);

  const handleAssign = async (userId: string) => {
    if (!conversationId && !contactId) return;

    setIsAssigning(true);

    try {
      const updateData = { 
        assigned_to: userId, 
        status: 'assigned' as const,
        assignment_seen_by_assignee: false,
        assignment_reason: reassignReason.trim() || null,
        reassigned_by: user?.id || null,
      };

      // Get contact name for notification
      let contactName = 'Unknown Contact';
      if (conversationId) {
        const convs = await api.get<any[]>(`/conversations?id=${conversationId}`);
        const conv = convs && convs.length > 0 ? convs[0] : null;
        if (conv?.contact_id) {
          const contacts = await api.get<any[]>(`/contacts?id=${conv.contact_id}`);
          if (contacts && contacts.length > 0) {
            contactName = contacts[0].name || 'Unknown Contact';
          }
        }

        await api.put(`/conversations/${conversationId}`, updateData);
      } else if (contactId) {
        const contacts = await api.get<any[]>(`/contacts?id=${contactId}`);
        contactName = contacts && contacts.length > 0 ? contacts[0].name || 'Unknown Contact' : 'Unknown Contact';

        // Find conversation by contact_id to update it
        const convs = await api.get<any[]>(`/conversations?contact_id=${contactId}`);
        if (convs && convs.length > 0) {
          await api.put(`/conversations/${convs[0].id}`, updateData);
        }
      }

      const assignee = teamMembers.find((m) => m.membership.user_id === userId);
      const assignerName = user?.user_metadata?.full_name || 'A team member';
      
      // Send push notification to the assignee (fire and forget)
      api.post('/functions/send-push-notification', {
        user_id: userId,
        title: `New contact assigned: ${contactName}`,
        body: reassignReason.trim() 
          ? `${assignerName}: ${reassignReason.trim()}`
          : `${assignerName} assigned you a contact`,
        url: '/inbox?filter=newly_assigned',
        conversation_id: conversationId,
      }).catch(err => console.error('Failed to send push notification:', err));

      toast({
        title: t('inbox.contactReassigned'),
        description: t('inbox.successfullyReassigned', { name: assignee?.profile.full_name || 'team member' }),
      });

      setReassignReason('');
      onOpenChange(false);
      onReassigned?.();
    } catch (error) {
      console.error('Error reassigning:', error);
      toast({
        title: 'Error',
        description: 'Failed to reassign contact',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!conversationId && !contactId) return;

    setIsAssigning(true);

    try {
      if (conversationId) {
        await api.put(`/conversations/${conversationId}`, { assigned_to: null, status: 'open' });
      } else if (contactId) {
        const convs = await api.get<any[]>(`/conversations?contact_id=${contactId}`);
        if (convs && convs.length > 0) {
          await api.put(`/conversations/${convs[0].id}`, { assigned_to: null, status: 'open' });
        }
      }

      toast({
        title: t('inbox.contactUnassigned'),
        description: t('inbox.contactNowUnassigned'),
      });

      onOpenChange(false);
      onReassigned?.();
    } catch (error) {
      console.error('Error unassigning:', error);
      toast({
        title: 'Error',
        description: 'Failed to unassign contact',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // Count online users excluding the current assignee (who can't be reassigned to themselves)
  const onlineCount = useMemo(() => {
    return teamMembers.filter((m) => 
      isOnline(m.membership.user_id) && 
      m.membership.user_id !== currentAssignee
    ).length;
  }, [teamMembers, isOnline, onlineUsers, currentAssignee]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('inbox.reassignContact')}</DialogTitle>
          <DialogDescription>
            {t('inbox.chooseTeamMember')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('inbox.searchTeam')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Reassign Reason */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {t('inbox.reassignReason')}
            </label>
            <Textarea
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder={t('inbox.reassignReasonPlaceholder')}
              className="min-h-[60px] resize-none"
              rows={2}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Online filter */}
            <Button
              variant={showOnlineOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOnlineOnly(!showOnlineOnly)}
              className="h-7 text-xs gap-1.5"
            >
              <Circle className={cn(
                'h-2 w-2 fill-current',
                showOnlineOnly ? 'text-green-400' : 'text-muted-foreground'
              )} />
              {t('inbox.online')} ({onlineCount})
            </Button>

            {/* Position filters */}
            {positions.length > 0 && (
              <>
                <div className="h-4 w-px bg-border" />
                {positions.map((position) => (
                  <Badge
                    key={position}
                    variant={selectedPosition === position ? 'default' : 'outline'}
                    className="cursor-pointer h-7"
                    onClick={() => setSelectedPosition(
                      selectedPosition === position ? null : position
                    )}
                  >
                    {position}
                    {selectedPosition === position && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </>
            )}
          </div>

          {/* Team Members List */}
          <ScrollArea className="h-[300px] -mx-2 px-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {teamMembers.length === 0 
                    ? t('inbox.noTeamMembers')
                    : t('inbox.noMatchingTeam')}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map((member) => {
                  const online = isOnline(member.membership.user_id);
                  const isCurrentUser = member.membership.user_id === user?.id;

                  return (
                    <button
                      key={member.membership.id}
                      onClick={() => handleAssign(member.membership.user_id)}
                      disabled={isAssigning}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                        'hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary',
                        isAssigning && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar
                          src={member.profile.avatar_url}
                          name={member.profile.full_name}
                          size="md"
                        />
                        <div
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
                            online ? 'bg-green-500' : 'bg-muted-foreground/50'
                          )}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {member.profile.full_name || member.profile.email}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-[10px] h-4">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {member.membership.position && (
                            <span className="truncate">{member.membership.position}</span>
                          )}
                          {member.membership.position && (
                            <span>•</span>
                          )}
                          <span className="capitalize">{member.membership.role}</span>
                        </div>
                      </div>

                      <Badge
                        variant={online ? 'default' : 'secondary'}
                        className={cn(
                          'text-[10px] h-5',
                          online && 'bg-green-500 hover:bg-green-600'
                        )}
                      >
                        {online ? t('inbox.online') : t('inbox.offline')}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Unassign option */}
          {currentAssignee && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnassign}
                disabled={isAssigning}
                className="w-full"
              >
                {isAssigning ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {t('inbox.removeAssignment')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
