import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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

    // User is logged in
    if (memberships.length === 0) {
      // No workspace, go to onboarding
      navigate('/onboarding');
    } else if (currentTenant) {
      // Has workspace, go to inbox
      navigate('/inbox');
    }
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
