import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ContactNote {
  id: string;
  contact_id: string;
  tenant_id: string;
  content: string;
  reminder_at: string;
  reminder_shown: boolean;
}

interface Contact {
  id: string;
  name: string | null;
}

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

      const contactMap = new Map(contacts?.map(c => [c.id, c]) || []);

      // Show toast for each due reminder
      for (const note of dueNotes as ContactNote[]) {
        const contact = contactMap.get(note.contact_id) as Contact | undefined;
        const contactName = contact?.name || 'Unknown Contact';
        
        // Mark as shown first to prevent duplicates
        await supabase
          .from('contact_notes')
          .update({ reminder_shown: true })
          .eq('id', note.id);

        // Show toast notification
        toast({
          title: `Reminder: ${contactName}`,
          description: note.content.length > 100 
            ? note.content.substring(0, 100) + '...' 
            : note.content,
          duration: 10000, // 10 seconds
          action: (
            <button
              onClick={() => {
                // Navigate to inbox - the contact will need to be selected manually
                // Could be improved with query params in future
                navigate('/inbox');
              }}
              className="shrink-0 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              View Contact
            </button>
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
