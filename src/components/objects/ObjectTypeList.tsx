import { useState } from 'react';
import { ObjectType, ObjectTypeField, ObjectStatus, OBJECT_TYPE_ICONS } from '@/lib/objectTypes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Settings, Archive, Package } from 'lucide-react';
import { ObjectTypeEditor } from './ObjectTypeEditor';
import * as LucideIcons from 'lucide-react';

interface ObjectTypeListProps {
  objectTypes: ObjectType[];
  fields: Record<string, ObjectTypeField[]>;
  statuses: Record<string, ObjectStatus[]>;
  onRefresh: () => void;
}

export function ObjectTypeList({ objectTypes, fields, statuses, onRefresh }: ObjectTypeListProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingType, setEditingType] = useState<ObjectType | null>(null);

  const handleCreate = () => {
    setEditingType(null);
    setEditorOpen(true);
  };

  const handleEdit = (type: ObjectType) => {
    setEditingType(type);
    setEditorOpen(true);
  };

  const handleClose = () => {
    setEditorOpen(false);
    setEditingType(null);
  };

  const getIcon = (iconName: string) => {
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
    const Icon = icons[iconName] || Package;
    return <Icon className="h-6 w-6" />;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold">Object Types</h2>
          <p className="text-sm text-muted-foreground">
            Define the types of items your business manages
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Object Type
        </Button>
      </div>

      {objectTypes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Object Types Yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create your first object type to start managing inventory.<br />
              Examples: Flats, Cars, Parcels, Orders
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Object Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {objectTypes.map((type) => (
            <Card key={type.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {getIcon(type.icon)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{type.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {type.name_plural}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(type)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{fields[type.id]?.length || 0} fields</span>
                  <span>•</span>
                  <span>{statuses[type.id]?.length || 0} statuses</span>
                </div>
                {statuses[type.id]?.length > 0 && (
                  <div className="flex gap-1 mt-3 flex-wrap">
                    {statuses[type.id].slice(0, 4).map((status) => (
                      <span
                        key={status.id}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white bg-${status.color}-500`}
                        style={{
                          backgroundColor: `var(--${status.color}-500, ${getColorHex(status.color)})`
                        }}
                      >
                        {status.name}
                      </span>
                    ))}
                    {(statuses[type.id]?.length || 0) > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{statuses[type.id].length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ObjectTypeEditor
        open={editorOpen}
        onClose={handleClose}
        objectType={editingType}
        existingFields={editingType ? fields[editingType.id] || [] : []}
        existingStatuses={editingType ? statuses[editingType.id] || [] : []}
        allObjectTypes={objectTypes}
        onSave={onRefresh}
      />
    </div>
  );
}

function getColorHex(color: string): string {
  const colors: Record<string, string> = {
    gray: '#6b7280',
    red: '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
    green: '#22c55e',
    blue: '#3b82f6',
    purple: '#a855f7',
    pink: '#ec4899',
  };
  return colors[color] || colors.gray;
}
