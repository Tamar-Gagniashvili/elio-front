import { ALL_CHANNELS, CHANNEL_CONFIG } from '@/lib/types';
import { SUPPORTED_LANGUAGES } from '@/lib/ruleTypes';
import type { ConditionGroup, ActionsGroup, RuleCondition, RuleAction } from '@/lib/ruleTypes';

interface NaturalLanguagePreviewProps {
  conditions: ConditionGroup;
  actions: ActionsGroup;
  users: { id: string; name: string }[];
  statuses: { id: string; name: string }[];
}

const DAY_NAMES: Record<string, string> = {
  '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday',
  '4': 'Thursday', '5': 'Friday', '6': 'Saturday',
};

const OPERATOR_TEXT: Record<string, string> = {
  'equals': 'is',
  'not_equals': 'is not',
  'contains': 'contains',
  'not_contains': 'doesn\'t contain',
  'starts_with': 'starts with',
  'ends_with': 'ends with',
  'greater_than': 'is after',
  'less_than': 'is before',
};

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    'channel_type': 'channel',
    'message_content': 'message',
    'message_language': 'language',
    'contact.name': 'contact name',
    'contact.email': 'email',
    'contact.phone': 'phone',
    'time.hour': 'hour',
    'time.day_of_week': 'day',
  };
  return labels[field] || field;
}

function formatValue(field: string, value: string | number | string[]): string {
  if (field === 'channel_type') {
    return CHANNEL_CONFIG[value as keyof typeof CHANNEL_CONFIG]?.label || String(value);
  }
  if (field === 'message_language') {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === value);
    return lang?.label || String(value);
  }
  if (field === 'time.day_of_week') {
    return DAY_NAMES[String(value)] || String(value);
  }
  if (field === 'time.hour') {
    return `${value}:00`;
  }
  return `"${value}"`;
}

function describeCondition(condition: RuleCondition): string {
  const field = getFieldLabel(condition.field);
  const operator = OPERATOR_TEXT[condition.operator] || condition.operator;
  const value = formatValue(condition.field, condition.value);
  return `${field} ${operator} ${value}`;
}

function describeAction(action: RuleAction, users: { id: string; name: string }[], statuses: { id: string; name: string }[]): string {
  switch (action.type) {
    case 'assign_to_user':
      const user = users.find(u => u.id === action.user_id);
      return user ? `assign to ${user.name}` : 'assign to someone';
    case 'assign_to_pool':
      return 'distribute using round-robin';
    case 'apply_status':
      const status = statuses.find(s => s.id === action.status_id);
      return status ? `apply "${status.name}" status` : 'apply a status';
    case 'send_message':
      const preview = action.content?.substring(0, 30) || '';
      return preview ? `send "${preview}${preview.length >= 30 ? '...' : ''}"` : 'send a message';
    default:
      return action.type;
  }
}

export function NaturalLanguagePreview({ conditions, actions, users, statuses }: NaturalLanguagePreviewProps) {
  const hasConditions = conditions.conditions.length > 0;
  const hasActions = actions.actions.length > 0;
  const hasElseActions = actions.elseActions && actions.elseActions.length > 0;

  if (!hasConditions && !hasActions) {
    return (
      <div className="text-sm text-muted-foreground italic text-center py-3 px-4 bg-muted/30 rounded-lg">
        Add conditions and actions to see your rule in plain English
      </div>
    );
  }

  const conditionText = conditions.conditions
    .map(c => describeCondition(c))
    .join(conditions.operator === 'AND' ? ' and ' : ' or ');

  const actionText = actions.actions
    .map(a => describeAction(a, users, statuses))
    .join(', then ');

  const elseActionText = hasElseActions
    ? actions.elseActions!.map(a => describeAction(a, users, statuses)).join(', then ')
    : null;

  return (
    <div className="text-sm py-3 px-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
      <p className="leading-relaxed">
        {hasConditions && (
          <>
            <span className="font-semibold text-amber-600 dark:text-amber-400">When </span>
            <span>{conditionText}</span>
          </>
        )}
        {!hasConditions && (
          <span className="font-semibold text-amber-600 dark:text-amber-400">For all incoming leads</span>
        )}
        {hasActions && (
          <>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">, then </span>
            <span>{actionText}</span>
          </>
        )}
        {hasElseActions && (
          <>
            <span className="font-semibold text-rose-600 dark:text-rose-400">. Otherwise, </span>
            <span>{elseActionText}</span>
          </>
        )}
        <span>.</span>
      </p>
    </div>
  );
}