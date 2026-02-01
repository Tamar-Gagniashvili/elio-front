import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import Landing from './Landing';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading, dataLoaded, memberships, currentTenant } = useAuth();
  const [roleChecked, setRoleChecked] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // First effect: Check super_admin role once user and data are loaded
  useEffect(() => {
    if (loading || !user || !dataLoaded) {
      setRoleChecked(false);
      return;
    }

    const checkRole = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();

      setIsSuperAdmin(!!data);
      setRoleChecked(true);
    };

    checkRole();
  }, [user, loading, dataLoaded]);

  // Second effect: Handle redirects after role is checked
  useEffect(() => {
    if (loading) return;

    // If no user and not loading, we show the landing page (handled in render)
    if (!user) return;

    // Wait for both data loaded AND role check to complete
    if (!dataLoaded || !roleChecked) return;

    if (isSuperAdmin) {
      navigate('/admin', { replace: true });
      return;
    }

    // Not super admin - check tenant memberships
    if (memberships.length === 0) {
      navigate('/onboarding', { replace: true });
    } else if (currentTenant) {
      navigate('/inbox', { replace: true });
    }
    // If memberships exist but no currentTenant yet, wait for useAuth to auto-select
  }, [user, loading, dataLoaded, roleChecked, isSuperAdmin, memberships, currentTenant, navigate]);

  // Show landing page for non-authenticated users
  if (!loading && !user) {
    return <Landing />;
  }

  // Show loading state for authenticated users while checking roles/memberships
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
