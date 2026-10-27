import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { ChannelBadge } from '@/components/ChannelBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';

interface MetaConnection {
  id: string;
  page_id: string;
  page_name: string | null;
  instagram_account_id: string | null;
  instagram_username: string | null;
}

interface MetaConnectionsCardProps {
  isAdmin: boolean;
}

/**
 * Messenger + Instagram via Facebook Login for Business: one login connects the
 * tenant's Pages and their linked Instagram accounts, no credentials to paste.
 */
export function MetaConnectionsCard({ isAdmin }: MetaConnectionsCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        setConnections(await api.get<MetaConnection[]>('/meta/connections'));
      } catch (error) {
        console.error('Error fetching Meta connections:', error);
      }
      setIsLoading(false);
    };

    fetchConnections();
  }, []);

  // Result of the Facebook Login redirect (?meta=connected|cancelled|error)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('meta');
    if (!status) return;

    const error = params.get('meta_error');
    if (status === 'connected') {
      toast({
        title: t('channels.metaConnected'),
        description: t('channels.metaConnectedDesc', { count: Number(params.get('meta_pages') || 0) }),
      });
      if (error) toast({ title: t('common.error'), description: error, variant: 'destructive' });
    } else if (status === 'error') {
      toast({ title: t('common.error'), description: error || t('channels.metaConnectFailed'), variant: 'destructive' });
    }

    ['meta', 'meta_pages', 'meta_error'].forEach((key) => params.delete(key));
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, [t, toast]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { url } = await api.get<{ url: string }>(
        `/meta/connect-url?return_url=${encodeURIComponent(window.location.href.split('?')[0])}`
      );
      window.location.href = url;
    } catch (error) {
      console.error('Error starting Facebook Login:', error);
      toast({ title: t('common.error'), description: t('channels.metaConnectFailed'), variant: 'destructive' });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (connection: MetaConnection) => {
    setRemovingId(connection.id);
    try {
      await api.delete(`/meta/connections/${connection.id}`);
      setConnections((prev) => prev.filter((c) => c.id !== connection.id));
    } catch (error) {
      toast({ title: t('common.error'), description: t('channels.failedToUpdate'), variant: 'destructive' });
    }
    setRemovingId(null);
  };

  const connected = connections.length > 0;

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex -space-x-2">
              <ChannelBadge channelType="messenger" size="lg" />
              <ChannelBadge channelType="instagram" size="lg" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h3 className="font-semibold truncate">{t('channels.metaTitle')}</h3>
                {connected ? (
                  <Badge variant="secondary" className="text-primary">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t('channels.connected')}
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {t('common.notConfigured')}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{t('channels.metaDesc')}</p>
            </div>
          </div>

          {isAdmin && (
            <Button onClick={handleConnect} disabled={isConnecting || isLoading} className="shrink-0">
              {isConnecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {connected ? t('channels.metaAddMore') : t('channels.metaConnect')}
            </Button>
          )}
        </div>

        {connected && (
          <ul className="divide-y rounded-md border">
            {connections.map((connection) => (
              <li key={connection.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0 text-sm">
                  <p className="font-medium truncate">{connection.page_name || connection.page_id}</p>
                  <p className="text-muted-foreground truncate">
                    {connection.instagram_username
                      ? `Messenger · Instagram @${connection.instagram_username}`
                      : `Messenger · ${t('channels.metaNoInstagram')}`}
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('channels.metaDisconnect')}
                    disabled={removingId === connection.id}
                    onClick={() => handleDisconnect(connection)}
                  >
                    {removingId === connection.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
