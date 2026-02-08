import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useAuth } from '@/hooks/useAuth';
import { TenantFeature } from '@/lib/types';

interface ProtectedFeatureRouteProps {
  feature: TenantFeature;
  children: ReactNode;
}

export function ProtectedFeatureRoute({ feature, children }: ProtectedFeatureRouteProps) {
  const { hasFeature, getFirstAvailableRoute } = useFeatureAccess();
  const { loading, dataLoaded, user } = useAuth();

  // Wait for auth to be ready
  if (loading || !dataLoaded) {
    return null;
  }

  // If not logged in, let the page handle its own auth redirect
  if (!user) {
    return <>{children}</>;
  }

  // Check if feature is enabled
  if (!hasFeature(feature)) {
    const redirectTo = getFirstAvailableRoute();
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
