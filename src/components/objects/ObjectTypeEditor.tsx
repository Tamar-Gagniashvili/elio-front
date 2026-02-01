import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ObjectType, ObjectTypeField, ObjectStatus, OBJECT_TYPE_ICONS } from '@/lib/objectTypes';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Package, Archive, Trash2 } from 'lucide-react';
import { FieldBuilder } from './FieldBuilder';
import { ObjectStatusEditor } from './ObjectStatusEditor';
import * as LucideIcons from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ObjectTypeEditorProps {
  open: boolean;
  onClose: () => void;
  objectType: ObjectType | null;
  existingFields: ObjectTypeField[];
  existingStatuses: ObjectStatus[];
  allObjectTypes: ObjectType[];
  onSave: () => void;
}

export function ObjectTypeEditor({
  open,
  onClose,
  objectType,
  existingFields,
  existingStatuses,
  allObjectTypes,
  onSave,
}: ObjectTypeEditorProps) {
  const { currentTenant, user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [namePlural, setNamePlural] = useState('');
  const [icon, setIcon] = useState('Package');
  const [fields, setFields] = useState<Partial<ObjectTypeField>[]>([]);
  const [statuses, setStatuses] = useState<Partial<ObjectStatus>[]>([]);

  const isEditing = !!objectType;

  useEffect(() => {
    if (open) {
      if (objectType) {
        setName(objectType.name);
        setNamePlural(objectType.name_plural);
        setIcon(objectType.icon);
        setFields(existingFields);
        setStatuses(existingStatuses);
      } else {
        setName('');
        setNamePlural('');
        setIcon('Package');
        setFields([]);
        setStatuses([
          { name: 'Available', color: 'green', is_default: true, display_order: 0 },
          { name: 'Reserved', color: 'yellow', is_default: false, display_order: 1 },
          { name: 'Sold', color: 'red', is_default: false, display_order: 2 },
        ]);
      }
    }
  }, [open, objectType, existingFields, existingStatuses]);

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate plural if not editing
    if (!isEditing && !namePlural) {
      setNamePlural(value + 's');
    }
  };

  const handleSave = async () => {
    if (!currentTenant?.id || !name.trim() || !namePlural.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      let typeId = objectType?.id;

      if (isEditing) {
        // Update existing type
        const { error } = await supabase
          .from('object_types')
          .update({
            name: name.trim(),
            name_plural: namePlural.trim(),
            icon,
          })
          .eq('id', objectType.id);

        if (error) throw error;
      } else {
        // Create new type
        const { data, error } = await supabase
          .from('object_types')
          .insert({
            tenant_id: currentTenant.id,
            name: name.trim(),
            name_plural: namePlural.trim(),
            icon,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw error;
        typeId = data.id;
      }

      // Handle fields
      if (typeId) {
        // Delete removed fields
        if (isEditing) {
          const existingIds = existingFields.map(f => f.id);
          const newIds = fields.filter(f => f.id).map(f => f.id);
          const deletedIds = existingIds.filter(id => !newIds.includes(id));

          if (deletedIds.length > 0) {
            await supabase
              .from('object_type_fields')
              .delete()
              .in('id', deletedIds);
          }
        }

        // Upsert fields
        for (let i = 0; i < fields.length; i++) {
          const field = fields[i];
          const fieldData = {
            tenant_id: currentTenant.id,
            object_type_id: typeId,
            name: field.name?.toLowerCase().replace(/\s+/g, '_') || '',
            label: field.label || field.name || '',
            field_type: field.field_type || 'text',
            field_config: (field.field_config || {}) as Record<string, unknown>,
            is_required: field.is_required || false,
            is_searchable: field.is_searchable !== false,
            display_order: i,
          };

          if (field.id) {
            await supabase
              .from('object_type_fields')
              .update(fieldData as any)
              .eq('id', field.id);
          } else {
            await supabase
              .from('object_type_fields')
              .insert(fieldData as any);
          }
        }

        // Handle statuses
        if (isEditing) {
          const existingStatusIds = existingStatuses.map(s => s.id);
          const newStatusIds = statuses.filter(s => s.id).map(s => s.id);
          const deletedStatusIds = existingStatusIds.filter(id => !newStatusIds.includes(id));

          if (deletedStatusIds.length > 0) {
            await supabase
              .from('object_statuses')
              .delete()
              .in('id', deletedStatusIds);
          }
        }

        // Upsert statuses
        for (let i = 0; i < statuses.length; i++) {
          const status = statuses[i];
          const statusData = {
            tenant_id: currentTenant.id,
            object_type_id: typeId,
            name: status.name || '',
            color: status.color || 'gray',
            is_default: status.is_default || false,
            display_order: i,
          };

          if (status.id) {
            await supabase
              .from('object_statuses')
              .update(statusData)
              .eq('id', status.id);
          } else {
            await supabase
              .from('object_statuses')
              .insert(statusData);
          }
        }
      }

      toast({
        title: isEditing ? 'Object Type Updated' : 'Object Type Created',
        description: `${name} has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving object type:', error);
      toast({
        title: 'Error',
        description: 'Failed to save object type. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!objectType) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('object_types')
        .update({ is_archived: true })
        .eq('id', objectType.id);

      if (error) throw error;

      toast({
        title: 'Object Type Archived',
        description: `${objectType.name} has been archived.`,
      });

      setArchiveDialogOpen(false);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error archiving object type:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive object type.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getIcon = (iconName: string) => {
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
    const Icon = icons[iconName] || Package;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? `Edit ${objectType.name}` : 'Create Object Type'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the object type configuration'
                : 'Define a new type of business object to manage'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="fields">Fields ({fields.length})</TabsTrigger>
              <TabsTrigger value="statuses">Statuses ({statuses.length})</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto py-4">
              <TabsContent value="general" className="m-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name (Singular)</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Flat"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="namePlural">Name (Plural)</Label>
                    <Input
                      id="namePlural"
                      placeholder="e.g., Flats"
                      value={namePlural}
                      onChange={(e) => setNamePlural(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="grid grid-cols-10 gap-2">
                    {OBJECT_TYPE_ICONS.map((iconName) => (
                      <Button
                        key={iconName}
                        type="button"
                        variant={icon === iconName ? 'default' : 'outline'}
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setIcon(iconName)}
                      >
                        {getIcon(iconName)}
                      </Button>
                    ))}
                  </div>
                </div>

                {isEditing && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="destructive"
                      onClick={() => setArchiveDialogOpen(true)}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Object Type
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Archived types are hidden but their data is preserved.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="fields" className="m-0">
                <FieldBuilder
                  fields={fields}
                  onChange={setFields}
                  objectTypes={allObjectTypes}
                  currentTypeId={objectType?.id}
                />
              </TabsContent>

              <TabsContent value="statuses" className="m-0">
                <ObjectStatusEditor statuses={statuses} onChange={setStatuses} />
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Object Type'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {objectType?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the object type from the list. All existing objects
              of this type will be preserved but no new ones can be created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-destructive text-destructive-foreground">
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
