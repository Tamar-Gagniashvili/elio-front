import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Languages, Clock, MessageSquare, Users } from 'lucide-react';
import type { ConditionGroup, ActionsGroup, ConditionField, ConditionOperator, ActionType } from '@/lib/ruleTypes';

interface RuleTemplatesProps {
  onApply: (conditions: ConditionGroup, actions: ActionsGroup, name: string, description: string) => void;
}

interface Template {
  id: string;
  nameKey: string;
  descKey: string;
  icon: React.ReactNode;
  conditions: ConditionGroup;
  actions: ActionsGroup;
}

const TEMPLATES: Template[] = [
  {
    id: 'language-routing',
    nameKey: 'rules.template.routeByLanguage',
    descKey: 'rules.template.routeByLanguageDesc',
    icon: <Languages className="h-4 w-4" />,
    conditions: {
      operator: 'AND',
      conditions: [
        { field: 'message_language' as ConditionField, operator: 'equals' as ConditionOperator, value: 'ka' },
      ],
    },
    actions: {
      actions: [{ type: 'assign_to_user' as ActionType }],
      elseActions: [{ type: 'assign_to_pool' as ActionType }],
    },
  },
  {
    id: 'channel-routing',
    nameKey: 'rules.template.routeByChannel',
    descKey: 'rules.template.routeByChannelDesc',
    icon: <MessageSquare className="h-4 w-4" />,
    conditions: {
      operator: 'AND',
      conditions: [
        { field: 'channel_type' as ConditionField, operator: 'equals' as ConditionOperator, value: 'whatsapp' },
      ],
    },
    actions: {
      actions: [
        { type: 'assign_to_user' as ActionType },
        { type: 'apply_status' as ActionType },
      ],
    },
  },
  {
    id: 'business-hours',
    nameKey: 'rules.template.businessHours',
    descKey: 'rules.template.businessHoursDesc',
    icon: <Clock className="h-4 w-4" />,
    conditions: {
      operator: 'AND',
      conditions: [
        { field: 'time.hour' as ConditionField, operator: 'greater_than' as ConditionOperator, value: 9 },
        { field: 'time.hour' as ConditionField, operator: 'less_than' as ConditionOperator, value: 18 },
      ],
    },
    actions: {
      actions: [{ type: 'assign_to_pool' as ActionType }],
      elseActions: [{ type: 'send_message' as ActionType, content: 'Thanks for reaching out! Our team will respond during business hours.' }],
    },
  },
  {
    id: 'vip-keywords',
    nameKey: 'rules.template.vipDetection',
    descKey: 'rules.template.vipDetectionDesc',
    icon: <Users className="h-4 w-4" />,
    conditions: {
      operator: 'OR',
      conditions: [
        { field: 'message_content' as ConditionField, operator: 'contains' as ConditionOperator, value: 'urgent' },
        { field: 'message_content' as ConditionField, operator: 'contains' as ConditionOperator, value: 'enterprise' },
      ],
    },
    actions: {
      actions: [
        { type: 'apply_status' as ActionType },
        { type: 'assign_to_user' as ActionType },
      ],
    },
  },
];

export function RuleTemplates({ onApply }: RuleTemplatesProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">{t('rules.startWithTemplate')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TEMPLATES.map((template) => (
          <Button
            key={template.id}
            variant="outline"
            size="sm"
            className="h-auto py-2 px-3 justify-start text-left whitespace-normal w-full"
            onClick={() => onApply(template.conditions, template.actions, t(template.nameKey), t(template.descKey))}
          >
            <div className="flex items-start gap-2 w-full min-w-0">
              <div className="mt-0.5 text-muted-foreground shrink-0">{template.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{t(template.nameKey)}</div>
                <div className="text-[10px] text-muted-foreground line-clamp-2 break-words">{t(template.descKey)}</div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
