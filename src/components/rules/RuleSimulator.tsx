import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ALL_CHANNELS, CHANNEL_CONFIG, type ChannelType } from '@/lib/types';
import { SUPPORTED_LANGUAGES } from '@/lib/ruleTypes';
import type { RoutingRule, ConditionGroup, ActionsGroup, RuleCondition, RuleAction } from '@/lib/ruleTypes';
import { CheckCircle2, XCircle, ArrowRight, Play, User, MessageSquare, Globe } from 'lucide-react';

interface RuleSimulatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: RoutingRule[];
}

interface SimulationInput {
  channel: ChannelType;
  messageContent: string;
  language: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  hour: number;
  dayOfWeek: number;
}

interface SimulationResult {
  rule: RoutingRule;
  matched: boolean;
  conditionResults: { condition: RuleCondition; passed: boolean }[];
  triggeredActions: RuleAction[];
  branch: 'then' | 'else' | null;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function RuleSimulator({ open, onOpenChange, rules }: RuleSimulatorProps) {
  const { currentTenant } = useAuth();
  const [input, setInput] = useState<SimulationInput>({
    channel: 'telegram',
    messageContent: '',
    language: 'en',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    hour: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
  });
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [statuses, setStatuses] = useState<{ id: string; name: string }[]>([]);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    if (currentTenant && open) {
      fetchUsersAndStatuses();
    }
  }, [currentTenant, open]);

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

  const evaluateCondition = (condition: RuleCondition, input: SimulationInput): boolean => {
    let fieldValue: string | number;

    switch (condition.field) {
      case 'channel_type':
        fieldValue = input.channel;
        break;
      case 'message_content':
        fieldValue = input.messageContent;
        break;
      case 'message_language':
        fieldValue = input.language;
        break;
      case 'contact.name':
        fieldValue = input.contactName;
        break;
      case 'contact.email':
        fieldValue = input.contactEmail;
        break;
      case 'contact.phone':
        fieldValue = input.contactPhone;
        break;
      case 'time.hour':
        fieldValue = input.hour;
        break;
      case 'time.day_of_week':
        fieldValue = input.dayOfWeek;
        break;
      default:
        return false;
    }

    const conditionValue = condition.value;
    const stringFieldValue = String(fieldValue).toLowerCase();
    const stringConditionValue = String(conditionValue).toLowerCase();

    switch (condition.operator) {
      case 'equals':
        return stringFieldValue === stringConditionValue;
      case 'not_equals':
        return stringFieldValue !== stringConditionValue;
      case 'contains':
        return stringFieldValue.includes(stringConditionValue);
      case 'not_contains':
        return !stringFieldValue.includes(stringConditionValue);
      case 'starts_with':
        return stringFieldValue.startsWith(stringConditionValue);
      case 'ends_with':
        return stringFieldValue.endsWith(stringConditionValue);
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      case 'in':
        if (Array.isArray(conditionValue)) {
          return conditionValue.map(v => String(v).toLowerCase()).includes(stringFieldValue);
        }
        return false;
      case 'not_in':
        if (Array.isArray(conditionValue)) {
          return !conditionValue.map(v => String(v).toLowerCase()).includes(stringFieldValue);
        }
        return true;
      default:
        return false;
    }
  };

  const evaluateConditionGroup = (conditions: ConditionGroup, input: SimulationInput): { allPassed: boolean; results: { condition: RuleCondition; passed: boolean }[] } => {
    if (!conditions.conditions || conditions.conditions.length === 0) {
      return { allPassed: true, results: [] };
    }

    const conditionResults = conditions.conditions.map(condition => ({
      condition,
      passed: evaluateCondition(condition, input),
    }));

    const allPassed = conditions.operator === 'AND'
      ? conditionResults.every(r => r.passed)
      : conditionResults.some(r => r.passed);

    return { allPassed, results: conditionResults };
  };

  const runSimulation = () => {
    const activeRules = rules.filter(r => r.is_active).sort((a, b) => a.priority - b.priority);
    
    const simulationResults: SimulationResult[] = activeRules.map(rule => {
      const { allPassed, results: conditionResults } = evaluateConditionGroup(rule.conditions, input);
      
      let triggeredActions: RuleAction[] = [];
      let branch: 'then' | 'else' | null = null;

      if (allPassed) {
        triggeredActions = rule.actions.actions || [];
        branch = 'then';
      } else if (rule.actions.elseActions && rule.actions.elseActions.length > 0) {
        triggeredActions = rule.actions.elseActions;
        branch = 'else';
      }

      return {
        rule,
        matched: allPassed,
        conditionResults,
        triggeredActions,
        branch,
      };
    });

    setResults(simulationResults);
    setHasRun(true);
  };

  const getActionLabel = (action: RuleAction): string => {
    switch (action.type) {
      case 'assign_to_user':
        const user = users.find(u => u.id === action.user_id);
        return `Assign to ${user?.name || 'Unknown user'}`;
      case 'assign_to_pool':
        const poolUsers = action.user_ids?.map(id => users.find(u => u.id === id)?.name).filter(Boolean);
        return `Round-robin: ${poolUsers?.join(', ') || 'No users'}`;
      case 'apply_status':
        const status = statuses.find(s => s.id === action.status_id);
        return `Apply status: ${status?.name || 'Unknown'}`;
      case 'send_message':
        return `Auto-reply: "${action.content?.substring(0, 30)}..."`;
      default:
        return action.type;
    }
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      'channel_type': 'Channel',
      'message_content': 'Message',
      'message_language': 'Language',
      'contact.name': 'Name',
      'contact.email': 'Email',
      'contact.phone': 'Phone',
      'time.hour': 'Hour',
      'time.day_of_week': 'Day',
    };
    return labels[field] || field;
  };

  const matchedCount = results.filter(r => r.branch === 'then').length;
  const elseCount = results.filter(r => r.branch === 'else').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Test Routing Rules
          </DialogTitle>
          <DialogDescription>
            Simulate an incoming message to see which rules would trigger
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
          {/* Simulation Input */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="col-span-2">
              <Label className="text-xs mb-1 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Message Content
              </Label>
              <Textarea
                placeholder="Type a sample message..."
                value={input.messageContent}
                onChange={(e) => setInput({ ...input, messageContent: e.target.value })}
                className="h-16 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs mb-1">Channel</Label>
              <Select
                value={input.channel}
                onValueChange={(value: ChannelType) => setInput({ ...input, channel: value })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CHANNELS.map(ch => (
                    <SelectItem key={ch} value={ch}>
                      {CHANNEL_CONFIG[ch].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1 flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Language
              </Label>
              <Select
                value={input.language}
                onValueChange={(value) => setInput({ ...input, language: value })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1 flex items-center gap-1">
                <User className="h-3 w-3" />
                Contact Name
              </Label>
              <Input
                placeholder="John Doe"
                value={input.contactName}
                onChange={(e) => setInput({ ...input, contactName: e.target.value })}
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs mb-1">Contact Email</Label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={input.contactEmail}
                onChange={(e) => setInput({ ...input, contactEmail: e.target.value })}
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs mb-1">Contact Phone</Label>
              <Input
                placeholder="+1234567890"
                value={input.contactPhone}
                onChange={(e) => setInput({ ...input, contactPhone: e.target.value })}
                className="h-8 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs mb-1">Hour (0-23)</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={input.hour}
                  onChange={(e) => setInput({ ...input, hour: parseInt(e.target.value) || 0 })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs mb-1">Day</Label>
                <Select
                  value={String(input.dayOfWeek)}
                  onValueChange={(value) => setInput({ ...input, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button onClick={runSimulation} className="gap-2">
              <Play className="h-4 w-4" />
              Run Simulation
            </Button>
          </div>

          {/* Results */}
          {hasRun && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Results:</span>
                <Badge variant="default" className="bg-emerald-500">
                  {matchedCount} matched
                </Badge>
                {elseCount > 0 && (
                  <Badge variant="secondary" className="bg-rose-100 text-rose-700">
                    {elseCount} ELSE triggered
                  </Badge>
                )}
                {results.filter(r => !r.branch).length > 0 && (
                  <Badge variant="outline">
                    {results.filter(r => !r.branch).length} skipped
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={result.rule.id}
                      className={`p-3 rounded-lg border ${
                        result.branch === 'then'
                          ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-700'
                          : result.branch === 'else'
                          ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-700'
                          : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {result.branch === 'then' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : result.branch === 'else' ? (
                          <XCircle className="h-4 w-4 text-rose-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium text-sm">{result.rule.name}</span>
                        {result.branch && (
                          <Badge variant="outline" className="text-xs">
                            {result.branch === 'then' ? 'THEN' : 'ELSE'} path
                          </Badge>
                        )}
                      </div>

                      {/* Condition results */}
                      {result.conditionResults.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {result.conditionResults.map((cr, i) => (
                            <span
                              key={i}
                              className={`text-xs px-2 py-0.5 rounded ${
                                cr.passed
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-800 dark:text-rose-200'
                              }`}
                            >
                              {getFieldLabel(cr.condition.field)} {cr.condition.operator} {String(cr.condition.value)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Triggered actions */}
                      {result.triggeredActions.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ArrowRight className="h-3 w-3" />
                          {result.triggeredActions.map((action, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {getActionLabel(action)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {results.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No active rules to test
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
