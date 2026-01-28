import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading, memberships, currentTenant } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if user is super admin
    const checkRoleAndRedirect = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();

      if (data) {
        // User is super admin, go to admin dashboard
        navigate('/admin');
      } else if (memberships.length === 0) {
        // No workspace, go to onboarding
        navigate('/onboarding');
      } else if (currentTenant) {
        // Has workspace and tenant selected, go to inbox
        navigate('/inbox');
      } else if (memberships.length > 0) {
        // Has memberships but no current tenant selected yet
        // This means tenant data is still loading, wait for it
        // The useAuth hook will auto-select first tenant
      }
    };

    checkRoleAndRedirect();
  }, [user, loading, memberships, currentTenant, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
