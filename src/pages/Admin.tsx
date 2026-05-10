import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Tenant, TenantMembership, Profile, ChannelType, ALL_CHANNELS, CHANNEL_CONFIG } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Building2, Users, DollarSign, LogOut, Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreateTenantDialog } from '@/components/admin/CreateTenantDialog';
import { TenantDetailsDialog } from '@/components/admin/TenantDetailsDialog';

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { toast } = useToast();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const loading = authLoading || superAdminLoading;

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    if (!isSuperAdmin) {
      navigate('/');
      return;
    }

    fetchTenants();
  }, [user, isSuperAdmin, loading, navigate]);

  const fetchTenants = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tenants',
        variant: 'destructive',
      });
    } else {
      setTenants((data || []) as Tenant[]);
    }
    setIsLoading(false);
  };

  const handleToggleTenantStatus = async (tenant: Tenant) => {
    const { error } = await supabase
      .from('tenants')
      .update({ is_active: !tenant.is_active })
      .eq('id', tenant.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tenant status',
        variant: 'destructive',
      });
    } else {
      fetchTenants();
      toast({
        title: 'Success',
        description: `Tenant ${tenant.is_active ? 'deactivated' : 'activated'}`,
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold truncate">Super Admin Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage all tenants and users</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="shrink-0">
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants.length}</div>
              <p className="text-xs text-muted-foreground">
                {tenants.filter(t => t.is_active !== false).length} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${tenants.reduce((sum, t) => sum + (t.pricing_monthly || 0), 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">From all active tenants</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Channels</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ALL_CHANNELS.length}</div>
              <p className="text-xs text-muted-foreground">Available channels</p>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Section */}
        <div className="flex items-center justify-between mb-6 gap-2">
          <h2 className="text-xl sm:text-2xl font-bold">Tenants</h2>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Tenant</span>
          </Button>
        </div>

        {tenants.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tenants yet</h3>
              <p className="text-muted-foreground mb-4">Create your first tenant to get started</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Tenant
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {tenants.map((tenant) => (
              <Card 
                key={tenant.id} 
                className={`cursor-pointer hover:shadow-md transition-shadow ${!tenant.is_active ? 'opacity-60' : ''}`}
                onClick={() => setSelectedTenant(tenant)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{tenant.name}</CardTitle>
                    <Badge variant={tenant.is_active !== false ? 'default' : 'secondary'}>
                      {tenant.is_active !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardDescription>@{tenant.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Monthly Price</span>
                      <span className="font-medium">${tenant.pricing_monthly || 0}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(tenant.enabled_channels || ['web_chat']).map((channel) => (
                        <Badge 
                          key={channel} 
                          variant="outline" 
                          className="text-xs"
                        >
                          {CHANNEL_CONFIG[channel as ChannelType]?.label || channel}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTenantStatus(tenant);
                      }}
                    >
                      {tenant.is_active !== false ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-2" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateTenantDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchTenants}
      />

      <TenantDetailsDialog
        tenant={selectedTenant}
        open={!!selectedTenant}
        onOpenChange={(open) => !open && setSelectedTenant(null)}
        onUpdate={fetchTenants}
      />
    </div>
  );
}
