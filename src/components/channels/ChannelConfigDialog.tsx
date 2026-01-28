import { useState, useEffect } from 'react';
import { ChannelType, CHANNEL_CONFIG } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChannelBadge } from '@/components/ChannelBadge';
import { ExternalLink, Eye, EyeOff } from 'lucide-react';

interface ChannelCredentialField {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'password';
  helpUrl?: string;
}

const CHANNEL_CREDENTIALS: Record<ChannelType, ChannelCredentialField[]> = {
  web_chat: [], // No credentials needed
  telegram: [
    {
      key: 'bot_token',
      label: 'Bot Token',
      placeholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
      type: 'password',
      helpUrl: 'https://core.telegram.org/bots/tutorial#obtain-your-bot-token',
    },
  ],
  whatsapp: [
    {
      key: 'access_token',
      label: 'Access Token',
      placeholder: 'EAAG...',
      type: 'password',
      helpUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
    },
    {
      key: 'phone_number_id',
      label: 'Phone Number ID',
      placeholder: '123456789012345',
      type: 'text',
    },
    {
      key: 'business_account_id',
      label: 'Business Account ID',
      placeholder: '123456789012345',
      type: 'text',
    },
  ],
  messenger: [
    {
      key: 'page_access_token',
      label: 'Page Access Token',
      placeholder: 'EAAG...',
      type: 'password',
      helpUrl: 'https://developers.facebook.com/docs/messenger-platform/getting-started',
    },
    {
      key: 'app_secret',
      label: 'App Secret',
      placeholder: 'abc123...',
      type: 'password',
    },
    {
      key: 'verify_token',
      label: 'Webhook Verify Token',
      placeholder: 'your_custom_verify_token',
      type: 'text',
    },
  ],
  instagram: [
    {
      key: 'page_access_token',
      label: 'Page Access Token',
      placeholder: 'EAAG...',
      type: 'password',
      helpUrl: 'https://developers.facebook.com/docs/instagram-api/getting-started',
    },
    {
      key: 'app_secret',
      label: 'App Secret',
      placeholder: 'abc123...',
      type: 'password',
    },
    {
      key: 'instagram_business_id',
      label: 'Instagram Business Account ID',
      placeholder: '17841400000000000',
      type: 'text',
    },
  ],
  sms: [
    {
      key: 'account_sid',
      label: 'Twilio Account SID',
      placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      type: 'text',
      helpUrl: 'https://www.twilio.com/docs/usage/api',
    },
    {
      key: 'auth_token',
      label: 'Twilio Auth Token',
      placeholder: 'your_auth_token',
      type: 'password',
    },
    {
      key: 'phone_number',
      label: 'Twilio Phone Number',
      placeholder: '+1234567890',
      type: 'text',
    },
  ],
};

interface ChannelConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelType: ChannelType;
  currentConfig: Record<string, string>;
  onSave: (config: Record<string, string>) => Promise<void>;
  isLoading?: boolean;
}

export function ChannelConfigDialog({
  open,
  onOpenChange,
  channelType,
  currentConfig,
  onSave,
  isLoading,
}: ChannelConfigDialogProps) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const fields = CHANNEL_CREDENTIALS[channelType];

  useEffect(() => {
    if (open) {
      setConfig(currentConfig || {});
      setShowPasswords({});
    }
  }, [open, currentConfig]);

  const handleSave = async () => {
    await onSave(config);
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isConfigured = fields.every((field) => config[field.key]?.trim());

  if (fields.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChannelBadge channelType={channelType} size="sm" />
              Configure {CHANNEL_CONFIG[channelType].label}
            </DialogTitle>
            <DialogDescription>
              Web Chat doesn't require any credentials. It's ready to use!
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              You can embed the chat widget on your website by adding the widget script to your site.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChannelBadge channelType={channelType} size="sm" />
            Configure {CHANNEL_CONFIG[channelType].label}
          </DialogTitle>
          <DialogDescription>
            Enter your API credentials to connect this channel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor={field.key}>{field.label}</Label>
                {field.helpUrl && (
                  <a
                    href={field.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    Get this <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="relative">
                <Input
                  id={field.key}
                  type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={config[field.key] || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  className="pr-10"
                />
                {field.type === 'password' && (
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(field.key)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords[field.key] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
