import { useReminderNotifications } from '@/hooks/useReminderNotifications';

export function ReminderNotificationProvider({ children }: { children: React.ReactNode }) {
  useReminderNotifications();
  return <>{children}</>;
}
