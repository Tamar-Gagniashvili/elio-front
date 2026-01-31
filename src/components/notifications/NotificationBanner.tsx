import { useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, BellOff, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function NotificationBanner() {
  const { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe } = usePushNotifications();
  const [isDismissed, setIsDismissed] = useState(false);
  const { toast } = useToast();

  // Don't show if not supported, already subscribed, denied, or dismissed
  if (!isSupported || isSubscribed || permission === 'denied' || isDismissed) {
    return null;
  }

  const handleEnable = async () => {
    try {
      await subscribe();
      toast({
        title: 'Notifications enabled',
        description: 'You will receive notifications for new assignments',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to enable notifications',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Alert className="mb-4 bg-primary/5 border-primary/20">
      <Bell className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>Enable push notifications to get notified when contacts are assigned to you</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={isLoading}
          >
            {isLoading ? 'Enabling...' : 'Enable'}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function NotificationToggle() {
  const { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe } = usePushNotifications();
  const { toast } = useToast();

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe();
        toast({
          title: 'Notifications disabled',
          description: 'You will no longer receive push notifications',
        });
      } else {
        await subscribe();
        toast({
          title: 'Notifications enabled',
          description: 'You will receive notifications for new assignments',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (permission === 'denied') {
    return (
      <div className="text-sm text-muted-foreground">
        Notifications blocked. Enable in browser settings.
      </div>
    );
  }

  return (
    <Button
      variant={isSubscribed ? 'secondary' : 'outline'}
      size="sm"
      onClick={handleToggle}
      disabled={isLoading}
      className="gap-2"
    >
      {isSubscribed ? (
        <>
          <BellOff className="h-4 w-4" />
          Disable Notifications
        </>
      ) : (
        <>
          <Bell className="h-4 w-4" />
          Enable Notifications
        </>
      )}
    </Button>
  );
}
