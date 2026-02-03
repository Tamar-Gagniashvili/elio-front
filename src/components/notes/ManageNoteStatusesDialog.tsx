import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { NoteStatus, STATUS_COLORS } from './types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManageNoteStatusesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: NoteStatus[];
  onStatusesChanged: () => void;
}

export function ManageNoteStatusesDialog({
  open,
  onOpenChange,
  statuses,
  onStatusesChanged,
}: ManageNoteStatusesDialogProps) {
  const { t } = useTranslation();
  const { user, currentTenant } = useAuth();
  const { toast } = useToast();
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#3b82f6');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAddStatus = async () => {
    if (!newStatusName.trim() || !currentTenant || !user) return;

    setIsAdding(true);
    const { error } = await supabase
      .from('note_statuses')
      .insert({
        tenant_id: currentTenant.id,
        name: newStatusName.trim(),
        color: newStatusColor,
        display_order: statuses.length,
        created_by: user.id,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create status',
        variant: 'destructive',
      });
    } else {
      setNewStatusName('');
      setNewStatusColor('#3b82f6');
      onStatusesChanged();
      toast({
        title: 'Status created',
        description: `"${newStatusName}" has been added`,
      });
    }
    setIsAdding(false);
  };

  const handleDeleteStatus = async (statusId: string) => {
    setDeletingId(statusId);
    
    // First, unassign all notes from this status
    await supabase
      .from('contact_notes')
      .update({ status_id: null })
      .eq('status_id', statusId);

    const { error } = await supabase
      .from('note_statuses')
      .delete()
      .eq('id', statusId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete status',
        variant: 'destructive',
      });
    } else {
      onStatusesChanged();
      toast({
        title: 'Status deleted',
        description: 'Notes have been moved to Unassigned',
      });
    }
    setDeletingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Kanban Columns</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new status */}
          <div className="flex gap-2">
            <Input
              placeholder="New column name..."
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddStatus();
              }}
            />
            <Select value={newStatusColor} onValueChange={setNewStatusColor}>
              <SelectTrigger className="w-24">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: newStatusColor }}
                  />
                </div>
              </SelectTrigger>
              <SelectContent>
                {STATUS_COLORS.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color.value }}
                      />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddStatus} disabled={!newStatusName.trim() || isAdding}>
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {/* Existing statuses */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Existing columns ({statuses.length})
            </p>
            
            {statuses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No columns yet. Add one above to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {statuses.map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="flex-1 text-sm font-medium truncate">
                      {status.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteStatus(status.id)}
                      disabled={deletingId === status.id}
                    >
                      {deletingId === status.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
