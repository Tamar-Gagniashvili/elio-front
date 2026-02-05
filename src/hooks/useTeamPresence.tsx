import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
  }[];
}

export function useTeamPresence() {
  const { currentTenant, user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Sync online status to database for backend access
  const syncPresenceToDb = useCallback(async (isOnline: boolean) => {
    if (!currentTenant?.id || !user?.id) return;

    try {
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          tenant_id: currentTenant.id,
          is_online: isOnline,
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,tenant_id'
        });
    } catch (error) {
      console.error('Error syncing presence to DB:', error);
    }
  }, [currentTenant?.id, user?.id]);

  useEffect(() => {
    if (!currentTenant?.id || !user?.id) return;

    const channelName = `presence:tenant:${currentTenant.id}`;
    
    const presenceChannel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState() as PresenceState;
        const online = new Set<string>();
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            online.add(presence.user_id);
          });
        });
        
        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          newPresences.forEach((p) => {
            const userId = (p as unknown as { user_id: string }).user_id;
            if (userId) next.add(userId);
          });
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          leftPresences.forEach((p) => {
            const userId = (p as unknown as { user_id: string }).user_id;
            if (userId) next.delete(userId);
          });
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
          // Sync to database when going online
          await syncPresenceToDb(true);
        }
      });

    setChannel(presenceChannel);

    // Handle page visibility changes and unload
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        await syncPresenceToDb(false);
      } else if (document.visibilityState === 'visible') {
        await syncPresenceToDb(true);
      }
    };

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline sync on page close
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_presence?user_id=eq.${user.id}&tenant_id=eq.${currentTenant.id}`;
      const body = JSON.stringify({
        is_online: false,
        last_seen_at: new Date().toISOString()
      });
      
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Mark offline before unsubscribing
      syncPresenceToDb(false);
      presenceChannel.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentTenant?.id, user?.id, syncPresenceToDb]);

  const isOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  return {
    onlineUsers,
    isOnline,
  };
}
