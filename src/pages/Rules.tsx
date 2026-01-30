import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, GripVertical, Pencil, Trash2, Zap, GitBranch } from 'lucide-react';
import { RuleEditor } from '@/components/rules/RuleEditor';
import type { RoutingRule, ConditionGroup, ActionsGroup } from '@/lib/ruleTypes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Rules() {
  const { currentTenant, currentMembership } = useAuth();
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<RoutingRule | null>(null);

  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';

  useEffect(() => {
    if (currentTenant) {
      fetchRules();
    }
  }, [currentTenant]);

  const fetchRules = async () => {
    if (!currentTenant) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('routing_rules')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .order('priority', { ascending: true });

    if (error) {
      toast({ title: 'Error loading rules', description: error.message, variant: 'destructive' });
    } else {
      const typedRules: RoutingRule[] = (data || []).map((rule) => ({
        ...rule,
        conditions: rule.conditions as unknown as ConditionGroup,
        actions: rule.actions as unknown as ActionsGroup,
      }));
      setRules(typedRules);
    }
    setLoading(false);
  };

  const handleToggleActive = async (rule: RoutingRule) => {
    const { error } = await supabase
      .from('routing_rules')
      .update({ is_active: !rule.is_active })
      .eq('id', rule.id);

    if (error) {
      toast({ title: 'Error updating rule', description: error.message, variant: 'destructive' });
    } else {
      setRules(rules.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
      toast({ title: rule.is_active ? 'Rule disabled' : 'Rule enabled' });
    }
  };

  const handleEdit = (rule: RoutingRule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setEditorOpen(true);
  };

  const handleDeleteClick = (rule: RoutingRule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ruleToDelete) return;

    const { error } = await supabase
      .from('routing_rules')
      .delete()
      .eq('id', ruleToDelete.id);

    if (error) {
      toast({ title: 'Error deleting rule', description: error.message, variant: 'destructive' });
    } else {
      setRules(rules.filter(r => r.id !== ruleToDelete.id));
      toast({ title: 'Rule deleted' });
    }
    setDeleteDialogOpen(false);
    setRuleToDelete(null);
  };

  const handleSaveComplete = () => {
    setEditorOpen(false);
    setEditingRule(null);
    fetchRules();
  };

  const getConditionSummary = (conditions: ConditionGroup) => {
    if (!conditions.conditions || conditions.conditions.length === 0) {
      return 'No conditions';
    }
    const count = conditions.conditions.length;
    return `${count} condition${count !== 1 ? 's' : ''} (${conditions.operator})`;
  };

  const getActionSummary = (actions: ActionsGroup) => {
    if (!actions.actions || actions.actions.length === 0) {
      return 'No actions';
    }
    return actions.actions.map(a => a.type.replace(/_/g, ' ')).join(', ');
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Routing Rules</h1>
            <p className="text-muted-foreground">
              Automate how leads flow through your pipeline
            </p>
          </div>
          {isAdmin && (
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : rules.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="p-3 rounded-full bg-muted mb-4">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No routing rules yet</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-md">
                Create rules to automatically route leads based on channel, message content, language, and more.
              </p>
              {isAdmin && (
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first rule
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <Card 
                key={rule.id} 
                className={`transition-all hover:shadow-md ${!rule.is_active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        {rule.name}
                        {!rule.is_active && (
                          <Badge variant="secondary">Paused</Badge>
                        )}
                        {rule.actions.elseActions && rule.actions.elseActions.length > 0 && (
                          <Badge variant="outline" className="text-xs">+ELSE</Badge>
                        )}
                      </CardTitle>
                      {rule.description && (
                        <CardDescription className="mt-1">{rule.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground text-right space-y-0.5">
                        <div>{getConditionSummary(rule.conditions)}</div>
                        <div>{getActionSummary(rule.actions)}</div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2 pl-3 border-l">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={() => handleToggleActive(rule)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(rule)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(rule)}
                            className="hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        <RuleEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          rule={editingRule}
          onSave={handleSaveComplete}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Rule</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{ruleToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
