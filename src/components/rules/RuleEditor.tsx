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
import { Textarea } from '@/components/ui/textarea';
import { FlowBoard } from './FlowBoard';
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

  const handleSave = async () => {
    if (!currentTenant || !name.trim()) {
      toast({ title: 'Please enter a rule name', variant: 'destructive' });
      return;
    }

    setSaving(true);

    if (rule) {
      // Update existing rule
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
      // Get max priority
      const { data: existingRules } = await supabase
        .from('routing_rules')
        .select('priority')
        .eq('tenant_id', currentTenant.id)
        .order('priority', { ascending: false })
        .limit(1);

      const nextPriority = existingRules && existingRules.length > 0 ? existingRules[0].priority + 1 : 0;

      // Create new rule
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle>
          <DialogDescription>
            Build your routing flow by adding condition and action cards
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
