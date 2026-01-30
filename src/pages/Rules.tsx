import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, GripVertical, Pencil, Trash2, Zap, Sparkles, Route, GitBranch } from 'lucide-react';
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

const RULE_COLORS = [
  'from-amber-500/20 to-orange-500/20 border-amber-300 dark:border-amber-700',
  'from-emerald-500/20 to-teal-500/20 border-emerald-300 dark:border-emerald-700',
  'from-blue-500/20 to-indigo-500/20 border-blue-300 dark:border-blue-700',
  'from-purple-500/20 to-pink-500/20 border-purple-300 dark:border-purple-700',
  'from-rose-500/20 to-red-500/20 border-rose-300 dark:border-rose-700',
];

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
      // Type cast the JSONB fields
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
        {/* Header with gradient background */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 p-6 border border-primary/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg">
                <Route className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  Routing Rules
                  <Sparkles className="h-5 w-5 text-amber-500" />
                </h1>
                <p className="text-muted-foreground">
                  Automate how leads flow through your pipeline ✨
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button onClick={handleCreate} className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                New Rule
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : rules.length === 0 ? (
          <Card className="border-2 border-dashed bg-gradient-to-br from-muted/50 to-muted/20">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-6">
                <div className="absolute inset-0 animate-ping bg-amber-500/20 rounded-full" />
                <div className="relative p-4 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
                  <Zap className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">No routing rules yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Create rules to automatically route leads based on channel, message content, language, and more. Let the magic happen! 🪄
              </p>
              {isAdmin && (
                <Button onClick={handleCreate} size="lg" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create your first rule
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <Card 
                key={rule.id} 
                className={`
                  relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.01]
                  bg-gradient-to-r ${RULE_COLORS[index % RULE_COLORS.length]}
                  ${!rule.is_active ? 'opacity-50 grayscale' : ''}
                `}
              >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                
                <CardHeader className="py-4 relative">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm cursor-grab">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm shadow-sm font-bold text-sm">
                        {index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        {rule.name}
                        {!rule.is_active && (
                          <Badge variant="secondary" className="bg-background/80">Paused</Badge>
                        )}
                        {rule.actions.elseActions && rule.actions.elseActions.length > 0 && (
                          <Badge variant="outline" className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-300">
                            +ELSE
                          </Badge>
                        )}
                      </CardTitle>
                      {rule.description && (
                        <CardDescription className="mt-1">{rule.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground text-right space-y-1">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="px-2 py-0.5 rounded-full bg-amber-200/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            {getConditionSummary(rule.conditions)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-200/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                            {getActionSummary(rule.actions)}
                          </span>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2 pl-2 border-l border-border/50">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={() => handleToggleActive(rule)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(rule)}
                            className="hover:bg-background/80"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(rule)}
                            className="hover:bg-destructive/20 hover:text-destructive"
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
