import { useState } from 'react';
import { z } from 'zod';
import { api } from '@/lib/api';
import { ChannelType, ALL_CHANNELS, CHANNEL_CONFIG } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const tenantSchema = z.object({
  tenantName: z.string().trim().min(2, 'Company name must be at least 2 characters').max(80, 'Company name must be under 80 characters'),
  tenantSlug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be under 50 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  pricingMonthly: z
    .string()
    .refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Price must be 0 or greater')
    .refine((v) => parseFloat(v) <= 100000, 'Price must be under 100,000'),
  adminName: z.string().trim().min(2, 'Admin name must be at least 2 characters').max(80, 'Admin name must be under 80 characters'),
  adminEmail: z.string().trim().email('Invalid email address').max(255, 'Email must be under 255 characters'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be under 128 characters'),
  enabledChannels: z.array(z.string()).min(1, 'Select at least one channel'),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof tenantSchema>, string>>;

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
  const [pricingMonthly, setPricingMonthly] = useState('0');
  const [enabledChannels, setEnabledChannels] = useState<ChannelType[]>(['web_chat']);
  
  // Admin credentials
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');

  const [errors, setErrors] = useState<FieldErrors>({});

  const handleChannelToggle = (channel: ChannelType) => {
    setEnabledChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
    setErrors((p) => ({ ...p, enabledChannels: undefined }));
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = tenantSchema.safeParse({
      tenantName,
      tenantSlug,
      pricingMonthly,
      adminName,
      adminEmail,
      adminPassword,
      enabledChannels,
    });

    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      toast({
        title: 'Validation Error',
        description: 'Please fix the highlighted fields',
        variant: 'destructive',
      });
      return;
    }
    setErrors({});

    setIsLoading(true);

    try {
      // 1. Create the tenant
      const tenantData = await api.post<{ id: string }>('/tenants', {
        name: parsed.data.tenantName,
        slug: parsed.data.tenantSlug,
        pricing_monthly: parseFloat(parsed.data.pricingMonthly) || 0,
        enabled_channels: enabledChannels,
        is_active: true,
      });

      // 2. Create the admin user via edge function
      const { error: userError } = await api.invoke('create-user', {
        body: {
          email: parsed.data.adminEmail,
          password: parsed.data.adminPassword,
          fullName: parsed.data.adminName,
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
      setPricingMonthly('0');
      setEnabledChannels(['web_chat']);
      setAdminEmail('');
      setAdminPassword('');
      setAdminName('');
      setErrors({});
      
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
                  maxLength={80}
                  onChange={(e) => {
                    setTenantName(e.target.value);
                    setTenantSlug(generateSlug(e.target.value));
                    setErrors((p) => ({ ...p, tenantName: undefined, tenantSlug: undefined }));
                  }}
                  placeholder="Acme Corp"
                  disabled={isLoading}
                  aria-invalid={!!errors.tenantName}
                  className={cn(errors.tenantName && 'border-destructive')}
                />
                {errors.tenantName && <p className="text-xs text-destructive">{errors.tenantName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantSlug">Slug *</Label>
                <Input
                  id="tenantSlug"
                  value={tenantSlug}
                  maxLength={50}
                  onChange={(e) => {
                    setTenantSlug(e.target.value);
                    setErrors((p) => ({ ...p, tenantSlug: undefined }));
                  }}
                  placeholder="acme-corp"
                  disabled={isLoading}
                  aria-invalid={!!errors.tenantSlug}
                  className={cn(errors.tenantSlug && 'border-destructive')}
                />
                {errors.tenantSlug && <p className="text-xs text-destructive">{errors.tenantSlug}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricing">Monthly Price ($)</Label>
              <Input
                id="pricing"
                type="number"
                min="0"
                max="100000"
                step="0.01"
                value={pricingMonthly}
                onChange={(e) => {
                  setPricingMonthly(e.target.value);
                  setErrors((p) => ({ ...p, pricingMonthly: undefined }));
                }}
                disabled={isLoading}
                aria-invalid={!!errors.pricingMonthly}
                className={cn(errors.pricingMonthly && 'border-destructive')}
              />
              {errors.pricingMonthly && <p className="text-xs text-destructive">{errors.pricingMonthly}</p>}
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
            {errors.enabledChannels && <p className="text-xs text-destructive">{errors.enabledChannels}</p>}
          </div>

          {/* Admin Credentials */}
          <div className="space-y-4">
            <h3 className="font-semibold">Tenant Admin Credentials</h3>
            
            <div className="space-y-2">
              <Label htmlFor="adminName">Admin Full Name *</Label>
              <Input
                id="adminName"
                value={adminName}
                maxLength={80}
                onChange={(e) => {
                  setAdminName(e.target.value);
                  setErrors((p) => ({ ...p, adminName: undefined }));
                }}
                placeholder="John Doe"
                disabled={isLoading}
                aria-invalid={!!errors.adminName}
                className={cn(errors.adminName && 'border-destructive')}
              />
              {errors.adminName && <p className="text-xs text-destructive">{errors.adminName}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  maxLength={255}
                  onChange={(e) => {
                    setAdminEmail(e.target.value);
                    setErrors((p) => ({ ...p, adminEmail: undefined }));
                  }}
                  placeholder="admin@company.com"
                  disabled={isLoading}
                  aria-invalid={!!errors.adminEmail}
                  className={cn(errors.adminEmail && 'border-destructive')}
                />
                {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password *</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  maxLength={128}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setErrors((p) => ({ ...p, adminPassword: undefined }));
                  }}
                  placeholder="At least 8 characters"
                  disabled={isLoading}
                  aria-invalid={!!errors.adminPassword}
                  className={cn(errors.adminPassword && 'border-destructive')}
                />
                {errors.adminPassword && <p className="text-xs text-destructive">{errors.adminPassword}</p>}
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
