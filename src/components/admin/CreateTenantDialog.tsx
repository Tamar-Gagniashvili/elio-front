import { useState } from 'react';
import { api } from '@/lib/api';
import { ChannelType, ALL_CHANNELS, CHANNEL_CONFIG } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTenantDialog({ open, onOpenChange, onSuccess }: CreateTenantDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantDomain, setTenantDomain] = useState('');
  const [pricingMonthly, setPricingMonthly] = useState('0');
  const [enabledChannels, setEnabledChannels] = useState<ChannelType[]>(['web_chat']);
  
  // Admin credentials
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');

  const handleChannelToggle = (channel: ChannelType) => {
    setEnabledChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantName || !tenantSlug || !tenantDomain || !adminEmail || !adminPassword || !adminName) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create the tenant
      const tenantData = await api.post<any>('/tenants', {
          name: tenantName,
          slug: tenantSlug,
          domain: tenantDomain,
          pricing_monthly: parseFloat(pricingMonthly) || 0,
          enabled_channels: enabledChannels,
          is_active: true,
      });

      // 2. Create the admin user via edge function
      const { data: userData, error: userError } = await api.invoke('create-user', {
        body: {
          email: adminEmail,
          password: adminPassword,
          fullName: adminName,
          tenantId: tenantData.id,
          role: 'owner',
        },
      });

      if (userError) {
        // Rollback tenant creation
        await api.delete(`/tenants/${tenantData.id}`);
        throw userError;
      }

      toast({
        title: 'Success',
        description: `Tenant "${tenantName}" created with admin user`,
      });

      // Reset form
      setTenantName('');
      setTenantSlug('');
      setTenantDomain('');
      setPricingMonthly('0');
      setEnabledChannels(['web_chat']);
      setAdminEmail('');
      setAdminPassword('');
      setAdminName('');
      
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create tenant',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Tenant</DialogTitle>
          <DialogDescription>
            Set up a new tenant with admin credentials and channel access
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Tenant Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenantName">Company Name *</Label>
                <Input
                  id="tenantName"
                  value={tenantName}
                  onChange={(e) => {
                    setTenantName(e.target.value);
                    const slug = generateSlug(e.target.value);
                    setTenantSlug(slug);
                    setTenantDomain(slug);
                  }}
                  placeholder="Acme Corp"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tenantSlug">Slug *</Label>
                <Input
                  id="tenantSlug"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  placeholder="acme-corp"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantDomain">Domain Prefix (Subdomain) *</Label>
                <div className="flex items-center gap-1">
                  <Input
                    id="tenantDomain"
                    value={tenantDomain}
                    onChange={(e) => setTenantDomain(e.target.value)}
                    placeholder="acme"
                    disabled={isLoading}
                  />
                  <span className="text-muted-foreground text-sm">.relink.app</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricing">Monthly Price ($)</Label>
              <Input
                id="pricing"
                type="number"
                min="0"
                step="0.01"
                value={pricingMonthly}
                onChange={(e) => setPricingMonthly(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Enabled Channels */}
          <div className="space-y-4">
            <h3 className="font-semibold">Enabled Channels</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ALL_CHANNELS.map((channel) => (
                <div key={channel} className="flex items-center space-x-2">
                  <Checkbox
                    id={`channel-${channel}`}
                    checked={enabledChannels.includes(channel)}
                    onCheckedChange={() => handleChannelToggle(channel)}
                    disabled={isLoading}
                  />
                  <Label htmlFor={`channel-${channel}`} className="cursor-pointer">
                    {CHANNEL_CONFIG[channel].label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Credentials */}
          <div className="space-y-4">
            <h3 className="font-semibold">Tenant Admin Credentials</h3>
            
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin Full Name *</Label>
              <Input
                id="adminName"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="John Doe"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@company.com"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password *</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Tenant'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
