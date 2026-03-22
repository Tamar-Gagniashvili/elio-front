import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import type { ActionsGroup, RuleAction, ActionType, ACTION_TYPES } from '@/lib/ruleTypes';
import type { Profile, LeadStatus } from '@/lib/types';

interface ActionBuilderProps {
  actions: ActionsGroup;
  onChange: (actions: ActionsGroup) => void;
}

export function ActionBuilder({ actions, onChange }: ActionBuilderProps) {
  const { t } = useTranslation();

  const ACTION_OPTIONS: { value: ActionType; label: string; description: string }[] = [
    { value: 'assign_to_user', label: t('rules.action.assignToUser'), description: t('rules.action.assignToDesc') },
    { value: 'assign_to_pool', label: t('rules.action.assignToPool'), description: t('rules.action.assignToPoolDesc') },
    { value: 'apply_status', label: t('rules.action.applyStatus'), description: t('rules.action.applyStatusDesc') },
    { value: 'send_message', label: t('rules.action.sendMessage'), description: t('rules.action.sendMessageDesc') },
  ];
  const { currentTenant } = useAuth();
  const [teamMembers, setTeamMembers] = useState<(Profile & { membership_user_id: string })[]>([]);
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);

  useEffect(() => {
    if (currentTenant) {
      fetchTeamMembers();
      fetchStatuses();
    }
  }, [currentTenant]);

  const fetchTeamMembers = async () => {
    if (!currentTenant) return;

    const { data: memberships } = await supabase
      .from('tenant_memberships')
      .select('user_id')
      .eq('tenant_id', currentTenant.id)
      .eq('is_active', true);

    if (memberships && memberships.length > 0) {
      const userIds = memberships.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profiles) {
        setTeamMembers(profiles.map(p => ({ ...p, membership_user_id: p.user_id })));
      }
    }
  };

  const fetchStatuses = async () => {
    if (!currentTenant) return;

    const { data } = await supabase
      .from('lead_statuses')
      .select('*')
      .eq('tenant_id', currentTenant.id);

    if (data) {
      setStatuses(data);
    }
  };

  const addAction = (type: ActionType) => {
    const newAction: RuleAction = { type };
    
    if (type === 'assign_to_user' && teamMembers.length > 0) {
      newAction.user_id = teamMembers[0].membership_user_id;
    }
    if (type === 'assign_to_pool') {
      newAction.user_ids = [];
    }
    if (type === 'apply_status' && statuses.length > 0) {
      newAction.status_id = statuses[0].id;
    }
    if (type === 'send_message') {
      newAction.content = '';
    }

    onChange({
      actions: [...actions.actions, newAction],
    });
  };

  const updateAction = (index: number, updates: Partial<RuleAction>) => {
    const newActions = [...actions.actions];
    newActions[index] = { ...newActions[index], ...updates };
    onChange({ actions: newActions });
  };

  const removeAction = (index: number) => {
    onChange({
      actions: actions.actions.filter((_, i) => i !== index),
    });
  };

  const togglePoolUser = (actionIndex: number, userId: string) => {
    const action = actions.actions[actionIndex];
    const currentIds = action.user_ids || [];
    const newIds = currentIds.includes(userId)
      ? currentIds.filter((id) => id !== userId)
      : [...currentIds, userId];
    updateAction(actionIndex, { user_ids: newIds });
  };

  const renderActionConfig = (action: RuleAction, index: number) => {
    switch (action.type) {
      case 'assign_to_user':
        return (
          <Select
            value={action.user_id || ''}
            onValueChange={(value) => updateAction(index, { user_id: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('rules.selectTeamMember')} />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((member) => (
                <SelectItem key={member.membership_user_id} value={member.membership_user_id}>
                  {member.full_name || member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'assign_to_pool':
        return (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">{t('rules.selectPoolMembers')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {teamMembers.map((member) => (
                <div key={member.membership_user_id} className="flex items-center gap-2">
                  <Checkbox
                    id={`pool-${index}-${member.membership_user_id}`}
                    checked={(action.user_ids || []).includes(member.membership_user_id)}
                    onCheckedChange={() => togglePoolUser(index, member.membership_user_id)}
                  />
                  <label
                    htmlFor={`pool-${index}-${member.membership_user_id}`}
                    className="text-sm cursor-pointer"
                  >
                    {member.full_name || member.email}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'apply_status':
        return (
          <Select
            value={action.status_id || ''}
            onValueChange={(value) => updateAction(index, { status_id: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('rules.selectStatus')} />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'send_message':
        return (
          <Textarea
            placeholder={t('rules.autoReplyPlaceholder')}
            value={action.content || ''}
            onChange={(e) => updateAction(index, { content: e.target.value })}
            rows={3}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <Label>{t('rules.actionsToExecute')}</Label>

      {actions.actions.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            No actions defined. Add actions to execute when conditions match.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {actions.actions.map((action, index) => (
            <Card key={index}>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {ACTION_OPTIONS.find((a) => a.value === action.type)?.label}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAction(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {renderActionConfig(action, index)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {ACTION_OPTIONS.map((actionType) => (
          <Button
            key={actionType.value}
            variant="outline"
            className="justify-start h-auto py-3"
            onClick={() => addAction(actionType.value)}
          >
            <div className="text-left">
              <div className="font-medium">{actionType.label}</div>
              <div className="text-xs text-muted-foreground">{actionType.description}</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
