import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { api, getTenantDomain } from '@/lib/api';
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
      try {
        const roles = await api.get<any[]>(`/user-roles?user_id=${user.id}`);
        const isSuper = roles.some((r: any) => r.role === 'super_admin');
        setIsSuperAdmin(isSuper);
      } catch (e) {
        setIsSuperAdmin(false);
      }
      setRoleChecked(true);
    };

    checkRole();
  }, [user, loading, dataLoaded]);

  // Second effect: Handle redirects after role is checked
  useEffect(() => {
    if (loading || !user || !dataLoaded || !roleChecked) return;

    const tenantDomain = getTenantDomain();

    if (isSuperAdmin) {
      navigate('/admin', { replace: true });
      return;
    }

    // If on a subdomain, we expect a currentTenant to be resolved
    if (tenantDomain) {
      if (currentTenant) {
        navigate('/inbox', { replace: true });
      } else if (dataLoaded) {
        // Logged in on a subdomain but has no access to it
        navigate('/onboarding', { replace: true });
      }
      return;
    }

    // Root domain - only allow Landlord/Admin access
    if (memberships.length === 0) {
      navigate('/onboarding', { replace: true });
    } else {
      // User has memberships but is on root domain. 
      // We don't auto-redirect to inbox here because no tenant is active on root.
      // They stay on the landing page or a "Select Tenant" view could be shown.
    }
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
