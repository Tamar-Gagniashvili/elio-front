import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, ArrowRight } from 'lucide-react';

export default function Onboarding() {
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
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: companyName.trim(),
          slug: generateSlug(companyName.trim()),
        })
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Create membership as owner
      const { error: membershipError } = await supabase
        .from('tenant_memberships')
        .insert({
          tenant_id: tenant.id,
          user_id: user.id,
          role: 'owner',
        });

      if (membershipError) throw membershipError;

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
        title: 'Workspace created!',
        description: `${companyName} is ready to go.`,
      });

      navigate('/inbox');
    } catch (error: unknown) {
      console.error('Error creating workspace:', error);
      toast({
        title: 'Error',
        description: 'Failed to create workspace. Please try again.',
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
            <CardTitle className="text-2xl">Create your workspace</CardTitle>
            <CardDescription>
              Set up your company's chat inbox to start managing customer conversations
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  type="text"
                  placeholder="Acme Inc."
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
                    Creating workspace...
                  </>
                ) : (
                  <>
                    Continue
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
