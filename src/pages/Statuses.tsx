import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Tag, Trash2, Edit2, Check, Sparkles, GripVertical, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_ICONS, StatusIndicator, getIconComponent } from '@/components/StatusIcon';
import { useTranslation } from 'react-i18next';

interface LeadStatus {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  icon?: string | null;
  created_at: string;
  created_by: string | null;
}

const STATUS_COLORS = [
  { name: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-800 dark:text-blue-200', dot: 'bg-blue-500', glow: 'shadow-blue-500/20' },
  { name: 'green', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-800 dark:text-green-200', dot: 'bg-green-500', glow: 'shadow-green-500/20' },
  { name: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-800 dark:text-yellow-200', dot: 'bg-yellow-500', glow: 'shadow-yellow-500/20' },
  { name: 'red', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-700', text: 'text-red-800 dark:text-red-200', dot: 'bg-red-500', glow: 'shadow-red-500/20' },
  { name: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-800 dark:text-purple-200', dot: 'bg-purple-500', glow: 'shadow-purple-500/20' },
  { name: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-800 dark:text-pink-200', dot: 'bg-pink-500', glow: 'shadow-pink-500/20' },
  { name: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-800 dark:text-orange-200', dot: 'bg-orange-500', glow: 'shadow-orange-500/20' },
  { name: 'cyan', bg: 'bg-cyan-100 dark:bg-cyan-900/30', border: 'border-cyan-300 dark:border-cyan-700', text: 'text-cyan-800 dark:text-cyan-200', dot: 'bg-cyan-500', glow: 'shadow-cyan-500/20' },
];

export function getStatusColorClasses(color: string) {
  return STATUS_COLORS.find(c => c.name === color) || STATUS_COLORS[0];
}

export function getColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#eab308',
    red: '#ef4444',
    purple: '#a855f7',
    pink: '#ec4899',
    orange: '#f97316',
    cyan: '#06b6d4',
  };
  return colorMap[colorName] || '#3b82f6';
}

type IndicatorMode = 'color' | 'icon';

export default function Statuses() {
  const navigate = useNavigate();
  const { user, loading: authLoading, currentTenant, currentMembership } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('blue');
  const [newStatusIcon, setNewStatusIcon] = useState<string | null>(null);
  const [newIndicatorMode, setNewIndicatorMode] = useState<IndicatorMode>('color');
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [editIndicatorMode, setEditIndicatorMode] = useState<IndicatorMode>('color');

  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!currentTenant) {
      navigate('/onboarding');
      return;
    }
    fetchStatuses();
  }, [user, authLoading, currentTenant, navigate]);

  const fetchStatuses = async () => {
    if (!currentTenant || !user) return;
    
    setIsLoading(true);
    
    const statusesResult = await supabase
      .from('lead_statuses')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .order('created_at', { ascending: true });

    if (statusesResult.error) {
      console.error('Error fetching statuses:', statusesResult.error);
      toast({
        title: t('common.error'),
        description: t('statuses.failedToFetch'),
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }
    
    setStatuses(statusesResult.data || []);

    let contactIdsToCount: string[] | null = null;
    
    if (!isAdmin) {
      const { data: assignedConversations } = await supabase
        .from('conversations')
        .select('contact_id')
        .eq('tenant_id', currentTenant.id)
        .eq('assigned_to', user.id);
      
      contactIdsToCount = assignedConversations?.map(c => c.contact_id) || [];
    }

    let countsQuery = supabase
      .from('contact_statuses')
      .select('status_id, contact_id')
      .eq('tenant_id', currentTenant.id);
    
    if (contactIdsToCount !== null) {
      if (contactIdsToCount.length === 0) {
        setStatusCounts({});
        setIsLoading(false);
        return;
      }
      countsQuery = countsQuery.in('contact_id', contactIdsToCount);
    }

    const countsResult = await countsQuery;

    if (countsResult.data) {
      const counts: Record<string, number> = {};
      countsResult.data.forEach((item) => {
        counts[item.status_id] = (counts[item.status_id] || 0) + 1;
      });
      setStatusCounts(counts);
    }

    setIsLoading(false);
  };

  const handleCreateStatus = async () => {
    if (!newStatusName.trim() || !currentTenant || !user) return;

    const { error } = await supabase
      .from('lead_statuses')
      .insert({
        tenant_id: currentTenant.id,
        name: newStatusName.trim(),
        color: newStatusColor,
        icon: newIndicatorMode === 'icon' ? newStatusIcon : null,
        created_by: user.id,
      });

    if (error) {
      toast({
        title: t('common.error'),
        description: t('statuses.failedToCreate'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('statuses.statusCreated'),
        description: t('statuses.statusCreatedDesc', { name: newStatusName }),
      });
      setNewStatusName('');
      setNewStatusColor('blue');
      setNewStatusIcon(null);
      setNewIndicatorMode('color');
      setIsAdding(false);
      fetchStatuses();
    }
  };

  const handleUpdateStatus = async () => {
    if (!editingStatus || !editName.trim()) return;

    const { error } = await supabase
      .from('lead_statuses')
      .update({
        name: editName.trim(),
        color: editColor,
        icon: editIndicatorMode === 'icon' ? editIcon : null,
      })
      .eq('id', editingStatus.id);

    if (error) {
      toast({
        title: t('common.error'),
        description: t('statuses.failedToUpdate'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('statuses.statusUpdated'),
        description: t('statuses.statusUpdatedDesc'),
      });
      setEditingStatus(null);
      fetchStatuses();
    }
  };

  const handleDeleteStatus = async (statusId: string, statusName: string) => {
    const { error } = await supabase
      .from('lead_statuses')
      .delete()
      .eq('id', statusId);

    if (error) {
      toast({
        title: t('common.error'),
        description: t('statuses.failedToDelete'),
        variant: 'destructive',
      });
    } else {
      toast({
        title: t('statuses.statusDeleted'),
        description: t('statuses.statusDeletedDesc', { name: statusName }),
      });
      fetchStatuses();
    }
  };

  const startEditing = (status: LeadStatus) => {
    setEditingStatus(status);
    setEditName(status.name);
    setEditColor(status.color);
    setEditIcon(status.icon || null);
    setEditIndicatorMode(status.icon ? 'icon' : 'color');
  };

  if (authLoading || isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const selectedColorClasses = getStatusColorClasses(newStatusColor);

  // Icon picker component
  const IconPicker = ({ 
    selectedIcon, 
    onSelect, 
    color 
  }: { 
    selectedIcon: string | null; 
    onSelect: (icon: string) => void; 
    color: string;
  }) => (
    <ScrollArea className="h-40">
      <div className="grid grid-cols-8 gap-2 p-1">
        {STATUS_ICONS.map((iconName) => {
          const IconComponent = getIconComponent(iconName);
          if (!IconComponent) return null;
          return (
            <button
              key={iconName}
              onClick={() => onSelect(iconName)}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                selectedIcon === iconName
                  ? 'ring-2 ring-primary bg-primary/10 scale-110'
                  : 'hover:bg-muted'
              )}
              style={{ color: selectedIcon === iconName ? getColorHex(color) : undefined }}
            >
              <IconComponent className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );

  // Color/Icon mode selector
  const IndicatorModeSelector = ({
    mode,
    onModeChange,
    color,
    onColorChange,
    icon,
    onIconChange,
  }: {
    mode: IndicatorMode;
    onModeChange: (mode: IndicatorMode) => void;
    color: string;
    onColorChange: (color: string) => void;
    icon: string | null;
    onIconChange: (icon: string) => void;
  }) => (
    <div className="space-y-3">
      <Tabs value={mode} onValueChange={(v) => onModeChange(v as IndicatorMode)}>
        <TabsList className="w-full">
          <TabsTrigger value="color" className="flex-1 gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            {t('statuses.color')}
          </TabsTrigger>
          <TabsTrigger value="icon" className="flex-1 gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            {t('statuses.icon')}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {mode === 'color' ? (
        <div className="flex flex-wrap gap-2">
          {STATUS_COLORS.map((c) => (
            <button
              key={c.name}
              onClick={() => onColorChange(c.name)}
              className={cn(
                'w-8 h-8 rounded-lg transition-all',
                c.dot,
                color === c.name
                  ? 'ring-2 ring-primary ring-offset-2 scale-110'
                  : 'hover:scale-105'
              )}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 mb-2">
            {STATUS_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => onColorChange(c.name)}
                className={cn(
                  'w-6 h-6 rounded-md transition-all',
                  c.dot,
                  color === c.name
                    ? 'ring-2 ring-primary ring-offset-1 scale-110'
                    : 'hover:scale-105 opacity-60'
                )}
              />
            ))}
          </div>
          <IconPicker selectedIcon={icon} onSelect={onIconChange} color={color} />
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="p-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <Tag className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t('statuses.title')}</h1>
              <p className="text-muted-foreground">
                {isAdmin 
                  ? t('statuses.subtitleAdmin')
                  : t('statuses.subtitleUser')}
              </p>
            </div>
          </div>
          {isAdmin && !isAdding && statuses.length > 0 && (
            <Button onClick={() => setIsAdding(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('statuses.newStatus')}
            </Button>
          )}
        </div>

        {/* Stats Bar */}
        {statuses.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-muted/50 border flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Tag className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{statuses.length}</p>
                <p className="text-xs text-muted-foreground">{t('statuses.totalStatuses')}</p>
              </div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {statuses.slice(0, 5).map((status) => {
                  const colorClasses = getStatusColorClasses(status.color);
                  return (
                    <div
                      key={status.id}
                      className={cn('h-5 w-5 rounded-full border-2 border-background flex items-center justify-center', colorClasses.dot)}
                    >
                      {status.icon && (
                        <StatusIndicator 
                          icon={status.icon} 
                          color={getColorHex(status.color)}
                          iconClass="h-3 w-3 text-white"
                        />
                      )}
                    </div>
                  );
                })}
                {statuses.length > 5 && (
                  <div className="h-5 w-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium">
                    +{statuses.length - 5}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{t('statuses.activeStatuses')}</p>
            </div>
          </div>
        )}

        {/* Add New Status Form */}
        {isAdmin && isAdding && (
          <Card className={cn(
            'mb-6 overflow-hidden border-2 animate-fade-in',
            selectedColorClasses.border
          )}>
            <div className={cn('h-2', selectedColorClasses.dot)} />
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">{t('statuses.createNewStatus')}</h3>
              </div>
              
              <div>
                <Label htmlFor="status-name" className="text-sm font-medium">{t('statuses.statusName')}</Label>
                <Input
                  id="status-name"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  placeholder={t('statuses.statusNamePlaceholder')}
                  className="mt-2"
                  autoFocus
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Indicator Style</Label>
                <div className="mt-2">
                  <IndicatorModeSelector
                    mode={newIndicatorMode}
                    onModeChange={setNewIndicatorMode}
                    color={newStatusColor}
                    onColorChange={setNewStatusColor}
                    icon={newStatusIcon}
                    onIconChange={setNewStatusIcon}
                  />
                </div>
              </div>

              {/* Preview */}
              {newStatusName && (
                <div className="pt-2">
                  <Label className="text-sm font-medium text-muted-foreground">Preview</Label>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
                      selectedColorClasses.bg,
                      selectedColorClasses.text,
                      selectedColorClasses.border,
                      'border'
                    )}>
                      <StatusIndicator 
                        icon={newIndicatorMode === 'icon' ? newStatusIcon : null} 
                        color={getColorHex(newStatusColor)}
                        colorDotClass="w-2 h-2"
                        iconClass="h-3.5 w-3.5"
                      />
                      {newStatusName}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <Button onClick={handleCreateStatus} disabled={!newStatusName.trim()} className="gap-2">
                  <Check className="h-4 w-4" />
                  Create Status
                </Button>
                <Button variant="ghost" onClick={() => { setIsAdding(false); setNewStatusName(''); }}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {statuses.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Tag className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No statuses yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-sm">
                {isAdmin 
                  ? 'Create your first status to start categorizing and tracking your leads effectively'
                  : 'Your admin hasn\'t created any statuses yet'}
              </p>
              {isAdmin && (
                <Button onClick={() => setIsAdding(true)} size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Create Your First Status
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          /* Status Grid */
          <div className="grid gap-3 sm:grid-cols-2">
            {statuses.map((status, index) => {
              const colorClasses = getStatusColorClasses(status.color);
              const isEditing = editingStatus?.id === status.id;

              return (
                <Card 
                  key={status.id} 
                  className={cn(
                    'group relative overflow-hidden transition-all duration-200 animate-fade-in',
                    isEditing 
                      ? 'ring-2 ring-primary shadow-lg' 
                      : 'hover:shadow-md hover:-translate-y-0.5'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Color accent bar */}
                  <div className={cn('absolute left-0 top-0 bottom-0 w-1', colorClasses.dot)} />
                  
                  <CardContent className="py-4 pl-5 pr-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="font-medium"
                          autoFocus
                        />
                        <IndicatorModeSelector
                          mode={editIndicatorMode}
                          onModeChange={setEditIndicatorMode}
                          color={editColor}
                          onColorChange={setEditColor}
                          icon={editIcon}
                          onIconChange={setEditIcon}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleUpdateStatus} className="gap-1">
                            <Check className="h-3 w-3" />
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingStatus(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => navigate(`/contacts?status=${status.id}`)}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-center gap-2">
                            <StatusIndicator 
                              icon={status.icon} 
                              color={getColorHex(status.color)}
                              colorDotClass="w-3 h-3"
                              iconClass="h-4 w-4"
                            />
                            <span className="font-medium">{status.name}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              {statusCounts[status.id] || 0} {(statusCounts[status.id] || 0) === 1 ? 'lead' : 'leads'}
                            </span>
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => { e.stopPropagation(); startEditing(status); }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => { e.stopPropagation(); handleDeleteStatus(status.id, status.name); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Help Text for Admins */}
        {isAdmin && statuses.length > 0 && !isAdding && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Tip: Click the <Edit2 className="h-3 w-3 inline-block mx-1" /> icon to edit or <Trash2 className="h-3 w-3 inline-block mx-1" /> to remove a status
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
