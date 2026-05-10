import { z } from 'zod';
import type { TFunction } from 'i18next';
import type {
  ConditionGroup,
  ActionsGroup,
  RuleCondition,
  RuleAction,
} from './ruleTypes';

// Per-card error map. Keyed by index for conditions and (then/else) actions.
// `name` and `general` are top-level form errors.
export interface RuleErrors {
  name?: string;
  general?: string;
  conditions: Record<number, string>;
  actions: Record<number, string>;
  elseActions: Record<number, string>;
}

export const emptyRuleErrors = (): RuleErrors => ({
  conditions: {},
  actions: {},
  elseActions: {},
});

export const hasErrors = (e: RuleErrors): boolean =>
  Boolean(
    e.name ||
      e.general ||
      Object.keys(e.conditions).length ||
      Object.keys(e.actions).length ||
      Object.keys(e.elseActions).length,
  );

const NAME_MAX = 80;
const DESCRIPTION_MAX = 240;
const MESSAGE_MAX = 1000;
const VALUE_MAX = 200;

const nameSchema = (t: TFunction) =>
  z
    .string()
    .trim()
    .min(1, { message: t('rules.validation.nameRequired') })
    .max(NAME_MAX, { message: t('rules.validation.nameTooLong', { max: NAME_MAX }) });

const numericRangeOps = new Set(['equals', 'not_equals', 'greater_than', 'less_than']);

function validateCondition(c: RuleCondition, t: TFunction): string | null {
  // Field-specific validation
  switch (c.field) {
    case 'time.hour': {
      const n = typeof c.value === 'number' ? c.value : parseInt(String(c.value), 10);
      if (Number.isNaN(n)) return t('rules.validation.hourRequired');
      if (!Number.isInteger(n) || n < 0 || n > 23) {
        return t('rules.validation.hourRange');
      }
      if (!numericRangeOps.has(c.operator)) {
        return t('rules.validation.hourOperator');
      }
      return null;
    }
    case 'time.day_of_week': {
      const n = parseInt(String(c.value), 10);
      if (Number.isNaN(n) || n < 0 || n > 6) return t('rules.validation.dayInvalid');
      if (c.operator !== 'equals' && c.operator !== 'not_equals') {
        return t('rules.validation.dayOperator');
      }
      return null;
    }
    case 'channel_type':
    case 'message_language': {
      const v = String(c.value ?? '').trim();
      if (!v) return t('rules.validation.selectValue');
      if (c.operator !== 'equals' && c.operator !== 'not_equals') {
        return t('rules.validation.selectOperator');
      }
      return null;
    }
    case 'contact.email': {
      const v = String(c.value ?? '').trim();
      if (!v) return t('rules.validation.valueRequired');
      if (v.length > VALUE_MAX) return t('rules.validation.valueTooLong', { max: VALUE_MAX });
      // For equals/not_equals, require valid email shape
      if (c.operator === 'equals' || c.operator === 'not_equals') {
        const ok = z.string().email().safeParse(v).success;
        if (!ok) return t('rules.validation.invalidEmail');
      }
      return null;
    }
    case 'contact.phone': {
      const v = String(c.value ?? '').trim();
      if (!v) return t('rules.validation.valueRequired');
      if (v.length > VALUE_MAX) return t('rules.validation.valueTooLong', { max: VALUE_MAX });
      // Loose phone check: digits, spaces, +, -, ()
      if (!/^[+\-\d\s()]{3,}$/.test(v)) return t('rules.validation.invalidPhone');
      return null;
    }
    case 'message_content':
    case 'contact.name':
    default: {
      const v = String(c.value ?? '').trim();
      if (!v) return t('rules.validation.valueRequired');
      if (v.length > VALUE_MAX) return t('rules.validation.valueTooLong', { max: VALUE_MAX });
      return null;
    }
  }
}

function validateAction(a: RuleAction, t: TFunction): string | null {
  switch (a.type) {
    case 'assign_to_user':
      if (!a.user_id) return t('rules.validation.actionUserRequired');
      return null;
    case 'assign_to_pool':
      if (!a.user_ids || a.user_ids.length === 0) {
        return t('rules.validation.actionPoolRequired');
      }
      return null;
    case 'apply_status':
      if (!a.status_id) return t('rules.validation.actionStatusRequired');
      return null;
    case 'send_message': {
      const v = (a.content ?? '').trim();
      if (!v) return t('rules.validation.actionMessageRequired');
      if (v.length > MESSAGE_MAX) {
        return t('rules.validation.actionMessageTooLong', { max: MESSAGE_MAX });
      }
      return null;
    }
    default:
      return t('rules.validation.actionTypeRequired');
  }
}

export interface ValidateRuleInput {
  name: string;
  description?: string;
  conditions: ConditionGroup;
  actions: ActionsGroup;
}

export function validateRule(input: ValidateRuleInput, t: TFunction): RuleErrors {
  const errors = emptyRuleErrors();

  // Name
  const nameRes = nameSchema(t).safeParse(input.name);
  if (!nameRes.success) {
    errors.name = nameRes.error.errors[0].message;
  }

  // Description (optional, length only)
  if (input.description && input.description.length > DESCRIPTION_MAX) {
    errors.general = t('rules.validation.descriptionTooLong', { max: DESCRIPTION_MAX });
  }

  // Must have at least one action
  if (input.actions.actions.length === 0) {
    errors.general = errors.general
      ? errors.general + ' ' + t('rules.validation.atLeastOneAction')
      : t('rules.validation.atLeastOneAction');
  }

  // Conditions
  input.conditions.conditions.forEach((c, i) => {
    const err = validateCondition(c, t);
    if (err) errors.conditions[i] = err;
  });

  // THEN actions
  input.actions.actions.forEach((a, i) => {
    const err = validateAction(a, t);
    if (err) errors.actions[i] = err;
  });

  // ELSE actions
  (input.actions.elseActions ?? []).forEach((a, i) => {
    const err = validateAction(a, t);
    if (err) errors.elseActions[i] = err;
  });

  return errors;
}
