import type { ChannelType } from './types';

// Condition field types
export type ConditionField = 
  | 'channel_type'
  | 'message_content'
  | 'contact.name'
  | 'contact.email'
  | 'contact.phone'
  | 'time.hour'
  | 'time.day_of_week';

// Condition operators
export type ConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in';

// Single condition
export interface RuleCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | string[] | number;
}

// Condition group with AND/OR logic
export interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: RuleCondition[];
}

// Action types
export type ActionType = 
  | 'assign_to_user'
  | 'assign_to_pool'
  | 'apply_status'
  | 'send_message';

// Single action
export interface RuleAction {
  type: ActionType;
  user_id?: string;
  user_ids?: string[];
  status_id?: string;
  content?: string;
}

// Actions container
export interface ActionsGroup {
  actions: RuleAction[];
}

// Full routing rule
export interface RoutingRule {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  priority: number;
  is_active: boolean;
  conditions: ConditionGroup;
  actions: ActionsGroup;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Rule action log for audit
export interface RuleActionLog {
  id: string;
  tenant_id: string;
  rule_id?: string;
  conversation_id?: string;
  contact_id?: string;
  action_type: string;
  action_details: Record<string, unknown>;
  created_at: string;
}

// Field configuration for UI
export const CONDITION_FIELDS: Record<ConditionField, { label: string; type: 'text' | 'select' | 'number' }> = {
  'channel_type': { label: 'Channel', type: 'select' },
  'message_content': { label: 'Message Content', type: 'text' },
  'contact.name': { label: 'Contact Name', type: 'text' },
  'contact.email': { label: 'Contact Email', type: 'text' },
  'contact.phone': { label: 'Contact Phone', type: 'text' },
  'time.hour': { label: 'Hour of Day', type: 'number' },
  'time.day_of_week': { label: 'Day of Week', type: 'select' },
};

export const CONDITION_OPERATORS: Record<ConditionOperator, string> = {
  'equals': 'equals',
  'not_equals': 'does not equal',
  'contains': 'contains',
  'not_contains': 'does not contain',
  'starts_with': 'starts with',
  'ends_with': 'ends with',
  'greater_than': 'is greater than',
  'less_than': 'is less than',
  'in': 'is one of',
  'not_in': 'is not one of',
};

export const ACTION_TYPES: Record<ActionType, { label: string; description: string }> = {
  'assign_to_user': { label: 'Assign to User', description: 'Route the lead to a specific team member' },
  'assign_to_pool': { label: 'Assign to Pool', description: 'Round-robin assign within a subset of users' },
  'apply_status': { label: 'Apply Status', description: 'Automatically tag the lead with a status' },
  'send_message': { label: 'Send Auto-Reply', description: 'Send an automatic response message' },
};

// Default empty rule for creation
export const DEFAULT_CONDITION_GROUP: ConditionGroup = {
  operator: 'AND',
  conditions: [],
};

export const DEFAULT_ACTIONS_GROUP: ActionsGroup = {
  actions: [],
};
