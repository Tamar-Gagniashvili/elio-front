import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, ArrowRight } from 'lucide-react';

export default function Onboarding() {
  const { t } = useTranslation();
  const [companyName, setCompanyName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, setCurrentTenant } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 8);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !user) return;

    setIsLoading(true);

    try {
      // Create tenant
      const tenant = await api.post<{ id: string }>('/tenants', {
        name: companyName.trim(),
        slug: generateSlug(companyName.trim()),
      });

      // Create membership as owner
      try {
        await api.post('/memberships', {
          tenant_id: tenant.id,
          user_id: user.id,
          role: 'owner',
        });
      } catch (err) {
        throw err;
      }

      // Create default chat distribution
      await supabase
        .from('chat_distribution')
        .insert({
          tenant_id: tenant.id,
          assignment_index: 0,
        });

      // Create default web chat channel
      await supabase
        .from('channels')
        .insert({
          tenant_id: tenant.id,
          channel_type: 'web_chat',
          name: 'Website Chat',
          is_active: true,
        });

      setCurrentTenant(tenant as unknown as import('@/lib/types').Tenant);
      
      toast({
        title: t('onboarding.workspaceCreated'),
        description: t('onboarding.workspaceCreatedDesc', { name: companyName }),
      });

      navigate('/inbox');
    } catch (error: unknown) {
      console.error('Error creating workspace:', error);
      toast({
        title: t('errors.somethingWentWrong'),
        description: t('onboarding.createFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('onboarding.title')}</CardTitle>
            <CardDescription>
              {t('onboarding.subtitle')}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">{t('onboarding.companyName')}</Label>
                <Input
                  id="company-name"
                  type="text"
                  placeholder={t('onboarding.companyNamePlaceholder')}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isLoading}
                  className="text-lg"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !companyName.trim()}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('onboarding.creatingWorkspace')}
                  </>
                ) : (
                  <>
                    {t('common.continue')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
