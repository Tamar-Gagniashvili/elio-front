import { useAuth } from './useAuth';
import { TenantFeature, ALL_FEATURES } from '@/lib/types';

const DEFAULT_FEATURES: TenantFeature[] = ['inbox', 'contacts', 'channels'];

export function useFeatureAccess() {
  const { currentTenant } = useAuth();

  const enabledFeatures = (currentTenant?.enabled_features as TenantFeature[]) || DEFAULT_FEATURES;

  const hasFeature = (feature: TenantFeature): boolean => {
    return enabledFeatures.includes(feature);
  };

  const getAvailableFeatures = (): TenantFeature[] => {
    return ALL_FEATURES.filter(feature => enabledFeatures.includes(feature));
  };

  const getFirstAvailableRoute = (): string => {
    const available = getAvailableFeatures();
    return available.length > 0 ? `/${available[0]}` : '/settings';
  };

  return {
    enabledFeatures,
    hasFeature,
    getAvailableFeatures,
    getFirstAvailableRoute,
  };
}
