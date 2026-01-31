import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TenantMembership, Profile } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface EditMemberDialogProps {
  member: (TenantMembership & { profile: Profile }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const POSITIONS = [
  { value: 'trainee', label: 'Trainee' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
];

export function EditMemberDialog({ member, open, onOpenChange, onUpdate }: EditMemberDialogProps) {
  const { toast } = useToast();
  const [position, setPosition] = useState(member?.position || 'none');
  const [isSaving, setIsSaving] = useState(false);

  // Reset position when member changes
  useState(() => {
    if (member) {
      setPosition(member.position || 'none');
    }
  });

  const handleSave = async () => {
    if (!member) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('tenant_memberships')
      .update({ position: position === 'none' ? null : position })
      .eq('id', member.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update member position',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Member position updated',
      });
      onUpdate();
      onOpenChange(false);
    }
    setIsSaving(false);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Team Member</DialogTitle>
          <DialogDescription>
            Update position for {member.profile?.full_name || member.profile?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Position</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No position</SelectItem>
                {POSITIONS.map((pos) => (
                  <SelectItem key={pos.value} value={pos.value}>
                    {pos.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
