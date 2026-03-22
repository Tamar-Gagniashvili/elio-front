import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

const POSITION_KEYS: Record<string, string> = {
  trainee: 'settings.trainee',
  junior: 'settings.junior',
  mid: 'settings.midLevel',
  senior: 'settings.senior',
  lead: 'settings.lead',
};

export default function Settings() {
  const { t } = useTranslation();
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
      <div className="p-4 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
          <p className="text-muted-foreground">
            {t('settings.subtitle')}
          </p>
        </div>

        <Tabs defaultValue="team" className="space-y-6">
          <TabsList>
            <TabsTrigger value="team">{t('settings.team')}</TabsTrigger>
            <TabsTrigger value="workspace">{t('settings.workspace')}</TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.teamMembers')}</CardTitle>
                <CardDescription>
                  {t('settings.viewTeamAccess')}
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
                            {member.profile?.full_name || t('common.unknown')}
                            {member.user_id === profile?.user_id && (
                              <span className="text-muted-foreground ml-1">({t('common.you')})</span>
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
                            {POSITION_KEYS[member.position] ? t(POSITION_KEYS[member.position]) : member.position}
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
                <CardTitle>{t('settings.workspaceDetails')}</CardTitle>
                <CardDescription>
                  {t('settings.workspaceDetailsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('settings.workspaceName')}</Label>
                  <Input value={currentTenant?.name || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.workspaceId')}</Label>
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
