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
    <div className="w-full min-h-[280px] bg-muted/20 rounded-xl border-2 border-dashed border-muted-foreground/20 p-4 relative">
      <div className="flex items-start justify-center gap-6">
        {/* CONDITIONS ZONE */}
        <div className="flex flex-col items-center gap-2 min-w-[160px]">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            IF
          </div>
          
          {/* Operator toggle */}
          {conditions.conditions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleOperator}
              className="text-xs h-6 px-2"
            >
              Match {conditions.operator === 'AND' ? 'ALL' : 'ANY'}
            </Button>
          )}

          {/* Condition cards */}
          <div className="flex flex-col gap-2">
            {conditions.conditions.map((condition, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <div className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                    {conditions.operator}
                  </div>
                )}
                <ConditionCard
                  condition={condition}
                  onChange={(updates) => updateCondition(index, updates)}
                  onRemove={() => removeCondition(index)}
                  className={cn(
                    STICKY_COLORS.condition,
                    'transition-all duration-200 hover:scale-[1.02]'
                  )}
                />
              </div>
            ))}
          </div>

          {/* Add condition button */}
          <button
            onClick={addCondition}
            className={cn(
              'w-40 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1',
              'text-muted-foreground hover:text-foreground hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-all',
              'bg-background/50'
            )}
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs font-medium">Add Condition</span>
          </button>
        </div>

        {/* ARROW */}
        <div className="flex items-center justify-center self-center mt-6">
          <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
        </div>

        {/* THEN ACTIONS ZONE */}
        <div className="flex flex-col items-center gap-2 min-w-[160px]">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            THEN
          </div>

          {/* Action cards */}
          <div className="flex flex-col gap-2">
            {actions.actions.map((action, index) => (
              <ActionCard
                key={index}
                action={action}
                onChange={(updates) => updateAction(index, updates, false)}
                onRemove={() => removeAction(index, false)}
                className={cn(
                  STICKY_COLORS.action,
                  'transition-all duration-200 hover:scale-[1.02]'
                )}
              />
            ))}
          </div>

          {/* Add action button */}
          <button
            onClick={() => addAction(false)}
            className={cn(
              'w-40 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1',
              'text-muted-foreground hover:text-foreground hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all',
              'bg-background/50'
            )}
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs font-medium">Add Action</span>
          </button>
        </div>

        {/* ELSE ACTIONS ZONE */}
        {hasElseBranch && (
          <>
            <div className="flex items-center justify-center self-center mt-6">
              <div className="flex items-center gap-1">
                <div className="h-px w-3 bg-muted-foreground/30" />
                <span className="text-[10px] text-muted-foreground uppercase">or</span>
                <div className="h-px w-3 bg-muted-foreground/30" />
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 min-w-[160px]">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  ELSE
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeElseBranch}
                  className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {/* Else action cards */}
              <div className="flex flex-col gap-2">
                {(actions.elseActions || []).map((action, index) => (
                  <ActionCard
                    key={index}
                    action={action}
                    onChange={(updates) => updateAction(index, updates, true)}
                    onRemove={() => removeAction(index, true)}
                    className={cn(
                      STICKY_COLORS.else,
                      'transition-all duration-200 hover:scale-[1.02]'
                    )}
                  />
                ))}
              </div>

              {/* Add else action button */}
              <button
                onClick={() => addAction(true)}
                className={cn(
                  'w-40 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1',
                  'text-muted-foreground hover:text-foreground hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/20 transition-all',
                  'bg-background/50'
                )}
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs font-medium">Add Else Action</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Add ELSE branch button - centered at bottom */}
      {!hasElseBranch && (
        <div className="flex justify-center mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={enableElseBranch}
            className="text-xs text-muted-foreground hover:text-foreground h-7"
          >
            <GitBranch className="h-3.5 w-3.5 mr-1" />
            Add ELSE branch
          </Button>
        </div>
      )}
    </div>
  );
}