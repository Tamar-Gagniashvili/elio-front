import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Channel, ChannelType, CHANNEL_CONFIG } from '@/lib/types';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChannelBadge } from '@/components/ChannelBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Settings, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const availableChannels: { type: ChannelType; description: string; difficulty: string }[] = [
  { type: 'web_chat', description: 'Embed a chat widget on your website', difficulty: 'Easy' },
  { type: 'telegram', description: 'Connect your Telegram bot', difficulty: 'Medium' },
  { type: 'whatsapp', description: 'WhatsApp Business API integration', difficulty: 'Advanced' },
  { type: 'messenger', description: 'Facebook Messenger for business', difficulty: 'Advanced' },
  { type: 'instagram', description: 'Instagram Direct Messages', difficulty: 'Advanced' },
  { type: 'sms', description: 'SMS via Twilio or similar', difficulty: 'Medium' },
];

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ChannelType | null>(null);
  const [channelName, setChannelName] = useState('');
  
  const { currentTenant, currentMembership } = useAuth();
  const { toast } = useToast();
  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';

  useEffect(() => {
    if (!currentTenant) return;

    const fetchChannels = async () => {
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

    fetchChannels();
  }, [currentTenant]);

  const handleAddChannel = async () => {
    if (!currentTenant || !selectedType || !channelName.trim()) return;

    const { data, error } = await supabase
      .from('channels')
      .insert({
        tenant_id: currentTenant.id,
        channel_type: selectedType,
        name: channelName.trim(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add channel',
        variant: 'destructive',
      });
    } else {
      setChannels((prev) => [data as Channel, ...prev]);
      setIsAddDialogOpen(false);
      setSelectedType(null);
      setChannelName('');
      toast({
        title: 'Channel added',
        description: `${CHANNEL_CONFIG[selectedType].label} channel has been added`,
      });
    }
  };

  const toggleChannel = async (channel: Channel) => {
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

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Channels</h1>
            <p className="text-muted-foreground">
              Connect messaging channels to receive customer conversations
            </p>
          </div>
          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Channel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add a new channel</DialogTitle>
                  <DialogDescription>
                    Connect a messaging platform to receive customer messages
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    {availableChannels.map((ch) => (
                      <button
                        key={ch.type}
                        onClick={() => {
                          setSelectedType(ch.type);
                          setChannelName(CHANNEL_CONFIG[ch.type].label);
                        }}
                        className={`p-3 border rounded-lg text-left transition-colors ${
                          selectedType === ch.type
                            ? 'border-primary bg-accent'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <ChannelBadge channelType={ch.type} size="sm" />
                          <span className="font-medium text-sm">
                            {CHANNEL_CONFIG[ch.type].label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{ch.description}</p>
                        <Badge variant="secondary" className="mt-2 text-[10px]">
                          {ch.difficulty}
                        </Badge>
                      </button>
                    ))}
                  </div>

                  {selectedType && (
                    <div className="space-y-2 pt-2">
                      <Label>Channel Name</Label>
                      <Input
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                        placeholder="e.g., Website Chat"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddChannel} disabled={!selectedType || !channelName.trim()}>
                    Add Channel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="space-y-4">
          {channels.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-1">No channels configured</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first channel to start receiving messages
                </p>
                {isAdmin && (
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Channel
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            channels.map((channel) => (
              <Card key={channel.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <ChannelBadge channelType={channel.channel_type} size="lg" />
                      <div>
                        <h3 className="font-semibold">{channel.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {CHANNEL_CONFIG[channel.channel_type].label}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge variant={channel.is_active ? 'default' : 'secondary'}>
                        {channel.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {isAdmin && (
                        <>
                          <Switch
                            checked={channel.is_active}
                            onCheckedChange={() => toggleChannel(channel)}
                          />
                          <Button variant="ghost" size="icon">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
