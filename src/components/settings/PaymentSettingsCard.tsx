import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { readApiError } from '@/lib/apiErrors';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SecretInput, SetupBadge } from '@/components/settings/SettingsFormParts';

type Provider = 'bog' | 'flitt';

interface PaymentSettingsResponse {
  provider: Provider | null;
  is_configured: boolean;
  bog: { client_id: string | null; has_client_secret: boolean };
  flitt: { merchant_id: number | null; has_secret_key: boolean };
}

const PROVIDERS: { value: Provider; name: string; descriptionKey: string }[] = [
  { value: 'bog', name: 'Bank of Georgia', descriptionKey: 'settings.payments.bogDesc' },
  { value: 'flitt', name: 'Flitt', descriptionKey: 'settings.payments.flittDesc' },
];

/** Lets clinic admins choose BOG or Flitt and enter the merchant details payments are made with */
export function PaymentSettingsCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PaymentSettingsResponse | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [bogClientId, setBogClientId] = useState('');
  const [bogClientSecret, setBogClientSecret] = useState('');
  const [flittMerchantId, setFlittMerchantId] = useState('');
  const [flittSecretKey, setFlittSecretKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const apply = (data: PaymentSettingsResponse) => {
    setSettings(data);
    setProvider(data.provider);
    setBogClientId(data.bog.client_id || '');
    setFlittMerchantId(data.flitt.merchant_id ? String(data.flitt.merchant_id) : '');
    setBogClientSecret('');
    setFlittSecretKey('');
  };

  useEffect(() => {
    api.get<PaymentSettingsResponse>('/payment-settings')
      .then(apply)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const data = await api.put<PaymentSettingsResponse>('/payment-settings', {
        provider,
        bog_client_id: bogClientId.trim() || null,
        bog_client_secret: bogClientSecret.trim() || null,
        flitt_merchant_id: flittMerchantId.trim() ? Number(flittMerchantId.trim()) : null,
        flitt_secret_key: flittSecretKey.trim() || null,
      });
      apply(data);
      toast({ title: t('settings.payments.saved') });
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const savedSecret = provider === 'bog' ? settings?.bog.has_client_secret : settings?.flitt.has_secret_key;
  const secretPlaceholder = savedSecret ? t('settings.payments.secretSaved') : '';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{t('settings.payments.title')}</CardTitle>
          <CardDescription>{t('settings.payments.description')}</CardDescription>
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
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label>{t('settings.payments.provider')}</Label>
              <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
                {PROVIDERS.map((p) => {
                  const selected = provider === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => { setProvider(p.value); setError(null); }}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors',
                        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border',
                          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                        )}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">{t(p.descriptionKey)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {provider === 'bog' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="bog-client-id">{t('settings.payments.clientId')}</Label>
                  <Input id="bog-client-id" value={bogClientId} onChange={(e) => setBogClientId(e.target.value)} autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bog-client-secret">{t('settings.payments.clientSecret')}</Label>
                  <SecretInput id="bog-client-secret" value={bogClientSecret} onChange={setBogClientSecret} placeholder={secretPlaceholder} />
                </div>
                <p className="sm:col-span-2 text-xs text-muted-foreground">{t('settings.payments.bogHelp')}</p>
              </div>
            )}

            {provider === 'flitt' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="flitt-merchant-id">{t('settings.payments.merchantId')}</Label>
                  <Input
                    id="flitt-merchant-id"
                    inputMode="numeric"
                    value={flittMerchantId}
                    onChange={(e) => setFlittMerchantId(e.target.value.replace(/\D/g, ''))}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="flitt-secret-key">{t('settings.payments.secretKey')}</Label>
                  <SecretInput id="flitt-secret-key" value={flittSecretKey} onChange={setFlittSecretKey} placeholder={secretPlaceholder} />
                </div>
                <p className="sm:col-span-2 text-xs text-muted-foreground">{t('settings.payments.flittHelp')}</p>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end">
              <Button type="submit" disabled={!provider || isSaving}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
