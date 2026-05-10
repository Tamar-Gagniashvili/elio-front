import { useTranslation } from 'react-i18next';
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
  error?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ConditionCard({ condition, onChange, onRemove, error, className, style }: ConditionCardProps) {
  const { t } = useTranslation();

  const FIELD_OPTIONS: { value: ConditionField; label: string }[] = [
    { value: 'channel_type', label: t('rules.field.channel') },
    { value: 'message_content', label: t('rules.field.message') },
    { value: 'message_language', label: t('rules.field.language') },
    { value: 'contact.name', label: t('rules.field.name') },
    { value: 'contact.email', label: t('rules.field.email') },
    { value: 'contact.phone', label: t('rules.field.phone') },
    { value: 'time.hour', label: t('rules.field.hour') },
    { value: 'time.day_of_week', label: t('rules.field.day') },
  ];

  const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: t('rules.operator.is') },
    { value: 'not_equals', label: t('rules.operator.isNot') },
    { value: 'contains', label: t('rules.operator.contains') },
    { value: 'not_contains', label: t('rules.operator.doesntContain') },
    { value: 'starts_with', label: t('rules.operator.startsWith') },
    { value: 'ends_with', label: t('rules.operator.endsWith') },
    { value: 'greater_than', label: t('rules.operator.isAfter') },
    { value: 'less_than', label: t('rules.operator.isBefore') },
  ];

  const DAY_OPTIONS = [
    { value: '0', label: t('rules.days.sun') },
    { value: '1', label: t('rules.days.mon') },
    { value: '2', label: t('rules.days.tue') },
    { value: '3', label: t('rules.days.wed') },
    { value: '4', label: t('rules.days.thu') },
    { value: '5', label: t('rules.days.fri') },
    { value: '6', label: t('rules.days.sat') },
  ];

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
          step={1}
          className="h-7 text-xs bg-background/80 w-16"
          value={String(condition.value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') {
              onChange({ value: '' as unknown as number });
              return;
            }
            const n = parseInt(raw, 10);
            if (Number.isNaN(n)) return;
            const clamped = Math.max(0, Math.min(23, n));
            onChange({ value: clamped });
          }}
        />
      );
    }

    return (
      <Input
        className="h-7 text-xs bg-background/80"
        placeholder={t('rules.value')}
        value={String(condition.value)}
        onChange={(e) => onChange({ value: e.target.value })}
      />
    );
  };

  return (
    <div
      className={cn(
        'w-44 p-3 rounded-lg border-2 shadow-md relative group',
        error && 'ring-2 ring-destructive ring-offset-1',
        className
      )}
      style={style}
    >
      <div className="absolute -top-2 right-3 w-4 h-4 rounded-full bg-red-500 shadow-sm border-2 border-red-600" />
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="absolute -top-1 -right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background rounded-full shadow"
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>

      <div className="space-y-2">
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

        {renderValueInput()}

        {error && (
          <p className="text-[10px] text-destructive font-medium leading-tight">{error}</p>
        )}
      </div>
    </div>
  );
}
