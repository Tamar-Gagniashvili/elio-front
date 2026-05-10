import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FlowBoard } from './FlowBoard';
import { NaturalLanguagePreview } from './NaturalLanguagePreview';
import { RuleTemplates } from './RuleTemplates';
import type { RoutingRule, ConditionGroup, ActionsGroup } from '@/lib/ruleTypes';
import { validateRule, emptyRuleErrors, hasErrors, type RuleErrors } from '@/lib/ruleValidation';
import { cn } from '@/lib/utils';

interface RuleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: RoutingRule | null;
  onSave: () => void;
}

export function RuleEditor({ open, onOpenChange, rule, onSave }: RuleEditorProps) {
  const { t } = useTranslation();
  const { currentTenant, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState<ConditionGroup>({ operator: 'AND', conditions: [] });
  const [actions, setActions] = useState<ActionsGroup>({ actions: [] });
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [statuses, setStatuses] = useState<{ id: string; name: string }[]>([]);
  const [errors, setErrors] = useState<RuleErrors>(emptyRuleErrors());

  useEffect(() => {
    if (currentTenant) {
      fetchUsersAndStatuses();
    }
  }, [currentTenant]);

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setDescription(rule.description || '');
      setConditions(rule.conditions);
      setActions(rule.actions);
    } else {
      setName('');
      setDescription('');
      setConditions({ operator: 'AND', conditions: [] });
      setActions({ actions: [] });
    }
    setErrors(emptyRuleErrors());
  }, [rule, open]);

  // Re-validate live once the user has attempted a save (errors exist).
  useEffect(() => {
    if (!hasErrors(errors)) return;
    setErrors(validateRule({ name, description, conditions, actions }, t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, conditions, actions]);

  const fetchUsersAndStatuses = async () => {
    if (!currentTenant) return;
    
    try {
      const [usersData, statusesData] = await Promise.all([
        api.get<any[]>(`/tenant-memberships?tenant_id=${currentTenant.id}&is_active=1`).catch(() => []),
        api.get<any[]>(`/lead-statuses?tenant_id=${currentTenant.id}&sort_by=name&sort_direction=asc`).catch(() => [])
      ]);

      if (usersData && Array.isArray(usersData)) {
        setUsers(usersData.filter(m => m.profile).map((m: any) => ({
          id: m.user_id,
          name: m.profile.full_name || m.profile.email,
        })));
      }
      
      if (statusesData && Array.isArray(statusesData)) {
        setStatuses(statusesData);
      }
    } catch (e) {
      console.error('Failed to fetch users or statuses:', e);
    }
  };

  const handleApplyTemplate = (templateConditions: ConditionGroup, templateActions: ActionsGroup, templateName: string, templateDescription: string) => {
    setConditions(templateConditions);
    setActions(templateActions);
    if (!name) setName(templateName);
    if (!description) setDescription(templateDescription);
  };

  const handleSave = async () => {
    if (!currentTenant) return;

    const validationErrors = validateRule({ name, description, conditions, actions }, t);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      toast({
        title: t('rules.validation.fixErrors'),
        description: validationErrors.general || validationErrors.name,
        variant: 'destructive',
      });
      return;
    }
    setErrors(emptyRuleErrors());

    setSaving(true);

    if (rule) {
      try {
        await api.put(`/routing-rules/${rule.id}`, {
          name: name.trim(),
          description: description.trim() || null,
          conditions: JSON.parse(JSON.stringify(conditions)),
          actions: JSON.parse(JSON.stringify(actions)),
        });
        toast({ title: t('rules.ruleUpdated') });
      } catch (error: any) {
        toast({ title: t('rules.errorUpdating'), description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
    } else {
      try {
        const existingRules = await api.get<any[]>(`/routing-rules?tenant_id=${currentTenant.id}&sort_by=priority&sort_direction=desc&per_page=1`);
        const nextPriority = existingRules && existingRules.length > 0 ? existingRules[0].priority + 1 : 0;

        await api.post('/routing-rules', {
          tenant_id: currentTenant.id,
          name: name.trim(),
          description: description.trim() || null,
          priority: nextPriority,
          conditions: JSON.parse(JSON.stringify(conditions)),
          actions: JSON.parse(JSON.stringify(actions)),
          created_by: user?.id,
        });
        toast({ title: t('rules.ruleCreated') });
      } catch (error: any) {
        toast({ title: t('rules.errorCreating'), description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSave();
  };

  const isNewRule = !rule;
  const isEmpty = conditions.conditions.length === 0 && actions.actions.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[calc(100vw-1rem)] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{rule ? t('rules.editRule') : t('rules.createNewRule')}</DialogTitle>
          <DialogDescription>
            {t('rules.buildFlow')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {isNewRule && isEmpty && (
            <RuleTemplates onApply={handleApplyTemplate} />
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <Label htmlFor="name" className="text-xs">{t('common.name')}</Label>
              <Input
                id="name"
                placeholder={t('rules.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn('h-8 text-sm', errors.name && 'border-destructive focus-visible:ring-destructive')}
                aria-invalid={!!errors.name}
                maxLength={80}
              />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name}</p>
              )}
            </div>
            <div className="flex-[2] min-w-0">
              <Label htmlFor="description" className="text-xs">{t('rules.descriptionOptional')}</Label>
              <Input
                id="description"
                placeholder={t('rules.descriptionPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-8 text-sm"
                maxLength={240}
              />
            </div>
          </div>

          {errors.general && (
            <p className="text-xs text-destructive">{errors.general}</p>
          )}

          <NaturalLanguagePreview
            conditions={conditions}
            actions={actions}
            users={users}
            statuses={statuses}
          />

          <FlowBoard
            conditions={conditions}
            actions={actions}
            onConditionsChange={setConditions}
            onActionsChange={setActions}
            conditionErrors={errors.conditions}
            actionErrors={errors.actions}
            elseActionErrors={errors.elseActions}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('rules.saving') : rule ? t('rules.updateRule') : t('rules.createRule')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
