import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ALL_CHANNELS, CHANNEL_CONFIG } from '@/lib/types';
import { SUPPORTED_LANGUAGES } from '@/lib/ruleTypes';
import type { RuleCondition, ConditionField, ConditionOperator } from '@/lib/ruleTypes';

interface ConditionCardProps {
  condition: RuleCondition;
  onChange: (updates: Partial<RuleCondition>) => void;
  onRemove: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const FIELD_OPTIONS: { value: ConditionField; label: string }[] = [
  { value: 'channel_type', label: 'Channel' },
  { value: 'message_content', label: 'Message' },
  { value: 'message_language', label: 'Language' },
  { value: 'contact.name', label: 'Name' },
  { value: 'contact.email', label: 'Email' },
  { value: 'contact.phone', label: 'Phone' },
  { value: 'time.hour', label: 'Hour' },
  { value: 'time.day_of_week', label: 'Day' },
];

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '≠' },
  { value: 'contains', label: '∋' },
  { value: 'not_contains', label: '∌' },
  { value: 'starts_with', label: 'starts' },
  { value: 'ends_with', label: 'ends' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
];

const DAY_OPTIONS = [
  { value: '0', label: 'Sun' },
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
];

export function ConditionCard({ condition, onChange, onRemove, className, style }: ConditionCardProps) {
  const renderValueInput = () => {
    if (condition.field === 'channel_type') {
      return (
        <Select
          value={String(condition.value)}
          onValueChange={(value) => onChange({ value })}
        >
          <SelectTrigger className="h-7 text-xs bg-background/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_CHANNELS.map((channel) => (
              <SelectItem key={channel} value={channel}>
                {CHANNEL_CONFIG[channel].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (condition.field === 'message_language') {
      return (
        <Select
          value={String(condition.value)}
          onValueChange={(value) => onChange({ value })}
        >
          <SelectTrigger className="h-7 text-xs bg-background/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (condition.field === 'time.day_of_week') {
      return (
        <Select
          value={String(condition.value)}
          onValueChange={(value) => onChange({ value })}
        >
          <SelectTrigger className="h-7 text-xs bg-background/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_OPTIONS.map((day) => (
              <SelectItem key={day.value} value={day.value}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (condition.field === 'time.hour') {
      return (
        <Input
          type="number"
          min={0}
          max={23}
          className="h-7 text-xs bg-background/80 w-16"
          value={String(condition.value)}
          onChange={(e) => onChange({ value: parseInt(e.target.value) || 0 })}
        />
      );
    }

    return (
      <Input
        className="h-7 text-xs bg-background/80"
        placeholder="value..."
        value={String(condition.value)}
        onChange={(e) => onChange({ value: e.target.value })}
      />
    );
  };

  return (
    <div
      className={cn(
        'w-44 p-3 rounded-lg border-2 shadow-md relative group',
        className
      )}
      style={style}
    >
      {/* Pin decoration */}
      <div className="absolute -top-2 right-3 w-4 h-4 rounded-full bg-red-500 shadow-sm border-2 border-red-600" />
      
      {/* Remove button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="absolute -top-1 -right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background rounded-full shadow"
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>

      <div className="space-y-2">
        {/* Field selector */}
        <Select
          value={condition.field}
          onValueChange={(value: ConditionField) => onChange({ field: value, value: '' })}
        >
          <SelectTrigger className="h-7 text-xs font-medium bg-background/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_OPTIONS.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Operator selector */}
        <Select
          value={condition.operator}
          onValueChange={(value: ConditionOperator) => onChange({ operator: value })}
        >
          <SelectTrigger className="h-7 text-xs bg-background/80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATOR_OPTIONS.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value input */}
        {renderValueInput()}
      </div>
    </div>
  );
}