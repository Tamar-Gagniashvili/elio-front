import { ObjectStatus, STATUS_COLORS } from '@/lib/objectTypes';
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
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Star } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ObjectStatusEditorProps {
  statuses: Partial<ObjectStatus>[];
  onChange: (statuses: Partial<ObjectStatus>[]) => void;
}

export function ObjectStatusEditor({ statuses, onChange }: ObjectStatusEditorProps) {
  const addStatus = () => {
    const newStatus: Partial<ObjectStatus> = {
      name: '',
      color: 'gray',
      is_default: statuses.length === 0,
      display_order: statuses.length,
    };
    onChange([...statuses, newStatus]);
  };

  const updateStatus = (index: number, updates: Partial<ObjectStatus>) => {
    const newStatuses = [...statuses];
    newStatuses[index] = { ...newStatuses[index], ...updates };
    onChange(newStatuses);
  };

  const removeStatus = (index: number) => {
    const newStatuses = statuses.filter((_, i) => i !== index);
    // If we removed the default, make the first one default
    if (statuses[index].is_default && newStatuses.length > 0) {
      newStatuses[0].is_default = true;
    }
    onChange(newStatuses);
  };

  const setDefault = (index: number) => {
    const newStatuses = statuses.map((s, i) => ({
      ...s,
      is_default: i === index,
    }));
    onChange(newStatuses);
  };

  const getColorClass = (color: string) => {
    return STATUS_COLORS.find((c) => c.value === color)?.class || 'bg-gray-500';
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">Statuses</h3>
          <p className="text-sm text-muted-foreground">
            Define availability or progress states for objects
          </p>
        </div>
        <Button onClick={addStatus} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Status
        </Button>
      </div>

      {statuses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground mb-3">
              No statuses defined yet
            </p>
            <Button onClick={addStatus} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add First Status
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {statuses.map((status, index) => (
            <Card key={index}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  
                  <div
                    className={`h-4 w-4 rounded-full ${getColorClass(status.color || 'gray')}`}
                  />

                  <Input
                    placeholder="Status name..."
                    value={status.name || ''}
                    onChange={(e) => updateStatus(index, { name: e.target.value })}
                    className="flex-1"
                  />

                  <Select
                    value={status.color || 'gray'}
                    onValueChange={(value) => updateStatus(index, { color: value })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_COLORS.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${color.class}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant={status.is_default ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDefault(index)}
                    title="Set as default status"
                  >
                    <Star className={`h-4 w-4 ${status.is_default ? 'fill-current' : ''}`} />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeStatus(index)}
                    disabled={statuses.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        The starred status will be automatically assigned to new objects.
      </p>
    </div>
  );
}
