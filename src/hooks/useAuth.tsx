import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, TenantMembership, Tenant } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  memberships: TenantMembership[];
  currentTenant: Tenant | null;
  currentMembership: TenantMembership | null;
  loading: boolean;
  dataLoaded: boolean; // New: indicates if user data has been fetched
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setCurrentTenant: (tenant: Tenant | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [currentMembership, setCurrentMembership] = useState<TenantMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setMemberships([]);
          setCurrentTenant(null);
          setCurrentMembership(null);
          setDataLoaded(false);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      setProfile(profileData as Profile | null);

      // Fetch memberships with tenant data
      const { data: membershipData } = await supabase
        .from('tenant_memberships')
        .select(`
          *,
          tenant:tenants(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      const typedMemberships = (membershipData || []).map(m => ({
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('currentTenantId');
    window.location.href = '/auth';
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
