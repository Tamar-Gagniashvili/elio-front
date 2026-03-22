import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { TenantMembership, Profile } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EditMemberDialogProps {
  member: (TenantMembership & { profile: Profile }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const SUGGESTED_POSITIONS = [
  'Trainee',
  'Junior',
  'Mid-Level',
  'Senior',
  'Lead',
];

export function EditMemberDialog({ member, open, onOpenChange, onUpdate }: EditMemberDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [position, setPosition] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reset position when member changes or dialog opens
  useEffect(() => {
    if (member && open) {
      setPosition(member.position || '');
    }
  }, [member, open]);

  const handleSave = async () => {
    if (!member) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('tenant_memberships')
      .update({ position: position.trim() || null })
      .eq('id', member.id);

    if (error) {
      toast({
        title: t('common.error'),
        description: t('settings.positionUpdateFailed'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('settings.success'),
        description: t('settings.positionUpdated'),
      });
      onUpdate();
      onOpenChange(false);
    }
    setIsSaving(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPosition(suggestion);
  };

  const handleClear = () => {
    setPosition('');
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.editMember')}</DialogTitle>
          <DialogDescription>
            {t('settings.editMemberDesc', { name: member.profile?.full_name || member.profile?.email })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('settings.position')}</Label>
            <div className="relative">
              <Input
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder={t('settings.enterPosition')}
              />
              {position && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={handleClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUGGESTED_POSITIONS.map((suggestion) => (
                <Badge
                  key={suggestion}
                  variant={position === suggestion ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('common.save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
