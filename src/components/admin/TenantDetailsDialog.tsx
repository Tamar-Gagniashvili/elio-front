import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Tenant, TenantMembership, Profile, ChannelType, ALL_CHANNELS, CHANNEL_CONFIG, AppRole } from '@/lib/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, UserPlus, Save } from 'lucide-react';

interface TenantDetailsDialogProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

interface MemberWithProfile extends TenantMembership {
  profile?: Profile;
}

export function TenantDetailsDialog({ tenant, open, onOpenChange, onUpdate }: TenantDetailsDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  
  // Editable fields
  const [name, setName] = useState('');
  const [pricingMonthly, setPricingMonthly] = useState('0');
  const [enabledChannels, setEnabledChannels] = useState<ChannelType[]>([]);
  
  // New member form
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<AppRole>('sales');
  const [isAddingMember, setIsAddingMember] = useState(false);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name);
      setPricingMonthly(String(tenant.pricing_monthly || 0));
      setEnabledChannels((tenant.enabled_channels as ChannelType[]) || ['web_chat']);
      fetchMembers();
    }
  }, [tenant]);

  const fetchMembers = async () => {
    if (!tenant) return;
    
    setIsLoading(true);
    
    try {
      const data = await api.get<any[]>(`/memberships?tenant_id=${tenant.id}&sort_by=created_at&sort_direction=asc`);
      if (data) {
        setMembers(data);
      } else {
        setMembers([]);
      }
    } catch (e) {
      console.error('Error fetching members:', e);
    }
    setIsLoading(false);
  };

  const handleChannelToggle = (channel: ChannelType) => {
    setEnabledChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleSave = async () => {
    if (!tenant) return;
    
    setIsSaving(true);
    try {
      await api.put(`/tenants/${tenant.id}`, {
        name,
        pricing_monthly: parseFloat(pricingMonthly) || 0,
        enabled_channels: enabledChannels,
      });
      toast({ title: 'Success', description: 'Tenant updated successfully' });
      onUpdate();
    } catch {
      toast({ title: 'Error', description: 'Failed to update tenant', variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !newMemberEmail || !newMemberPassword || !newMemberName) return;

    setIsAddingMember(true);
    try {
      await api.post('/functions/create-user', {
        email: newMemberEmail,
        password: newMemberPassword,
        fullName: newMemberName,
        tenantId: tenant.id,
        role: newMemberRole,
      });

      toast({
        title: 'Success',
        description: 'Team member added successfully',
      });

      setNewMemberEmail('');
      setNewMemberPassword('');
      setNewMemberName('');
      setNewMemberRole('sales');
      setShowAddMember(false);
      fetchMembers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add team member',
        variant: 'destructive',
      });
    } finally {
      setIsAddingMember(false);
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tenant.name}</DialogTitle>
          <DialogDescription>@{tenant.slug}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="team">Team Members</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving}
                />
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
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-4">
                <Label>Enabled Channels</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ALL_CHANNELS.map((channel) => (
                    <div key={channel} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-channel-${channel}`}
                        checked={enabledChannels.includes(channel)}
                        onCheckedChange={() => handleChannelToggle(channel)}
                        disabled={isSaving}
                      />
                      <Label htmlFor={`edit-channel-${channel}`} className="cursor-pointer">
                        {CHANNEL_CONFIG[channel].label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Team Members</h3>
              <Button size="sm" onClick={() => setShowAddMember(!showAddMember)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </div>

            {showAddMember && (
              <form onSubmit={handleAddMember} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Jane Doe"
                      disabled={isAddingMember}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as AppRole)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      disabled={isAddingMember}
                    >
                      <option value="admin">Admin</option>
                      <option value="sales">Sales</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="jane@company.com"
                      disabled={isAddingMember}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={newMemberPassword}
                      onChange={(e) => setNewMemberPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isAddingMember}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={isAddingMember}>
                    {isAddingMember ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowAddMember(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No team members yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>{member.profile?.full_name || 'Unknown'}</TableCell>
                      <TableCell>{member.profile?.email || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{member.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? 'default' : 'secondary'}>
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
