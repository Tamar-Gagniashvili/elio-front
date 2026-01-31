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
        }
      });

    setChannel(presenceChannel);

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [currentTenant?.id, user?.id]);

  const isOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  return {
    onlineUsers,
    isOnline,
  };
}
