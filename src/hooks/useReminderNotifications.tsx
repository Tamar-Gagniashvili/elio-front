import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Pin, MessageSquare } from 'lucide-react';

interface ContactNote {
  id: string;
  contact_id: string;
  tenant_id: string;
  content: string;
  color: string | null;
  reminder_at: string;
  reminder_shown: boolean;
}

interface Contact {
  id: string;
  name: string | null;
}

interface Conversation {
  id: string;
  contact_id: string;
}

const NOTE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  yellow: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-900' },
  pink: { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-900' },
  blue: { bg: 'bg-sky-100', border: 'border-sky-300', text: 'text-sky-900' },
  green: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-900' },
  purple: { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-900' },
  orange: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-900' },
};

export function useReminderNotifications() {
  const { currentTenant, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentTenant || !user) return;

    const checkReminders = async () => {
      const now = new Date().toISOString();
      
      // Find notes with due reminders that haven't been shown
      const { data: dueNotes, error } = await supabase
        .from('contact_notes')
        .select(`
          id,
          contact_id,
          tenant_id,
          content,
          color,
          reminder_at,
          reminder_shown
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('reminder_shown', false)
        .not('reminder_at', 'is', null)
        .lte('reminder_at', now);

      if (error) {
        console.error('Error checking reminders:', error);
        return;
      }

      if (!dueNotes || dueNotes.length === 0) return;

      // Get contact info for each note
      const contactIds = [...new Set(dueNotes.map(n => n.contact_id))];
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name')
        .in('id', contactIds);

      // Get conversation IDs for each contact
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, contact_id')
        .in('contact_id', contactIds);

      const contactMap = new Map(contacts?.map(c => [c.id, c]) || []);
      const conversationMap = new Map(conversations?.map(c => [c.contact_id, c]) || []);

      // Show toast for each due reminder
      for (const note of dueNotes as ContactNote[]) {
        const contact = contactMap.get(note.contact_id) as Contact | undefined;
        const conversation = conversationMap.get(note.contact_id) as Conversation | undefined;
        const contactName = contact?.name || 'Unknown Contact';
        const noteColor = note.color || 'yellow';
        const colors = NOTE_COLORS[noteColor] || NOTE_COLORS.yellow;
        
        // Mark as shown first to prevent duplicates
        await supabase
          .from('contact_notes')
          .update({ reminder_shown: true })
          .eq('id', note.id);

        // Show sticky note styled toast notification
        toast({
          duration: 15000,
          className: `${colors.bg} ${colors.border} border-2 shadow-lg`,
          description: (
            <div className="relative pt-2">
              <Pin className={`absolute -top-1 right-2 h-4 w-4 ${colors.text} rotate-45`} />
              <div className={`font-medium mb-1 ${colors.text}`}>
                📌 Reminder: {contactName}
              </div>
              <p className={`text-sm ${colors.text} opacity-90 mb-3`}>
                {note.content.length > 120 
                  ? note.content.substring(0, 120) + '...' 
                  : note.content}
              </p>
              {conversation && (
                <button
                  onClick={() => {
                    navigate(`/inbox?conversation=${conversation.id}`);
                  }}
                  className={`flex items-center gap-1.5 text-xs font-medium ${colors.text} hover:underline`}
                >
                  <MessageSquare className="h-3 w-3" />
                  Open conversation
                </button>
              )}
            </div>
          ),
        });
      }
    };

    // Check immediately on mount
    checkReminders();

    // Check every 30 seconds
    intervalRef.current = setInterval(checkReminders, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentTenant, user, toast, navigate]);
}
