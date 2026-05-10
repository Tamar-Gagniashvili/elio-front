import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { api } from '@/lib/api';
import { Profile, TenantMembership, Tenant } from '@/lib/types';

interface AuthContextType {
  user: any | null; // Replaces Supabase User
  session: any | null; // Replaces Supabase Session
  profile: Profile | null;
  memberships: TenantMembership[];
  currentTenant: Tenant | null;
  currentMembership: TenantMembership | null;
  loading: boolean;
  dataLoaded: boolean; // Indicates if user data has been fetched
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setCurrentTenant: (tenant: Tenant | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentMembership, setCurrentMembership] = useState<TenantMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const userData = await api.get<any>('/user');
        setUser(userData);
        setSession({ user: userData }); // mock session object for compatibility
        await fetchUserData(userData.id);
      } catch (error) {
        console.error('Failed to restore session', error);
        localStorage.removeItem('token');
        setUser(null);
        setSession(null);
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const profilesData = await api.get<any[]>(`/profiles?user_id=${userId}`);
      const profileData = Array.isArray(profilesData) ? profilesData[0] : profilesData.data?.[0];
      setProfile(profileData as Profile | null);

      // Fetch memberships
      const membershipsData = await api.get<any[]>(`/memberships?user_id=${userId}&is_active=1`);
      const items = Array.isArray(membershipsData) ? membershipsData : membershipsData.data || [];
      const typedMemberships = items.map((m: any) => ({
        ...m,
        tenant: m.tenant as Tenant
      })) as TenantMembership[];

      setMemberships(typedMemberships);

      // Auto-select first tenant if available
      if (typedMemberships.length > 0 && !currentTenant) {
        const savedTenantId = localStorage.getItem('currentTenantId');
        const savedMembership = typedMemberships.find(m => m.tenant_id === savedTenantId);
        const selected = savedMembership || typedMemberships[0];
        setCurrentTenant(selected.tenant || null);
        setCurrentMembership(selected);
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
      const res = await api.post<any>('/login', { email, password });
      if (res.access_token) {
        localStorage.setItem('token', res.access_token);
        setUser(res.user);
        setSession({ user: res.user });
        await fetchUserData(res.user.id);
        return { error: null };
      }
      return { error: new Error('No token received') };
    } catch (e: any) {
      return { error: e };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const res = await api.post<any>('/register', { email, password, name: fullName });
      if (res.access_token) {
        localStorage.setItem('token', res.access_token);
        setUser(res.user);
        setSession({ user: res.user });
        await fetchUserData(res.user.id);
        return { error: null };
      }
      return { error: new Error('No token received') };
    } catch (e: any) {
      return { error: e };
    }
  };

  const signOut = async () => {
    try {
      await api.post('/logout', {});
    } catch (e) {
      console.log('Logout API failed, continuing local clear');
    }

    localStorage.removeItem('token');
    localStorage.removeItem('currentTenantId');
    setUser(null);
    setSession(null);
    setProfile(null);
    setMemberships([]);
    setCurrentTenant(null);
    setCurrentMembership(null);
    setDataLoaded(false);
    setLoading(false);
    
    window.location.replace('/auth');
  };

  const handleSetCurrentTenant = (tenant: Tenant | null) => {
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
