import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, format } from 'date-fns';
import { AlertCircle, MessageSquareText } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { readApiError } from '@/lib/apiErrors';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PAYMENT_SETTINGS_CHANGED_EVENT } from '@/components/settings/settingsEvents';

interface AdvancePaymentResponse {
  is_configured: boolean;
  sms_configured: boolean;
  advance_payment: {
    enabled: boolean;
    hours_before: number;
    message: string | null;
  };
}

const HOUR_PRESETS = [2, 12, 24, 48];
const PLACEHOLDERS = ['client', 'specialist', 'date', 'time', 'amount', 'link'] as const;

/** Pay in advance: text clients a payment link some hours before their session */
export function AdvancePaymentCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [data, setData] = useState<AdvancePaymentResponse | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [hours, setHours] = useState('24');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const apply = useCallback((res: AdvancePaymentResponse) => {
    setData(res);
    setEnabled(res.advance_payment.enabled);
    setHours(String(res.advance_payment.hours_before));
    setMessage(res.advance_payment.message || t('settings.advance.defaultMessage'));
  }, [t]);

  const load = useCallback(() => {
    api.get<AdvancePaymentResponse>('/payment-settings')
      .then(apply)
      .catch((err) => setError(readApiError(err)));
  }, [apply]);

  useEffect(() => {
    load();
    // The provider card above may have just been set up
    window.addEventListener(PAYMENT_SETTINGS_CHANGED_EVENT, load);
    return () => window.removeEventListener(PAYMENT_SETTINGS_CHANGED_EVENT, load);
  }, [load]);

  const insertPlaceholder = (name: string) => {
    const token = `{${name}}`;
    const el = messageRef.current;
    if (!el) {
      setMessage((m) => m + token);
      return;
    }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    setMessage(message.slice(0, start) + token + message.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await api.put<AdvancePaymentResponse>('/payment-settings/advance-payment', {
        enabled,
        hours_before: Number(hours) || 24,
        message: message.trim() || null,
      });
      apply(res);
      toast({ title: t('settings.advance.saved') });
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const sampleStart = addDays(new Date(), 1);
  const sampleValues: Record<string, string> = {
    client: t('settings.advance.sampleClient'),
    specialist: t('settings.advance.sampleSpecialist'),
    date: format(sampleStart, 'dd.MM.yyyy'),
    time: '12:00',
    amount: '100.00',
    link: 'https://pay.example/…',
  };
  const preview = message.replace(/\{(\w+)\}/g, (token, name: string) => sampleValues[name] ?? token);

  const missingLink = enabled && !message.includes('{link}');
  const canSave = !isSaving && !missingLink && (!enabled || (!!data?.is_configured && !!message.trim()));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>{t('settings.advance.title')}</CardTitle>
          <CardDescription>{t('settings.advance.description')}</CardDescription>
        </div>
        {data && (
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            disabled={!data.is_configured && !enabled}
            aria-label={t('settings.advance.title')}
          />
        )}
      </CardHeader>

      <CardContent>
        {!data ? (
          error ? <p className="text-sm text-destructive">{error}</p> : <Skeleton className="h-24 w-full" />
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {!data.is_configured && (
              <Notice>{t('settings.advance.needsProvider')}</Notice>
            )}
            {data.is_configured && !data.sms_configured && (
              <Notice>{t('settings.advance.needsSms')}</Notice>
            )}

            <fieldset disabled={!enabled} className={cn('space-y-6 transition-opacity', !enabled && 'opacity-50')}>
              <div className="grid gap-6">
                <div className="space-y-1.5">
                  <Label htmlFor="advance-hours">{t('settings.advance.hoursBefore')}</Label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {HOUR_PRESETS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHours(String(h))}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs transition-colors',
                          hours === String(h)
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {t('settings.advance.hours', { count: h })}
                      </button>
                    ))}
                    <Input
                      id="advance-hours"
                      inputMode="numeric"
                      value={hours}
                      onChange={(e) => setHours(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      className="h-8 w-20"
                      aria-label={t('settings.advance.hoursBefore')}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{t('settings.advance.priceFromBooking')}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="advance-message">{t('settings.advance.message')}</Label>
                <Textarea
                  id="advance-message"
                  ref={messageRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={600}
                  className="min-h-[96px] resize-none"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{t('settings.advance.insert')}</span>
                  {PLACEHOLDERS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => insertPlaceholder(p)}
                      className={cn(
                        'rounded-md border bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] hover:bg-muted',
                        p === 'link' && missingLink && 'border-destructive text-destructive',
                      )}
                    >
                      {`{${p}}`}
                    </button>
                  ))}
                </div>
                {missingLink && <p className="text-xs text-destructive">{t('settings.advance.needsLink')}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-muted-foreground">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  {t('settings.advance.preview')}
                </Label>
                <div className="max-w-md rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words">
                  {preview}
                </div>
              </div>
            </fieldset>

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

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}
