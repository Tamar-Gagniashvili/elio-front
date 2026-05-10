import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    const checkSuperAdmin = async () => {
      try {
        const data = await api.get<any[]>(`/user-roles?user_id=${user.id}`);
        const isSuper = data && data.some(r => r.role === 'super_admin');
        setIsSuperAdmin(isSuper);
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      }
      setLoading(false);
    };

    checkSuperAdmin();
  }, [user]);

  return { isSuperAdmin, loading };
}
