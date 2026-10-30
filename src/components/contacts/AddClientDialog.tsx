import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Contact } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (contact: Contact) => void;
}

/** Adds a client who hasn't messaged yet (walk-in or phone) as an offline contact */
export function AddClientDialog({ open, onOpenChange, onCreated }: AddClientDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentTenant } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setPhone('');
    setEmail('');
    setError(null);
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !name.trim()) return;
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError(t('contacts.invalidEmail'));
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const created = await api.post<Contact>('/contacts', {
        tenant_id: currentTenant?.id,
        channel_type: 'offline',
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      toast({ title: t('contacts.clientAdded') });
      onCreated?.(created);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{t('contacts.addClient')}</DialogTitle>
            <DialogDescription>{t('contacts.addClientDesc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="client-name">{t('contacts.clientName')}</Label>
              <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="client-phone">{t('common.phone')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="client-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-email">{t('common.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
                </div>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim()}>
              {t('contacts.addClient')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
