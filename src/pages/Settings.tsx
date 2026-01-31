import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TenantMembership, Profile } from '@/lib/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar } from '@/components/Avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditMemberDialog } from '@/components/settings/EditMemberDialog';
import { Pencil } from 'lucide-react';

interface TeamMember extends TenantMembership {
  profile: Profile;
}

const POSITION_LABELS: Record<string, string> = {
  trainee: 'Trainee',
  junior: 'Junior',
  mid: 'Mid-Level',
  senior: 'Senior',
  lead: 'Lead',
};

export default function Settings() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  
  const { currentTenant, profile, currentMembership } = useAuth();
  const isAdmin = currentMembership?.role === 'owner' || currentMembership?.role === 'admin';

  const fetchTeamMembers = async () => {
    if (!currentTenant) return;
    
    const { data: memberships, error: membershipsError } = await supabase
      .from('tenant_memberships')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .eq('is_active', true);

    if (membershipsError) {
      console.error('Error fetching team members:', membershipsError);
      setIsLoading(false);
      return;
    }

    // Fetch profiles separately
    const userIds = (memberships || []).map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', userIds);

    const membersWithProfiles = (memberships || []).map(m => ({
      ...m,
      profile: (profiles || []).find(p => p.user_id === m.user_id) as Profile
    }));

    setTeamMembers(membersWithProfiles as TeamMember[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [currentTenant]);

  const canEditMember = (member: TeamMember) => {
    // Admins can only edit sales members, not other admins or owners
    return isAdmin && member.role === 'sales';
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your workspace and team settings
          </p>
        </div>

        <Tabs defaultValue="team" className="space-y-6">
          <TabsList>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  View who has access to this workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={member.profile?.avatar_url}
                          name={member.profile?.full_name}
                          size="md"
                        />
                        <div>
                          <p className="font-medium">
                            {member.profile?.full_name || 'Unknown'}
                            {member.user_id === profile?.user_id && (
                              <span className="text-muted-foreground ml-1">(you)</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.profile?.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {member.position && (
                          <Badge variant="outline">
                            {POSITION_LABELS[member.position] || member.position}
                          </Badge>
                        )}
                        <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                        {canEditMember(member) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingMember(member)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workspace" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Workspace Details</CardTitle>
                <CardDescription>
                  Basic information about your workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Workspace Name</Label>
                  <Input value={currentTenant?.name || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Workspace ID</Label>
                  <Input value={currentTenant?.slug || ''} disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EditMemberDialog
        member={editingMember}
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
        onUpdate={fetchTeamMembers}
      />
    </AppLayout>
  );
}
