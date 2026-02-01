import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Channel, ChannelType, CHANNEL_CONFIG } from '@/lib/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChannelBadge } from '@/components/ChannelBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { ChannelConfigDialog } from '@/components/channels/ChannelConfigDialog';

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

      // Fetch existing channel configurations
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching channels:', error);
      } else {
        setChannels(data as Channel[]);
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
      const { data, error } = await supabase
        .from('channels')
        .insert({
          tenant_id: currentTenant.id,
          channel_type: type,
          name: CHANNEL_CONFIG[type].label,
          is_active: false,
          config: {},
        })
        .select()
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create channel',
          variant: 'destructive',
        });
        return;
      }
      channel = data as Channel;
      setChannels((prev) => [channel!, ...prev]);
    }

    setSelectedChannel(channel);
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async (config: Record<string, string>) => {
    if (!selectedChannel || !currentTenant) return;

    setIsSaving(true);
    
    try {
      // Encrypt sensitive credentials before saving
      const { data: encryptResult, error: encryptError } = await supabase.functions.invoke(
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
          title: 'Error',
          description: 'Failed to encrypt credentials',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      const encryptedConfig = encryptResult?.config || config;

      const { error } = await supabase
        .from('channels')
        .update({ config: encryptedConfig })
        .eq('id', selectedChannel.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to save configuration',
          variant: 'destructive',
        });
      } else {
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
      }
    } catch (err) {
      console.error('Save error:', err);
      toast({
        title: 'Error',
        description: 'Failed to save configuration',
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

    const { error } = await supabase
      .from('channels')
      .update({ is_active: !channel.is_active })
      .eq('id', channel.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update channel',
        variant: 'destructive',
      });
    } else {
      setChannels((prev) =>
        prev.map((c) =>
          c.id === channel.id ? { ...c, is_active: !c.is_active } : c
        )
      );
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{t('channels.title')}</h1>
          <p className="text-muted-foreground">
            {t('channels.subtitle')}
          </p>
        </div>

        <div className="space-y-4">
          {enabledChannelTypes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-1">{t('channels.noChannels')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('channels.noChannelsDesc')}
                </p>
              </CardContent>
            </Card>
          ) : (
            enabledChannelTypes.map((type) => {
              const channel = getChannelForType(type);
              const configured = channel ? isChannelConfigured(channel) : false;
              const isWebChat = type === 'web_chat';

              return (
                <Card key={type}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <ChannelBadge channelType={type} size="lg" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{CHANNEL_CONFIG[type].label}</h3>
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
                          <p className="text-sm text-muted-foreground">
                            {channel?.name || CHANNEL_CONFIG[type].label}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
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
            })
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
