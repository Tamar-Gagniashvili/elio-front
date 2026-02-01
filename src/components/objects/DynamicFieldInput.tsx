import { useState, useEffect } from 'react';
import { ObjectTypeField, CURRENCIES, BusinessObject } from '@/lib/objectTypes';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DynamicFieldInputProps {
  field: ObjectTypeField;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function DynamicFieldInput({ field, value, onChange }: DynamicFieldInputProps) {
  const { currentTenant } = useAuth();
  const [relatedObjects, setRelatedObjects] = useState<BusinessObject[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.symbol || '$';
  };

  // Fetch related objects for 'object' field type
  useEffect(() => {
    if (field.field_type === 'object' && field.field_config?.related_object_type_id && currentTenant?.id) {
      setLoadingObjects(true);
      supabase
        .from('objects')
        .select('id, display_name')
        .eq('tenant_id', currentTenant.id)
        .eq('object_type_id', field.field_config.related_object_type_id)
        .eq('is_archived', false)
        .order('display_name')
        .then(({ data }) => {
          setRelatedObjects((data || []) as BusinessObject[]);
          setLoadingObjects(false);
        });
    }
  }, [field.field_type, field.field_config?.related_object_type_id, currentTenant?.id]);

  const renderInput = () => {
    switch (field.field_type) {
      case 'text':
        return (
          <Input
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            maxLength={field.field_config?.max_length}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            value={value !== undefined && value !== null ? String(value) : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                onChange(undefined);
              } else {
                const decimals = field.field_config?.decimals || 0;
                onChange(decimals > 0 ? parseFloat(val) : parseInt(val, 10));
              }
            }}
            min={field.field_config?.min}
            max={field.field_config?.max}
            step={field.field_config?.decimals ? Math.pow(10, -field.field_config.decimals) : 1}
          />
        );

      case 'price':
        const currency = field.field_config?.currency || 'USD';
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {getCurrencySymbol(currency)}
            </span>
            <Input
              type="number"
              placeholder="0.00"
              value={value !== undefined && value !== null ? String(value) : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onChange(undefined);
                } else {
                  onChange(parseFloat(val));
                }
              }}
              className="pl-8"
              min={0}
              step={0.01}
            />
          </div>
        );

      case 'select':
        const options = field.field_config?.options || [];
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(val) => onChange(val || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'relation':
        // For MVP, just show a text input for contact reference
        return (
          <Input
            placeholder="Enter contact email or phone..."
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case 'object':
        // Object relation picker
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(val) => onChange(val || undefined)}
            disabled={loadingObjects}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingObjects ? 'Loading...' : `Select ${field.label.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent>
              {relatedObjects.map((obj) => (
                <SelectItem key={obj.id} value={obj.id}>
                  {obj.display_name}
                </SelectItem>
              ))}
              {relatedObjects.length === 0 && !loadingObjects && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No objects available
                </div>
              )}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            placeholder={`Enter ${field.label.toLowerCase()}...`}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.is_required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderInput()}
    </div>
  );
}
