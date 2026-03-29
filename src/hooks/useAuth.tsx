import { useEffect, useState, createContext, useContext, ReactNode, useMemo } from 'react';
import { api, getTenantDomain } from '@/lib/api';
// We redefine User locally since we no longer use Supabase types
export interface User {
  id: string;
  email: string;
  name?: string;
}
import { Profile, TenantMembership, Tenant } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: { access_token: string } | null;
  profile: Profile | null;
  memberships: TenantMembership[];
  currentTenant: Tenant | null;
  currentMembership: TenantMembership | null;
  loading: boolean;
  dataLoaded: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setCurrentTenant: (tenant: Tenant | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentMembership, setCurrentMembership] = useState<TenantMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  const tenantDomain = useMemo(() => getTenantDomain(), []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setSession({ access_token: token });
      // Fetch user from Laravel API
      api.get<User>('/user').then(userResp => {
        setUser(userResp);
        fetchUserData(userResp.id);
      }).catch(err => {
        console.error('Invalid session token', err);
        localStorage.removeItem('token');
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      try {
        const profiles = await api.get<any[]>(`/profiles?user_id=${userId}`);
        if (profiles.length > 0) setProfile(profiles[0] as Profile);
      } catch (err) {
        console.error("Failed to load profile", err);
      }

      // Fetch memberships with tenant data
      let membershipData: any[] = [];
      try {
        membershipData = await api.get<any[]>(`/memberships?user_id=${userId}`);
      } catch (err) {
        console.error("Failed to load memberships", err);
      }

      const typedMemberships = await Promise.all(
        membershipData.map(async (m) => {
          try {
            const tenant = await api.get<any>(`/tenants/${m.tenant_id}`);
            return {
              ...m,
              tenant
            } as TenantMembership;
          } catch(e) {
            return m as TenantMembership;
          }
        })
      );

      setMemberships(typedMemberships);

      // Handle Subdomain-based Tenant selection
      if (tenantDomain) {
        // Find the membership for this specific subdomain
        const resolvedMembership = typedMemberships.find(m => m.tenant?.domain === `${tenantDomain}.localhost` || m.tenant?.domain === tenantDomain);
        
        if (resolvedMembership) {
          setCurrentTenant(resolvedMembership.tenant || null);
          setCurrentMembership(resolvedMembership);
        } else {
          // Logged in but no access to THIS tenant domain
          setCurrentTenant(null);
          setCurrentMembership(null);
        }
      } else {
        // On root domain (e.g., localhost:5173 / relink.app)
        // No currentTenant context here - this is Landlord mode
        setCurrentTenant(null);
        setCurrentMembership(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setDataLoaded(true);
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const resp = await api.post<{ access_token: string; user: User }>('/login', { email, password });
      localStorage.setItem('token', resp.access_token);
      setSession({ access_token: resp.access_token });
      setUser(resp.user);
      await fetchUserData(resp.user.id);
      return { error: null };
    } catch (e: any) {
      return { error: new Error(e.message || 'Login failed') };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const resp = await api.post<{ access_token: string; user: User }>('/register', { email, password, name: fullName });
      localStorage.setItem('token', resp.access_token);
      setSession({ access_token: resp.access_token });
      setUser(resp.user);
      await fetchUserData(resp.user.id);
      return { error: null };
    } catch(e: any) {
      return { error: new Error(e.message || 'Registration failed') };
    }
  };

  const signOut = async () => {
    try {
      await api.post('/logout', {});
    } catch (e) {
      console.log('Ignore logout errors if token is invalid');
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setMemberships([]);
    setCurrentTenant(null);
    setCurrentMembership(null);
    setDataLoaded(false);
    setLoading(false);
    localStorage.removeItem('currentTenantId');
    localStorage.removeItem('token');
    
    // Redirect to same domain auth but clear state
    window.location.replace('/auth');
  };

  const handleSetCurrentTenant = (tenant: Tenant | null) => {
    // If we're on a subdomain, we don't allow manual tenant switching via this hook
    // One must browse to the actual subdomain to switch
    if (tenantDomain) return;

    setCurrentTenant(tenant);
    if (tenant) {
      localStorage.setItem('currentTenantId', tenant.id);
      const membership = memberships.find(m => m.tenant_id === tenant.id);
      setCurrentMembership(membership || null);
    } else {
      localStorage.removeItem('currentTenantId');
      setCurrentMembership(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        memberships,
        currentTenant,
        currentMembership,
        loading,
        dataLoaded,
        signIn,
        signUp,
        signOut,
        setCurrentTenant: handleSetCurrentTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
