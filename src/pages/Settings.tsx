import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
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
import { PaymentSettingsCard } from '@/components/settings/PaymentSettingsCard';
import { AdvancePaymentCard } from '@/components/settings/AdvancePaymentCard';
import { SmsSettingsCard } from '@/components/settings/SmsSettingsCard';
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
    
    try {
      const data = await api.get<any[]>(`/tenant-memberships?tenant_id=${currentTenant.id}&is_active=1`);
      if (data && Array.isArray(data)) {
        setTeamMembers(data as TeamMember[]);
      }
    } catch (e) {
      console.error('Error fetching team members:', e);
    }
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
          <h1 className="text-xl sm:text-2xl font-bold">{t('settings.title')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {t('settings.subtitle')}
          </p>
        </div>

        <Tabs defaultValue="team" className="space-y-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="team">{t('settings.team')}</TabsTrigger>
            <TabsTrigger value="workspace">{t('settings.workspace')}</TabsTrigger>
            {isAdmin && <TabsTrigger value="payments">{t('settings.payments.tab')}</TabsTrigger>}
            {isAdmin && <TabsTrigger value="sms">{t('settings.sms.tab')}</TabsTrigger>}
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
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          src={member.profile?.avatar_url}
                          name={member.profile?.full_name}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {member.profile?.full_name || t('common.unknown')}
                            {member.user_id === profile?.user_id && (
                              <span className="text-muted-foreground ml-1">({t('common.you')})</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {member.profile?.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:flex-shrink-0">
                        {member.position && (
                          <Badge variant="outline">
                            {POSITION_KEYS[member.position] ? t(POSITION_KEYS[member.position]) : member.position}
                          </Badge>
                        )}
                        <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                          {t(`settings.${member.role}`)}
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
          {isAdmin && (
            <TabsContent value="payments" className="space-y-6">
              <PaymentSettingsCard />
              <AdvancePaymentCard />
            </TabsContent>
          )}
          {isAdmin && (
            <TabsContent value="sms" className="space-y-6">
              <SmsSettingsCard />
            </TabsContent>
          )}
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
