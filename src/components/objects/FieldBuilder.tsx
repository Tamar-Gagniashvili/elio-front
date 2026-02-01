import { useState } from 'react';
import { ObjectType, ObjectTypeField, ObjectFieldType, FIELD_TYPES, CURRENCIES } from '@/lib/objectTypes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Trash2, GripVertical, ChevronDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FieldBuilderProps {
  fields: Partial<ObjectTypeField>[];
  onChange: (fields: Partial<ObjectTypeField>[]) => void;
  objectTypes?: ObjectType[];
  currentTypeId?: string;
}

export function FieldBuilder({ fields, onChange, objectTypes = [], currentTypeId }: FieldBuilderProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const addField = () => {
    const newField: Partial<ObjectTypeField> = {
      name: '',
      label: '',
      field_type: 'text',
      field_config: {},
      is_required: false,
      is_searchable: true,
      display_order: fields.length,
    };
    onChange([...fields, newField]);
    setExpandedIndex(fields.length);
  };

  const updateField = (index: number, updates: Partial<ObjectTypeField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };

    // Auto-generate name from label
    if (updates.label && !newFields[index].name) {
      newFields[index].name = updates.label.toLowerCase().replace(/\s+/g, '_');
    }

    onChange(newFields);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const moveField = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= fields.length) return;

    const newFields = [...fields];
    [newFields[fromIndex], newFields[toIndex]] = [newFields[toIndex], newFields[fromIndex]];
    onChange(newFields);
  };

  const getFieldTypeLabel = (type: ObjectFieldType, config?: ObjectTypeField['field_config']) => {
    if (type === 'object' && config?.related_object_type_id) {
      const relatedType = objectTypes.find((t) => t.id === config.related_object_type_id);
      return relatedType ? `→ ${relatedType.name}` : 'Object';
    }
    return FIELD_TYPES.find((t) => t.value === type)?.label || type;
  };

  // Filter out current type from available object types to prevent self-reference
  const availableObjectTypes = objectTypes.filter((t) => t.id !== currentTypeId);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium">Custom Fields</h3>
          <p className="text-sm text-muted-foreground">
            Define the data structure for this object type
          </p>
        </div>
        <Button onClick={addField} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>

      {fields.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm text-muted-foreground mb-3">
              No fields defined yet
            </p>
            <Button onClick={addField} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add First Field
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <Collapsible
              key={index}
              open={expandedIndex === index}
              onOpenChange={(open) => setExpandedIndex(open ? index : null)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="p-3 cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-medium">
                          {field.label || 'Untitled Field'}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {getFieldTypeLabel(field.field_type || 'text', field.field_config)}
                        </Badge>
                        {field.is_required && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeField(index);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            expandedIndex === index ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          placeholder="e.g., Bedrooms"
                          value={field.label || ''}
                          onChange={(e) =>
                            updateField(index, { label: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Field Type</Label>
                        <Select
                          value={field.field_type || 'text'}
                          onValueChange={(value) =>
                            updateField(index, {
                              field_type: value as ObjectFieldType,
                              field_config: {},
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div>
                                  <div>{type.label}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {type.description}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Field type specific config */}
                    {field.field_type === 'price' && (
                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select
                          value={field.field_config?.currency || 'USD'}
                          onValueChange={(value) =>
                            updateField(index, {
                              field_config: { ...field.field_config, currency: value },
                            })
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                {currency.symbol} {currency.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {field.field_type === 'select' && (
                      <SelectOptionsEditor
                        options={field.field_config?.options || []}
                        onChange={(options) =>
                          updateField(index, {
                            field_config: { ...field.field_config, options },
                          })
                        }
                      />
                    )}

                    {field.field_type === 'number' && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Min</Label>
                          <Input
                            type="number"
                            placeholder="No min"
                            value={field.field_config?.min ?? ''}
                            onChange={(e) =>
                              updateField(index, {
                                field_config: {
                                  ...field.field_config,
                                  min: e.target.value ? Number(e.target.value) : undefined,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max</Label>
                          <Input
                            type="number"
                            placeholder="No max"
                            value={field.field_config?.max ?? ''}
                            onChange={(e) =>
                              updateField(index, {
                                field_config: {
                                  ...field.field_config,
                                  max: e.target.value ? Number(e.target.value) : undefined,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Decimals</Label>
                          <Input
                            type="number"
                            min={0}
                            max={4}
                            placeholder="0"
                            value={field.field_config?.decimals ?? ''}
                            onChange={(e) =>
                              updateField(index, {
                                field_config: {
                                  ...field.field_config,
                                  decimals: e.target.value ? Number(e.target.value) : undefined,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                    )}

                    {field.field_type === 'object' && (
                      <div className="space-y-2">
                        <Label>Related Object Type</Label>
                        {availableObjectTypes.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Create other object types first to link to them.
                          </p>
                        ) : (
                          <Select
                            value={field.field_config?.related_object_type_id || ''}
                            onValueChange={(value) =>
                              updateField(index, {
                                field_config: {
                                  ...field.field_config,
                                  related_object_type_id: value,
                                },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select object type..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableObjectTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}

                    <div className="flex gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`required-${index}`}
                          checked={field.is_required || false}
                          onCheckedChange={(checked) =>
                            updateField(index, { is_required: checked })
                          }
                        />
                        <Label htmlFor={`required-${index}`}>Required</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`searchable-${index}`}
                          checked={field.is_searchable !== false}
                          onCheckedChange={(checked) =>
                            updateField(index, { is_searchable: checked })
                          }
                        />
                        <Label htmlFor={`searchable-${index}`}>Searchable</Label>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectOptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const [newOption, setNewOption] = useState('');

  const addOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      onChange([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label>Options</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {options.map((option, index) => (
          <Badge key={index} variant="secondary" className="gap-1">
            {option}
            <button
              type="button"
              onClick={() => removeOption(index)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Add option..."
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOption();
            }
          }}
        />
        <Button type="button" onClick={addOption} size="sm">
          Add
        </Button>
      </div>
    </div>
  );
}
