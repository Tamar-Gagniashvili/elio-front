import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TenantMembership, Profile } from '@/lib/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { Avatar } from '@/components/Avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TeamMember extends TenantMembership {
  profile: Profile;
}

export default function Settings() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { currentTenant, profile } = useAuth();

  useEffect(() => {
    if (!currentTenant) return;

    const fetchTeamMembers = async () => {
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

    fetchTeamMembers();
  }, [currentTenant]);

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

                      <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                        {member.role}
                      </Badge>
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
    </AppLayout>
  );
}
