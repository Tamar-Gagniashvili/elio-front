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

const FIELD_OPTIONS: { value: ConditionField; label: string }[] = [
  { value: 'channel_type', label: 'Channel' },
  { value: 'message_content', label: 'Message Content' },
  { value: 'message_language', label: 'Message Language' },
  { value: 'contact.name', label: 'Contact Name' },
  { value: 'contact.email', label: 'Contact Email' },
  { value: 'contact.phone', label: 'Contact Phone' },
  { value: 'time.hour', label: 'Hour of Day (0-23)' },
  { value: 'time.day_of_week', label: 'Day of Week' },
];

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
];

const DAY_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
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
