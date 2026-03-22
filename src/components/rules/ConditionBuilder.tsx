import { useTranslation } from 'react-i18next';
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
import { Plus, Trash2 } from 'lucide-react';
import { ALL_CHANNELS, CHANNEL_CONFIG } from '@/lib/types';
import type {
  ConditionGroup,
  RuleCondition,
  ConditionField,
  ConditionOperator,
} from '@/lib/ruleTypes';
import { SUPPORTED_LANGUAGES } from '@/lib/ruleTypes';

interface ConditionBuilderProps {
  conditions: ConditionGroup;
  onChange: (conditions: ConditionGroup) => void;
}

export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const { t } = useTranslation();

  const FIELD_OPTIONS: { value: ConditionField; label: string }[] = [
    { value: 'channel_type', label: t('rules.field.channel') },
    { value: 'message_content', label: t('rules.field.messageContent') },
    { value: 'message_language', label: t('rules.field.messageLanguage') },
    { value: 'contact.name', label: t('rules.field.contactName') },
    { value: 'contact.email', label: t('rules.field.contactEmail') },
    { value: 'contact.phone', label: t('rules.field.contactPhone') },
    { value: 'time.hour', label: t('rules.field.hourOfDay') },
    { value: 'time.day_of_week', label: t('rules.field.dayOfWeek') },
  ];

  const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: t('rules.operator.equals') },
    { value: 'not_equals', label: t('rules.operator.notEquals') },
    { value: 'contains', label: t('rules.operator.contains') },
    { value: 'not_contains', label: t('rules.operator.notContains') },
    { value: 'starts_with', label: t('rules.operator.startsWith') },
    { value: 'ends_with', label: t('rules.operator.endsWith') },
    { value: 'greater_than', label: t('rules.operator.greaterThan') },
    { value: 'less_than', label: t('rules.operator.lessThan') },
  ];

  const DAY_OPTIONS = [
    { value: '0', label: t('rules.days.sunday') },
    { value: '1', label: t('rules.days.monday') },
    { value: '2', label: t('rules.days.tuesday') },
    { value: '3', label: t('rules.days.wednesday') },
    { value: '4', label: t('rules.days.thursday') },
    { value: '5', label: t('rules.days.friday') },
    { value: '6', label: t('rules.days.saturday') },
  ];
  const addCondition = () => {
    onChange({
      ...conditions,
      conditions: [
        ...conditions.conditions,
        { field: 'channel_type', operator: 'equals', value: 'telegram' },
      ],
    });
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const newConditions = [...conditions.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onChange({ ...conditions, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    onChange({
      ...conditions,
      conditions: conditions.conditions.filter((_, i) => i !== index),
    });
  };

  const toggleOperator = () => {
    onChange({
      ...conditions,
      operator: conditions.operator === 'AND' ? 'OR' : 'AND',
    });
  };

  const renderValueInput = (condition: RuleCondition, index: number) => {
    if (condition.field === 'channel_type') {
      return (
        <Select
          value={String(condition.value)}
          onValueChange={(value) => updateCondition(index, { value })}
        >
          <SelectTrigger className="w-[180px]">
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
          onValueChange={(value) => updateCondition(index, { value })}
        >
          <SelectTrigger className="w-[180px]">
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
          onValueChange={(value) => updateCondition(index, { value })}
        >
          <SelectTrigger className="w-[180px]">
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
          className="w-[100px]"
          value={String(condition.value)}
          onChange={(e) => updateCondition(index, { value: parseInt(e.target.value) || 0 })}
        />
      );
    }

    return (
      <Input
        className="flex-1"
        placeholder="Enter value..."
        value={String(condition.value)}
        onChange={(e) => updateCondition(index, { value: e.target.value })}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Match conditions</Label>
        <Button variant="outline" size="sm" onClick={toggleOperator}>
          {conditions.operator === 'AND' ? 'Match ALL' : 'Match ANY'}
        </Button>
      </div>

      {conditions.conditions.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            No conditions defined. This rule will match all incoming leads.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conditions.conditions.map((condition, index) => (
            <Card key={index}>
              <CardContent className="py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {index > 0 && (
                    <span className="text-sm font-medium text-muted-foreground w-12">
                      {conditions.operator}
                    </span>
                  )}
                  {index === 0 && <span className="text-sm font-medium w-12">IF</span>}
                  
                  <Select
                    value={condition.field}
                    onValueChange={(value: ConditionField) => updateCondition(index, { field: value, value: '' })}
                  >
                    <SelectTrigger className="w-[160px]">
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
                    onValueChange={(value: ConditionOperator) => updateCondition(index, { operator: value })}
                  >
                    <SelectTrigger className="w-[160px]">
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

                  {renderValueInput(condition, index)}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCondition(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button variant="outline" onClick={addCondition} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Condition
      </Button>
    </div>
  );
}
