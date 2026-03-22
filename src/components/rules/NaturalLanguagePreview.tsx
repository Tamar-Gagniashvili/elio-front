import { useTranslation } from 'react-i18next';
import { ALL_CHANNELS, CHANNEL_CONFIG } from '@/lib/types';
import { SUPPORTED_LANGUAGES } from '@/lib/ruleTypes';
import type { ConditionGroup, ActionsGroup, RuleCondition, RuleAction } from '@/lib/ruleTypes';

interface NaturalLanguagePreviewProps {
  conditions: ConditionGroup;
  actions: ActionsGroup;
  users: { id: string; name: string }[];
  statuses: { id: string; name: string }[];
}

export function NaturalLanguagePreview({ conditions, actions, users, statuses }: NaturalLanguagePreviewProps) {
  const { t } = useTranslation();

  const OPERATOR_TEXT: Record<string, string> = {
    'equals': t('rules.operator.is'),
    'not_equals': t('rules.operator.isNot'),
    'contains': t('rules.operator.contains'),
    'not_contains': t('rules.operator.doesntContain'),
    'starts_with': t('rules.operator.startsWith'),
    'ends_with': t('rules.operator.endsWith'),
    'greater_than': t('rules.operator.isAfter'),
    'less_than': t('rules.operator.isBefore'),
  };

  function getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      'channel_type': t('rules.field.channel').toLowerCase(),
      'message_content': t('rules.field.message').toLowerCase(),
      'message_language': t('rules.field.language').toLowerCase(),
      'contact.name': t('rules.field.name').toLowerCase(),
      'contact.email': t('rules.field.email').toLowerCase(),
      'contact.phone': t('rules.field.phone').toLowerCase(),
      'time.hour': t('rules.field.hour').toLowerCase(),
      'time.day_of_week': t('rules.field.day').toLowerCase(),
    };
    return labels[field] || field;
  }

  const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  function formatValue(field: string, value: string | number | string[]): string {
    if (field === 'channel_type') {
      return CHANNEL_CONFIG[value as keyof typeof CHANNEL_CONFIG]?.label || String(value);
    }
    if (field === 'message_language') {
      const lang = SUPPORTED_LANGUAGES.find(l => l.code === value);
      return lang?.label || String(value);
    }
    if (field === 'time.day_of_week') {
      const dayKey = DAY_KEYS[Number(value)];
      return dayKey ? t(`rules.days.${dayKey}`) : String(value);
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

  function describeAction(action: RuleAction): string {
    switch (action.type) {
      case 'assign_to_user':
        const user = users.find(u => u.id === action.user_id);
        return user ? `${t('rules.action.assignToSomeone').split(' ')[0]} ${user.name}` : t('rules.action.assignToSomeone');
      case 'assign_to_pool':
        return t('rules.action.distributeRoundRobin');
      case 'apply_status':
        const status = statuses.find(s => s.id === action.status_id);
        return status ? t('rules.action.applyStatusLabel', { name: status.name }) : t('rules.action.applyAStatus');
      case 'send_message':
        const preview = action.content?.substring(0, 30) || '';
        return preview ? t('rules.action.sendPreview', { preview: preview + (preview.length >= 30 ? '...' : '') }) : t('rules.action.sendAMessage');
      default:
        return action.type;
    }
  }

  const hasConditions = conditions.conditions.length > 0;
  const hasActions = actions.actions.length > 0;
  const hasElseActions = actions.elseActions && actions.elseActions.length > 0;

  if (!hasConditions && !hasActions) {
    return (
      <div className="text-sm text-muted-foreground italic text-center py-3 px-4 bg-muted/30 rounded-lg">
        {t('rules.addPlainEnglish')}
      </div>
    );
  }

  const conditionJoiner = conditions.operator === 'AND' ? ` ${t('common.and')} ` : ` ${t('common.or')} `;
  const conditionText = conditions.conditions
    .map(c => describeCondition(c))
    .join(conditionJoiner);

  const actionText = actions.actions
    .map(a => describeAction(a))
    .join(', ');

  const elseActionText = hasElseActions
    ? actions.elseActions!.map(a => describeAction(a)).join(', ')
    : null;

  return (
    <div className="text-sm py-3 px-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
      <p className="leading-relaxed">
        {hasConditions && (
          <>
            <span className="font-semibold text-amber-600 dark:text-amber-400">{t('rules.when')} </span>
            <span>{conditionText}</span>
          </>
        )}
        {!hasConditions && (
          <span className="font-semibold text-amber-600 dark:text-amber-400">{t('rules.forAllLeads')}</span>
        )}
        {hasActions && (
          <>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">, {t('rules.then').toLowerCase()} </span>
            <span>{actionText}</span>
          </>
        )}
        {hasElseActions && (
          <>
            <span className="font-semibold text-rose-600 dark:text-rose-400">. {t('rules.otherwise')}, </span>
            <span>{elseActionText}</span>
          </>
        )}
        <span>.</span>
      </p>
    </div>
  );
}
