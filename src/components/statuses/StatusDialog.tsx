import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { STATUS_ICONS, StatusIndicator, getIconComponent } from '@/components/StatusIcon';
import { COLOR_HEX, STATUS_COLOR_NAMES, statusHex } from '@/components/statuses/statusColors';

export interface StatusFormValues {
  name: string;
  color: string;
  icon: string | null;
}

interface StatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Values of the status being edited; omit to create one */
  initial?: StatusFormValues | null;
  onSubmit: (values: StatusFormValues) => Promise<void>;
}

export function StatusDialog({ open, onOpenChange, initial, onSubmit }: StatusDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [useIcon, setUseIcon] = useState(false);
  const [icon, setIcon] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || '');
    setColor(initial?.color || 'blue');
    setUseIcon(!!initial?.icon);
    setIcon(initial?.icon || null);
  }, [open, initial]);

  const hex = statusHex(color);
  const canSave = !!name.trim() && (!useIcon || !!icon) && !isSaving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setIsSaving(true);
    try {
      await onSubmit({ name: name.trim(), color, icon: useIcon ? icon : null });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{initial ? t('statuses.edit') : t('statuses.newStatus')}</DialogTitle>
          </DialogHeader>

          {/* Live preview */}
          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed bg-muted/40">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-sm font-medium shadow-sm">
              <StatusIndicator icon={useIcon ? icon : null} color={hex} colorDotClass="h-2 w-2" iconClass="h-3.5 w-3.5" />
              {name.trim() || t('statuses.preview')}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status-name">{t('statuses.name')}</Label>
            <Input
              id="status-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('statuses.statusNamePlaceholder')}
              maxLength={40}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('statuses.color')}</Label>
            <div className="flex flex-wrap gap-2">
              {STATUS_COLOR_NAMES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110',
                    color === c && 'ring-2 ring-offset-2 ring-offset-background',
                  )}
                  style={{ backgroundColor: COLOR_HEX[c], ['--tw-ring-color' as string]: COLOR_HEX[c] }}
                  aria-label={c}
                >
                  {color === c && <Check className="h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="status-use-icon" className="font-normal">{t('statuses.useIcon')}</Label>
              <Switch id="status-use-icon" checked={useIcon} onCheckedChange={setUseIcon} />
            </div>
            {useIcon && (
              <div className="grid max-h-44 grid-cols-8 gap-1 overflow-y-auto rounded-lg border p-2">
                {STATUS_ICONS.map((iconName) => {
                  const Icon = getIconComponent(iconName);
                  if (!Icon) return null;
                  const selected = icon === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setIcon(iconName)}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                        selected ? 'bg-muted ring-1 ring-border' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                      style={selected ? { color: hex } : undefined}
                      aria-label={iconName}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!canSave}>
              {initial ? t('common.save') : t('statuses.createStatus')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
