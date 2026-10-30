import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { api } from '@/lib/api';
import { readApiError } from '@/lib/apiErrors';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SecretInput, SetupBadge } from '@/components/settings/SettingsFormParts';

interface SmsSettingsResponse {
  sms_provider: string | null;
  is_configured: boolean;
  has_api_key: boolean;
  api_url: string;
  default_subject: string | null;
}

/** InexPhone details the clinic's SMS (reminders, payment links) are sent with */
export function SmsSettingsCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [settings, setSettings] = useState<SmsSettingsResponse | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [sender, setSender] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const apply = (data: SmsSettingsResponse) => {
    setSettings(data);
    setApiKey('');
    setSender(data.default_subject || '');
    setApiUrl(data.api_url || '');
  };

  useEffect(() => {
    api.get<SmsSettingsResponse>('/sms-settings')
      .then(apply)
      .catch((err) => setError(readApiError(err)));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const data = await api.put<SmsSettingsResponse>('/sms-settings', {
        api_key: apiKey.trim() || null,
        default_subject: sender.trim(),
        api_url: apiUrl.trim() || null,
      });
      apply(data);
      toast({ title: t('settings.sms.saved') });
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = !!sender.trim() && (!!apiKey.trim() || !!settings?.has_api_key) && !isSaving;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{t('settings.sms.title')}</CardTitle>
          <CardDescription>{t('settings.sms.description')}</CardDescription>
        </div>
        {settings && (
          <SetupBadge active={settings.is_configured} activeLabel={t('settings.payments.active')} inactiveLabel={t('settings.payments.notSetUp')} />
        )}
      </CardHeader>

      <CardContent>
        {!settings ? (
          error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sms-api-key">{t('settings.sms.apiKey')}</Label>
                <SecretInput
                  id="sms-api-key"
                  value={apiKey}
                  onChange={setApiKey}
                  placeholder={settings.has_api_key ? t('settings.payments.secretSaved') : ''}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sms-sender">{t('settings.sms.sender')}</Label>
                <Input id="sms-sender" value={sender} onChange={(e) => setSender(e.target.value)} maxLength={20} autoComplete="off" />
              </div>
              <p className="sm:col-span-2 text-xs text-muted-foreground">{t('settings.sms.help')}</p>
            </div>

            <Collapsible>
              <CollapsibleTrigger className="group flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                {t('settings.sms.advanced')}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sms-api-url">{t('settings.sms.apiUrl')}</Label>
                  <Input id="sms-api-url" type="url" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} autoComplete="off" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={!canSave}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
