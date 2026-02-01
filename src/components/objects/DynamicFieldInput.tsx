import { ObjectTypeField, CURRENCIES } from '@/lib/objectTypes';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DynamicFieldInputProps {
  field: ObjectTypeField;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function DynamicFieldInput({ field, value, onChange }: DynamicFieldInputProps) {
  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.symbol || '$';
  };

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
        // Could be enhanced to show a contact picker
        return (
          <Input
            placeholder="Enter contact email or phone..."
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
          />
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
