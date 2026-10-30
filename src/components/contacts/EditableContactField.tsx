import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Pencil, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { CONTACT_UPDATED_EVENT, saveContactDetails } from '@/lib/contactEvents';
import type { Contact } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface EditableContactFieldProps {
  contactId: string;
  field: 'phone' | 'email';
  value?: string | null;
  icon: LucideIcon;
  placeholder: string;
}

/** Click-to-edit contact detail: Enter or blur saves, Escape cancels */
export function EditableContactField({ contactId, field, value, icon: Icon, placeholder }: EditableContactFieldProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [current, setCurrent] = useState(value ?? '');
  const [draft, setDraft] = useState(current);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrent(value ?? '');
  }, [value, contactId]);

  // Stay in sync when the same contact is edited elsewhere (e.g. the booking form)
  useEffect(() => {
    const onUpdated = (e: Event) => {
      const updated = (e as CustomEvent<Contact>).detail;
      if (updated?.id === contactId) setCurrent(updated[field] ?? '');
    };
    window.addEventListener(CONTACT_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(CONTACT_UPDATED_EVENT, onUpdated);
  }, [contactId, field]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const startEditing = () => {
    setDraft(current);
    setIsEditing(true);
  };

  const save = async () => {
    // Enter disables the input, which can fire blur: don't save twice
    if (isSaving) return;
    const next = draft.trim();
    if (next === current) {
      setIsEditing(false);
      return;
    }
    if (field === 'email' && next && !/^\S+@\S+\.\S+$/.test(next)) {
      toast({ title: t('contacts.invalidEmail'), variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await saveContactDetails(api, contactId, { [field]: next || null });
      setCurrent(next);
      setIsEditing(false);
    } catch (error) {
      console.error(`Error saving contact ${field}:`, error);
      toast({ title: t('errors.somethingWentWrong'), variant: 'destructive' });
    }
    setIsSaving(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type={field === 'email' ? 'email' : 'tel'}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            placeholder={placeholder}
            disabled={isSaving}
            className="h-8 pr-8 text-sm"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </span>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={startEditing}
      className="group flex items-center gap-3 w-full rounded-md -mx-1.5 px-1.5 py-1 text-sm text-left hover:bg-muted/60 transition-colors"
    >
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className={cn('flex-1 truncate', !current && 'text-muted-foreground')}>{current || placeholder}</span>
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
