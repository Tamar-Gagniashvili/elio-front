import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { ObjectType, ObjectTypeField, ObjectStatus, BusinessObject } from '@/lib/objectTypes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { DynamicFieldInput } from './DynamicFieldInput';

interface ObjectEditorProps {
  open: boolean;
  onClose: () => void;
  objectType: ObjectType;
  fields: ObjectTypeField[];
  statuses: ObjectStatus[];
  object: BusinessObject | null;
  onSave: () => void;
}

export function ObjectEditor({
  open,
  onClose,
  objectType,
  fields,
  statuses,
  object,
  onSave,
}: ObjectEditorProps) {
  const { currentTenant, user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [statusId, setStatusId] = useState('');
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});

  const isEditing = !!object;
  const defaultStatus = statuses.find((s) => s.is_default);

  useEffect(() => {
    if (open) {
      if (object) {
        setDisplayName(object.display_name);
        setStatusId(object.status_id || '');
        setMetadata(object.metadata || {});
      } else {
        setDisplayName('');
        setStatusId(defaultStatus?.id || '');
        setMetadata({});
      }
    }
  }, [open, object, defaultStatus]);

  const updateMetadata = (fieldName: string, value: unknown) => {
    setMetadata((prev) => ({ ...prev, [fieldName]: value }));
  };

  const validateForm = (): boolean => {
    if (!displayName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Display name is required.',
        variant: 'destructive',
      });
      return false;
    }

    // Check required fields
    for (const field of fields.filter((f) => f.is_required)) {
      const value = metadata[field.name];
      if (value === undefined || value === null || value === '') {
        toast({
          title: 'Validation Error',
          description: `${field.label} is required.`,
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!currentTenant?.id || !validateForm()) return;

    setSaving(true);
    try {
      const objectData = {
        object_type_id: objectType.id,
        display_name: displayName.trim(),
        status_id: statusId || defaultStatus?.id || null,
        metadata: metadata as Record<string, unknown>,
        created_by: user?.id,
      };

      if (isEditing) {
        await api.put(`/relink-objects/${object.id}`, objectData);
      } else {
        await api.post(`/relink-objects`, objectData);
      }

      toast({
        title: isEditing ? 'Object Updated' : 'Object Created',
        description: `${displayName} has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });

      onSave();
    } catch (error) {
      console.error('Error saving object:', error);
      toast({
        title: 'Error',
        description: 'Failed to save object. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (color: string) => {
    const colors: Record<string, string> = {
      gray: 'bg-gray-500',
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      yellow: 'bg-yellow-500',
      green: 'bg-green-500',
      blue: 'bg-blue-500',
      purple: 'bg-purple-500',
      pink: 'bg-pink-500',
    };
    return colors[color] || colors.gray;
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit ${objectType.name}` : `New ${objectType.name}`}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the object details'
              : `Create a new ${objectType.name.toLowerCase()}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Name *</Label>
            <Input
              id="displayName"
              placeholder={`e.g., ${objectType.name} #1`}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          {statuses.length > 0 && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${getStatusColor(status.color)}`} />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {fields.length > 0 && (
            <div className="space-y-4 pt-2 border-t">
              <h4 className="font-medium text-sm text-muted-foreground">Custom Fields</h4>
              {fields.map((field) => (
                <DynamicFieldInput
                  key={field.id}
                  field={field}
                  value={metadata[field.name]}
                  onChange={(value) => updateMetadata(field.name, value)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : `Create ${objectType.name}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
