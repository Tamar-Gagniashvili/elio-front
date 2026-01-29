import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Tag, Trash2, Edit2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadStatus {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  created_at: string;
  created_by: string | null;
}

const STATUS_COLORS = [
  { name: 'blue', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-800 dark:text-blue-200' },
  { name: 'green', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-700', text: 'text-green-800 dark:text-green-200' },
  { name: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-800 dark:text-yellow-200' },
  { name: 'red', bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-700', text: 'text-red-800 dark:text-red-200' },
  { name: 'purple', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-800 dark:text-purple-200' },
  { name: 'pink', bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-800 dark:text-pink-200' },
  { name: 'orange', bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-800 dark:text-orange-200' },
  { name: 'cyan', bg: 'bg-cyan-100 dark:bg-cyan-900/30', border: 'border-cyan-300 dark:border-cyan-700', text: 'text-cyan-800 dark:text-cyan-200' },
];

export function getStatusColorClasses(color: string) {
  return STATUS_COLORS.find(c => c.name === color) || STATUS_COLORS[0];
}

export default function Statuses() {
  const navigate = useNavigate();
  const { user, loading: authLoading, currentTenant, currentMembership } = useAuth();
  const { toast } = useToast();

  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('blue');
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

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
    if (!currentTenant) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('lead_statuses')
      .select('*')
      .eq('tenant_id', currentTenant.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching statuses:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch statuses',
        variant: 'destructive',
      });
    } else {
      setStatuses(data || []);
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
        created_by: user.id,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Status created successfully',
      });
      setNewStatusName('');
      setNewStatusColor('blue');
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
      })
      .eq('id', editingStatus.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Status updated successfully',
      });
      setEditingStatus(null);
      fetchStatuses();
    }
  };

  const handleDeleteStatus = async (statusId: string) => {
    const { error } = await supabase
      .from('lead_statuses')
      .delete()
      .eq('id', statusId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete status. It may be in use.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Status deleted successfully',
      });
      fetchStatuses();
    }
  };

  const startEditing = (status: LeadStatus) => {
    setEditingStatus(status);
    setEditName(status.name);
    setEditColor(status.color);
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

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
              <Tag className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Lead Statuses</h1>
              <p className="text-sm text-muted-foreground">
                {isAdmin 
                  ? 'Create and manage statuses for your leads' 
                  : 'View available lead statuses'}
              </p>
            </div>
          </div>
          {isAdmin && !isAdding && (
            <Button onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Status
            </Button>
          )}
        </div>

        {/* Add New Status Form */}
        {isAdmin && isAdding && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Create New Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status-name">Status Name</Label>
                <Input
                  id="status-name"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  placeholder="e.g., Wants to buy, Interested, Follow up..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {STATUS_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setNewStatusColor(color.name)}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all',
                        color.bg,
                        newStatusColor === color.name
                          ? 'ring-2 ring-primary ring-offset-2 scale-110'
                          : 'hover:scale-105'
                      )}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateStatus} disabled={!newStatusName.trim()}>
                  <Check className="h-4 w-4 mr-2" />
                  Create Status
                </Button>
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statuses List */}
        {statuses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tag className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No statuses yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                {isAdmin 
                  ? 'Create your first status to start categorizing leads'
                  : 'Your admin hasn\'t created any statuses yet'}
              </p>
              {isAdmin && (
                <Button onClick={() => setIsAdding(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Status
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {statuses.map((status) => {
              const colorClasses = getStatusColorClasses(status.color);
              const isEditing = editingStatus?.id === status.id;

              return (
                <Card key={status.id} className={cn(colorClasses.bg, colorClasses.border, 'border')}>
                  <CardContent className="py-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-background"
                        />
                        <div className="flex flex-wrap gap-2">
                          {STATUS_COLORS.map((color) => (
                            <button
                              key={color.name}
                              onClick={() => setEditColor(color.name)}
                              className={cn(
                                'w-6 h-6 rounded-full border-2 transition-all',
                                color.bg,
                                editColor === color.name
                                  ? 'ring-2 ring-primary ring-offset-1 scale-110'
                                  : 'hover:scale-105'
                              )}
                            />
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleUpdateStatus}>
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingStatus(null)}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={cn(colorClasses.bg, colorClasses.text, 'border', colorClasses.border)}>
                            {status.name}
                          </Badge>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditing(status)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteStatus(status.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
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
      </div>
    </AppLayout>
  );
}
