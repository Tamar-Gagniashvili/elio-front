import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { RuleAction, ActionType } from '@/lib/ruleTypes';

interface ActionCardProps {
  action: RuleAction;
  onChange: (updates: Partial<RuleAction>) => void;
  onRemove: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const ACTION_OPTIONS: { value: ActionType; label: string; icon: string }[] = [
  { value: 'assign_to_user', label: 'Assign to', icon: '👤' },
  { value: 'assign_to_pool', label: 'Pool', icon: '👥' },
  { value: 'apply_status', label: 'Status', icon: '🏷️' },
  { value: 'send_message', label: 'Reply', icon: '💬' },
];

export function ActionCard({ action, onChange, onRemove, className, style }: ActionCardProps) {
  const { currentTenant } = useAuth();
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [statuses, setStatuses] = useState<{ id: string; name: string; color: string }[]>([]);

  useEffect(() => {
    if (currentTenant) {
      fetchUsers();
      fetchStatuses();
    }
  }, [currentTenant]);

  const fetchUsers = async () => {
    if (!currentTenant) return;
    
    // First get memberships
    const { data: memberships } = await supabase
      .from('tenant_memberships')
      .select('user_id')
      .eq('tenant_id', currentTenant.id)
      .eq('is_active', true);

    if (!memberships || memberships.length === 0) return;

    // Then fetch profiles for those user_ids
    const userIds = memberships.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);

    if (profiles) {
      setUsers(profiles.map((p) => ({
        id: p.user_id,
        name: p.full_name || p.email,
      })));
    }
  };

  const fetchStatuses = async () => {
    if (!currentTenant) return;
    const { data } = await supabase
      .from('lead_statuses')
      .select('id, name, color')
      .eq('tenant_id', currentTenant.id);

    if (data) {
      setStatuses(data);
    }
  };

  const renderActionConfig = () => {
    switch (action.type) {
      case 'assign_to_user':
        return (
          <Select
            value={action.user_id || ''}
            onValueChange={(value) => onChange({ user_id: value })}
          >
            <SelectTrigger className="h-7 text-xs bg-background/80">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-md z-50">
              {users.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No users found</div>
              ) : (
                users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        );

      case 'assign_to_pool':
        return (
          <div className="text-xs text-muted-foreground">
            Round-robin
          </div>
        );

      case 'apply_status':
        return (
          <Select
            value={action.status_id || ''}
            onValueChange={(value) => onChange({ status_id: value })}
          >
            <SelectTrigger className="h-7 text-xs bg-background/80">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-md z-50">
              {statuses.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No statuses found</div>
              ) : (
                statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.name}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        );

      case 'send_message':
        return (
          <Textarea
            className="text-xs bg-background/80 min-h-[50px] resize-none"
            placeholder="Message..."
            value={action.content || ''}
            onChange={(e) => onChange({ content: e.target.value })}
            rows={2}
          />
        );

      default:
        return null;
    }
  };

  const actionConfig = ACTION_OPTIONS.find(a => a.value === action.type);

  return (
    <div
      className={cn(
        'w-44 p-3 rounded-lg border-2 shadow-md relative group',
        className
      )}
      style={style}
    >
      {/* Pin decoration */}
      <div className="absolute -top-2 right-3 w-4 h-4 rounded-full bg-emerald-500 shadow-sm border-2 border-emerald-600" />
      
      {/* Remove button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="absolute -top-1 -right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-background rounded-full shadow"
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>

      <div className="space-y-2">
        {/* Action type with emoji */}
        <div className="flex items-center gap-2">
          <span className="text-lg">{actionConfig?.icon}</span>
          <Select
            value={action.type}
            onValueChange={(value: ActionType) => onChange({ type: value, user_id: undefined, status_id: undefined, content: undefined })}
          >
            <SelectTrigger className="h-7 text-xs font-medium bg-background/80 flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border shadow-md z-50">
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.icon} {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action configuration */}
        {renderActionConfig()}
      </div>
    </div>
  );
}