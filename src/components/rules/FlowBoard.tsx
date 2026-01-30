import { useState } from 'react';
import { Plus, ArrowRight, GitBranch, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ConditionGroup, ActionsGroup, RuleCondition, RuleAction, ConditionField, ConditionOperator, ActionType } from '@/lib/ruleTypes';
import { ConditionCard } from './ConditionCard';
import { ActionCard } from './ActionCard';

interface FlowBoardProps {
  conditions: ConditionGroup;
  actions: ActionsGroup;
  onConditionsChange: (conditions: ConditionGroup) => void;
  onActionsChange: (actions: ActionsGroup) => void;
}

const STICKY_COLORS = {
  condition: 'bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700',
  action: 'bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700',
  else: 'bg-rose-100 border-rose-300 dark:bg-rose-900/30 dark:border-rose-700',
};

export function FlowBoard({ conditions, actions, onConditionsChange, onActionsChange }: FlowBoardProps) {
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  const addCondition = () => {
    onConditionsChange({
      ...conditions,
      conditions: [
        ...conditions.conditions,
        { field: 'channel_type' as ConditionField, operator: 'equals' as ConditionOperator, value: 'telegram' },
      ],
    });
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const newConditions = [...conditions.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onConditionsChange({ ...conditions, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    onConditionsChange({
      ...conditions,
      conditions: conditions.conditions.filter((_, i) => i !== index),
    });
  };

  const toggleOperator = () => {
    onConditionsChange({
      ...conditions,
      operator: conditions.operator === 'AND' ? 'OR' : 'AND',
    });
  };

  const addAction = (isElse: boolean = false) => {
    const newAction: RuleAction = { type: 'assign_to_user' as ActionType };
    if (isElse) {
      onActionsChange({
        ...actions,
        elseActions: [...(actions.elseActions || []), newAction],
      });
    } else {
      onActionsChange({
        ...actions,
        actions: [...actions.actions, newAction],
      });
    }
  };

  const updateAction = (index: number, updates: Partial<RuleAction>, isElse: boolean = false) => {
    if (isElse) {
      const newActions = [...(actions.elseActions || [])];
      newActions[index] = { ...newActions[index], ...updates };
      onActionsChange({ ...actions, elseActions: newActions });
    } else {
      const newActions = [...actions.actions];
      newActions[index] = { ...newActions[index], ...updates };
      onActionsChange({ ...actions, actions: newActions });
    }
  };

  const removeAction = (index: number, isElse: boolean = false) => {
    if (isElse) {
      onActionsChange({
        ...actions,
        elseActions: (actions.elseActions || []).filter((_, i) => i !== index),
      });
    } else {
      onActionsChange({
        ...actions,
        actions: actions.actions.filter((_, i) => i !== index),
      });
    }
  };

  const hasElseBranch = actions.elseActions && actions.elseActions.length > 0;

  const enableElseBranch = () => {
    onActionsChange({
      ...actions,
      elseActions: [{ type: 'assign_to_user' as ActionType }],
    });
  };

  const removeElseBranch = () => {
    onActionsChange({
      ...actions,
      elseActions: undefined,
    });
  };

  return (
    <div className="w-full min-h-[400px] bg-muted/30 rounded-xl border-2 border-dashed border-muted-foreground/20 p-6 overflow-x-auto">
      <div className="flex items-start gap-6 min-w-max">
        {/* CONDITIONS ZONE */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            IF
          </div>
          
          {/* Operator toggle */}
          {conditions.conditions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleOperator}
              className="mb-2 text-xs"
            >
              Match {conditions.operator === 'AND' ? 'ALL' : 'ANY'}
            </Button>
          )}

          {/* Condition cards */}
          <div className="flex flex-col gap-3">
            {conditions.conditions.map((condition, index) => (
              <div key={index} className="relative">
                {index > 0 && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground bg-background px-2 rounded">
                    {conditions.operator}
                  </div>
                )}
                <ConditionCard
                  condition={condition}
                  onChange={(updates) => updateCondition(index, updates)}
                  onRemove={() => removeCondition(index)}
                  className={cn(
                    STICKY_COLORS.condition,
                    'transform transition-all duration-200 hover:-rotate-1 hover:scale-105'
                  )}
                  style={{ transform: `rotate(${(index % 3 - 1) * 1.5}deg)` }}
                />
              </div>
            ))}
          </div>

          {/* Add condition button */}
          <button
            onClick={addCondition}
            className={cn(
              'w-40 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2',
              'text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors',
              'bg-background/50'
            )}
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-medium">Add Condition</span>
          </button>
        </div>

        {/* ARROW */}
        <div className="flex flex-col items-center justify-center pt-16">
          <ArrowRight className="h-8 w-8 text-muted-foreground" />
        </div>

        {/* THEN ACTIONS ZONE */}
        <div className="flex flex-col items-center gap-3">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
            THEN
          </div>

          {/* Action cards */}
          <div className="flex flex-col gap-3">
            {actions.actions.map((action, index) => (
              <ActionCard
                key={index}
                action={action}
                onChange={(updates) => updateAction(index, updates, false)}
                onRemove={() => removeAction(index, false)}
                className={cn(
                  STICKY_COLORS.action,
                  'transform transition-all duration-200 hover:rotate-1 hover:scale-105'
                )}
                style={{ transform: `rotate(${((index + 1) % 3 - 1) * 1.5}deg)` }}
              />
            ))}
          </div>

          {/* Add action button */}
          <button
            onClick={() => addAction(false)}
            className={cn(
              'w-40 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2',
              'text-muted-foreground hover:text-foreground hover:border-emerald-500/50 transition-colors',
              'bg-background/50'
            )}
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-medium">Add Action</span>
          </button>

          {/* Enable ELSE branch button */}
          {!hasElseBranch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={enableElseBranch}
              className="mt-4 text-xs text-muted-foreground"
            >
              <GitBranch className="h-4 w-4 mr-1" />
              Add ELSE branch
            </Button>
          )}
        </div>

        {/* ELSE ACTIONS ZONE */}
        {hasElseBranch && (
          <>
            <div className="flex flex-col items-center justify-center pt-16">
              <div className="flex flex-col items-center gap-1">
                <GitBranch className="h-6 w-6 text-rose-500 rotate-180" />
                <span className="text-xs text-muted-foreground">or</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  ELSE
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeElseBranch}
                  className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Else action cards */}
              <div className="flex flex-col gap-3">
                {(actions.elseActions || []).map((action, index) => (
                  <ActionCard
                    key={index}
                    action={action}
                    onChange={(updates) => updateAction(index, updates, true)}
                    onRemove={() => removeAction(index, true)}
                    className={cn(
                      STICKY_COLORS.else,
                      'transform transition-all duration-200 hover:-rotate-1 hover:scale-105'
                    )}
                    style={{ transform: `rotate(${(index % 3 - 1) * -1.5}deg)` }}
                  />
                ))}
              </div>

              {/* Add else action button */}
              <button
                onClick={() => addAction(true)}
                className={cn(
                  'w-40 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2',
                  'text-muted-foreground hover:text-foreground hover:border-rose-500/50 transition-colors',
                  'bg-background/50'
                )}
              >
                <Plus className="h-5 w-5" />
                <span className="text-xs font-medium">Add Else Action</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Empty state */}
      {conditions.conditions.length === 0 && actions.actions.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground text-sm">
            Click "Add Condition" to start building your flow
          </p>
        </div>
      )}
    </div>
  );
}