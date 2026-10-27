import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Channel, ChannelType, CHANNEL_CONFIG } from '@/lib/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChannelBadge } from '@/components/ChannelBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings, AlertCircle, CheckCircle2, Radio } from 'lucide-react';
import { ChannelConfigDialog } from '@/components/channels/ChannelConfigDialog';
import { MetaConnectionsCard } from '@/components/channels/MetaConnectionsCard';
import { EmptyState } from '@/components/EmptyState';
import { CardListSkeleton, PageHeaderSkeleton } from '@/components/skeletons/ListSkeletons';

// Connected through Facebook Login (MetaConnectionsCard) instead of manual credentials
const META_CHANNEL_TYPES: ChannelType[] = ['messenger', 'instagram'];

export default function Channels() {
  const { t } = useTranslation();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [enabledChannelTypes, setEnabledChannelTypes] = useState<ChannelType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const { currentTenant, currentMembership } = useAuth();
  const { toast } = useToast();
  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';

  useEffect(() => {
    if (!currentTenant) return;

    const fetchData = async () => {
      // Get enabled channels for this tenant (set by super admin)
      const enabledTypes = (currentTenant.enabled_channels || ['web_chat']) as ChannelType[];
      setEnabledChannelTypes(enabledTypes);

      try {
        const data = await api.get<Channel[]>('/channels?sort_by=created_at&sort_direction=desc');
        setChannels(data);
      } catch (error) {
        console.error('Error fetching channels:', error);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [currentTenant]);

  // Get or create channel for a type
  const getChannelForType = (type: ChannelType): Channel | undefined => {
    return channels.find((c) => c.channel_type === type);
  };

  const isChannelConfigured = (channel: Channel): boolean => {
    const config = channel.config as Record<string, string> | null;
    if (!config) return false;
    
    // Web chat doesn't need config
    if (channel.channel_type === 'web_chat') return true;
    
    // Check if at least one credential field is filled
    return Object.keys(config).some((key) => config[key]?.trim());
  };

  const handleConfigureChannel = async (type: ChannelType) => {
    if (!currentTenant) return;

    let channel = getChannelForType(type);
    
    // If channel doesn't exist, create it first
    if (!channel) {
      try {
        const data = await api.post<Channel>('/channels', {
          tenant_id: currentTenant.id,
          channel_type: type,
          name: CHANNEL_CONFIG[type].label,
          is_active: false,
          config: {},
        });
        channel = data;
        setChannels((prev) => [channel!, ...prev]);
      } catch (error) {
        toast({
          title: t('common.error'),
          description: t('channels.failedToCreate'),
          variant: 'destructive',
        });
        return;
      }
    }

    setSelectedChannel(channel);
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async (config: Record<string, string>) => {
    if (!selectedChannel || !currentTenant) return;

    setIsSaving(true);
    
    try {
      // Encrypt sensitive credentials before saving
      const { data: encryptResult, error: encryptError } = await api.invoke<any>(
        'encrypt-channel-config',
        {
          body: {
            action: 'encrypt',
            channelType: selectedChannel.channel_type,
            config,
            tenantId: currentTenant.id,
          },
        }
      );

      if (encryptError) {
        console.error('Encryption error:', encryptError);
        toast({
          title: t('common.error'),
          description: t('channels.failedToEncrypt'),
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      const encryptedConfig = encryptResult?.config || config;

      try {
        await api.put(`/channels/${selectedChannel.id}`, { config: encryptedConfig });
        setChannels((prev) =>
          prev.map((c) =>
            c.id === selectedChannel.id ? { ...c, config: encryptedConfig } : c
          )
        );
        toast({
          title: t('channels.configSaved'),
          description: t('channels.configSavedDesc', { channel: CHANNEL_CONFIG[selectedChannel.channel_type].label }),
        });
        setConfigDialogOpen(false);
      } catch (error) {
        toast({
          title: t('common.error'),
          description: t('channels.failedToSave'),
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Save error:', err);
      toast({
        title: t('common.error'),
        description: t('channels.failedToSave'),
        variant: 'destructive',
      });
    }
    
    setIsSaving(false);
  };

  const toggleChannel = async (channel: Channel) => {
    // Check if channel is configured before enabling
    if (!channel.is_active && !isChannelConfigured(channel)) {
      toast({
        title: t('channels.configRequired'),
        description: t('channels.configRequiredDesc'),
        variant: 'destructive',
      });
      handleConfigureChannel(channel.channel_type);
      return;
    }

    try {
      await api.put(`/channels/${channel.id}`, { is_active: !channel.is_active });
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channel.id ? { ...c, is_active: !c.is_active } : c
        )
      );
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('channels.failedToUpdate'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 max-w-4xl mx-auto">
          <PageHeaderSkeleton />
          <CardListSkeleton count={4} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t('channels.title')}</h1>
          <p className="text-muted-foreground">
            {t('channels.subtitle')}
          </p>
        </div>

        <div className="space-y-4">
          {enabledChannelTypes.length === 0 ? (
            <EmptyState
              icon={Radio}
              title={t('channels.noChannels')}
              description={t('channels.noChannelsDesc')}
            />
          ) : (
            <>
            {enabledChannelTypes.some((type) => META_CHANNEL_TYPES.includes(type)) && (
              <MetaConnectionsCard isAdmin={isAdmin} />
            )}
            {enabledChannelTypes.filter((type) => !META_CHANNEL_TYPES.includes(type)).map((type) => {
              const channel = getChannelForType(type);
              const configured = channel ? isChannelConfigured(channel) : false;
              const isWebChat = type === 'web_chat';

              return (
                <Card key={type}>
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <ChannelBadge channelType={type} size="lg" />
                        <div className="min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <h3 className="font-semibold truncate">{CHANNEL_CONFIG[type].label}</h3>
                            {configured || isWebChat ? (
                              <Badge variant="secondary" className="text-primary">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {isWebChat ? t('common.ready') : t('common.configured')}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {t('common.notConfigured')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {channel?.name || CHANNEL_CONFIG[type].label}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 sm:gap-4 flex-wrap">
                        {channel && (
                          <Badge variant={channel.is_active ? 'default' : 'secondary'}>
                            {channel.is_active ? t('common.active') : t('common.inactive')}
                          </Badge>
                        )}
                        {isAdmin && (
                          <>
                            {channel && (configured || isWebChat) && (
                              <Switch
                                checked={channel.is_active}
                                onCheckedChange={() => toggleChannel(channel)}
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleConfigureChannel(type)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </>
          )}
        </div>

        {selectedChannel && (
          <ChannelConfigDialog
            open={configDialogOpen}
            onOpenChange={setConfigDialogOpen}
            channelType={selectedChannel.channel_type}
            currentConfig={(selectedChannel.config as Record<string, string>) || {}}
            onSave={handleSaveConfig}
            isLoading={isSaving}
          />
        )}
      </div>
    </AppLayout>
  );
}
