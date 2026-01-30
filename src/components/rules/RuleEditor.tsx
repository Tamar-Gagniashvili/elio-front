import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
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

interface RuleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: RoutingRule | null;
  onSave: () => void;
}

export function RuleEditor({ open, onOpenChange, rule, onSave }: RuleEditorProps) {
  const { currentTenant, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [conditions, setConditions] = useState<ConditionGroup>({ operator: 'AND', conditions: [] });
  const [actions, setActions] = useState<ActionsGroup>({ actions: [] });
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [statuses, setStatuses] = useState<{ id: string; name: string }[]>([]);

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
  }, [rule, open]);

  const fetchUsersAndStatuses = async () => {
    if (!currentTenant) return;
    
    const [usersRes, statusesRes] = await Promise.all([
      supabase
        .from('tenant_memberships')
        .select('user_id, profiles!inner(full_name, email)')
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true),
      supabase
        .from('lead_statuses')
        .select('id, name')
        .eq('tenant_id', currentTenant.id),
    ]);

    if (usersRes.data) {
      setUsers(usersRes.data.map((m: any) => ({
        id: m.user_id,
        name: m.profiles.full_name || m.profiles.email,
      })));
    }
    if (statusesRes.data) {
      setStatuses(statusesRes.data);
    }
  };

  const handleApplyTemplate = (templateConditions: ConditionGroup, templateActions: ActionsGroup, templateName: string, templateDescription: string) => {
    setConditions(templateConditions);
    setActions(templateActions);
    if (!name) setName(templateName);
    if (!description) setDescription(templateDescription);
  };

  const handleSave = async () => {
    if (!currentTenant || !name.trim()) {
      toast({ title: 'Please enter a rule name', variant: 'destructive' });
      return;
    }

    setSaving(true);

    if (rule) {
      const { error } = await supabase
        .from('routing_rules')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          conditions: JSON.parse(JSON.stringify(conditions)),
          actions: JSON.parse(JSON.stringify(actions)),
        })
        .eq('id', rule.id);

      if (error) {
        toast({ title: 'Error updating rule', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      toast({ title: 'Rule updated' });
    } else {
      const { data: existingRules } = await supabase
        .from('routing_rules')
        .select('priority')
        .eq('tenant_id', currentTenant.id)
        .order('priority', { ascending: false })
        .limit(1);

      const nextPriority = existingRules && existingRules.length > 0 ? existingRules[0].priority + 1 : 0;

      const { error } = await supabase
        .from('routing_rules')
        .insert([{
          tenant_id: currentTenant.id,
          name: name.trim(),
          description: description.trim() || null,
          priority: nextPriority,
          conditions: JSON.parse(JSON.stringify(conditions)),
          actions: JSON.parse(JSON.stringify(actions)),
          created_by: user?.id,
        }]);

      if (error) {
        toast({ title: 'Error creating rule', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      toast({ title: 'Rule created' });
    }

    setSaving(false);
    onSave();
  };

  const isNewRule = !rule;
  const isEmpty = conditions.conditions.length === 0 && actions.actions.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
          <DialogDescription>
            Build your routing flow using the visual board below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rule templates for new rules */}
          {isNewRule && isEmpty && (
            <RuleTemplates onApply={handleApplyTemplate} />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                placeholder="e.g., Georgian Speakers"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Route Georgian speakers to..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Natural language preview */}
          <NaturalLanguagePreview
            conditions={conditions}
            actions={actions}
            users={users}
            statuses={statuses}
          />

          {/* Flow Board */}
          <FlowBoard
            conditions={conditions}
            actions={actions}
            onConditionsChange={setConditions}
            onActionsChange={setActions}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
