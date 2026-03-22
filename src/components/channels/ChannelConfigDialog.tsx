import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChannelType, CHANNEL_CONFIG } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
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
import { ExternalLink, Eye, EyeOff, Copy, Check } from 'lucide-react';

interface ChannelCredentialField {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'password';
  helpUrl?: string;
}

const CHANNEL_CREDENTIALS: Record<ChannelType, ChannelCredentialField[]> = {
  web_chat: [],
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
    {
      key: 'verify_token',
      label: 'Webhook Verify Token',
      placeholder: 'your_custom_verify_token',
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
    {
      key: 'verify_token',
      label: 'Webhook Verify Token',
      placeholder: 'your_custom_verify_token',
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
  offline: [], // No credentials needed for imported leads
  tiktok: [
    {
      key: 'access_token',
      label: 'TikTok Access Token',
      placeholder: 'act.xxxxxxxxxxxx',
      type: 'password',
      helpUrl: 'https://developers.tiktok.com/doc/login-kit-web',
    },
    {
      key: 'business_id',
      label: 'TikTok Business ID',
      placeholder: '7xxxxxxxxxxxxxxxxxx',
      type: 'text',
    },
    {
      key: 'app_id',
      label: 'TikTok App ID',
      placeholder: '7xxxxxxxxxxxxxxxxxx',
      type: 'text',
    },
    {
      key: 'app_secret',
      label: 'TikTok App Secret',
      placeholder: 'xxxxxxxxxxxxxxxxxxxx',
      type: 'password',
    },
  ],
  email: [
    {
      key: 'imap_host',
      label: 'IMAP Host',
      placeholder: 'imap.gmail.com',
      type: 'text',
      helpUrl: 'https://support.google.com/mail/answer/7126229',
    },
    {
      key: 'imap_port',
      label: 'IMAP Port',
      placeholder: '993',
      type: 'text',
    },
    {
      key: 'smtp_host',
      label: 'SMTP Host',
      placeholder: 'smtp.gmail.com',
      type: 'text',
    },
    {
      key: 'smtp_port',
      label: 'SMTP Port',
      placeholder: '587',
      type: 'text',
    },
    {
      key: 'email_address',
      label: 'Email Address',
      placeholder: 'support@yourcompany.com',
      type: 'text',
    },
    {
      key: 'email_password',
      label: 'Email Password / App Password',
      placeholder: 'xxxx xxxx xxxx xxxx',
      type: 'password',
    },
  ],
};

const getWebhookUrl = (channelType: ChannelType, tenantId: string): string | null => {
  const baseUrl = 'https://mnsbodgadunlsqbirevx.supabase.co/functions/v1';
  
  switch (channelType) {
    case 'telegram':
      return `${baseUrl}/webhook-telegram?tenant_id=${tenantId}`;
    case 'whatsapp':
      return `${baseUrl}/webhook-whatsapp?tenant_id=${tenantId}`;
    case 'messenger':
      return `${baseUrl}/webhook-messenger?tenant_id=${tenantId}`;
    case 'instagram':
      return `${baseUrl}/webhook-instagram?tenant_id=${tenantId}`;
    case 'tiktok':
      return `${baseUrl}/webhook-tiktok?tenant_id=${tenantId}`;
    case 'email':
      return `${baseUrl}/webhook-email?tenant_id=${tenantId}`;
    default:
      return null;
  }
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
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const { currentTenant } = useAuth();
  const { t } = useTranslation();

  const fields = CHANNEL_CREDENTIALS[channelType];
  const webhookUrl = currentTenant ? getWebhookUrl(channelType, currentTenant.id) : null;

  useEffect(() => {
    if (open) {
      setConfig(currentConfig || {});
      setShowPasswords({});
      setCopiedWebhook(false);
    }
  }, [open, currentConfig]);

  const handleSave = async () => {
    await onSave(config);
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyWebhookUrl = async () => {
    if (webhookUrl) {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  const getEmbedCode = (tenantId: string): string => {
    const baseUrl = window.location.origin;
    return `<!-- ChatFlow Widget -->
<script>
  window.ChatFlowConfig = {
    tenantId: '${tenantId}',
    position: 'bottom-right',
    primaryColor: '#6366f1'
  };
</script>
<script src="${baseUrl}/chat-widget.js" defer></script>`;
  };

  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const copyEmbedCode = async () => {
    if (currentTenant) {
      await navigator.clipboard.writeText(getEmbedCode(currentTenant.id));
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    }
  };

  if (fields.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChannelBadge channelType={channelType} size="sm" />
              {t('channels.configureChannel', { channel: CHANNEL_CONFIG[channelType].label })}
            </DialogTitle>
            <DialogDescription>
              {t('channels.webChatReady')}
            </DialogDescription>
          </DialogHeader>
          
          {currentTenant && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">{t('channels.embedCode')}</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  {t('channels.embedCodeDesc')}
                </p>
              </div>
              <div className="relative">
                <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                  {getEmbedCode(currentTenant.id)}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyEmbedCode}
                  className="absolute top-2 right-2"
                >
                  {copiedEmbed ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      {t('channels.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      {t('channels.copy')}
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>{t('common.note')}:</strong> {t('channels.embedNote')}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChannelBadge channelType={channelType} size="sm" />
            {t('channels.configureChannel', { channel: CHANNEL_CONFIG[channelType].label })}
          </DialogTitle>
          <DialogDescription>
            {t('channels.enterCredentials')}
          </DialogDescription>
        </DialogHeader>

        {webhookUrl && (
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <Label className="text-sm font-medium">{t('channels.webhookUrl')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('channels.webhookUrlDesc', { channel: CHANNEL_CONFIG[channelType].label })}
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="text-xs font-mono bg-background"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyWebhookUrl}
                className="shrink-0"
              >
                {copiedWebhook ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4 py-2">
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
