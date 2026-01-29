import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Contact } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getStatusColorClasses } from '@/pages/Statuses';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadStatus {
  id: string;
  name: string;
  color: string;
}

interface ContactStatus {
  id: string;
  status_id: string;
}

interface ManageStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  onStatusesChanged?: () => void;
}

export function ManageStatusDialog({
  open,
  onOpenChange,
  contact,
  onStatusesChanged,
}: ManageStatusDialogProps) {
  const { user, currentTenant } = useAuth();
  const { toast } = useToast();
  
  const [availableStatuses, setAvailableStatuses] = useState<LeadStatus[]>([]);
  const [assignedStatusIds, setAssignedStatusIds] = useState<Set<string>>(new Set());
  const [contactStatusMap, setContactStatusMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && currentTenant) {
      fetchData();
    }
  }, [open, currentTenant, contact.id]);

  const fetchData = async () => {
    if (!currentTenant) return;
    
    setIsLoading(true);
    
    // Fetch available statuses
    const { data: statusesData } = await supabase
      .from('lead_statuses')
      .select('id, name, color')
      .eq('tenant_id', currentTenant.id)
      .order('created_at');

    // Fetch assigned statuses for this contact
    const { data: assignedData } = await supabase
      .from('contact_statuses')
      .select('id, status_id')
      .eq('contact_id', contact.id);

    setAvailableStatuses(statusesData || []);
    
    const assignedIds = new Set<string>();
    const statusMap = new Map<string, string>();
    
    (assignedData || []).forEach((cs: ContactStatus) => {
      assignedIds.add(cs.status_id);
      statusMap.set(cs.status_id, cs.id);
    });
    
    setAssignedStatusIds(assignedIds);
    setContactStatusMap(statusMap);
    setIsLoading(false);
  };

  const toggleStatus = async (statusId: string) => {
    if (!currentTenant || !user) return;
    
    setIsSaving(true);
    
    const isAssigned = assignedStatusIds.has(statusId);
    
    if (isAssigned) {
      // Remove status
      const contactStatusId = contactStatusMap.get(statusId);
      if (contactStatusId) {
        const { error } = await supabase
          .from('contact_statuses')
          .delete()
          .eq('id', contactStatusId);

        if (error) {
          toast({
            title: 'Error',
            description: 'Failed to remove status',
            variant: 'destructive',
          });
        } else {
          const newAssigned = new Set(assignedStatusIds);
          newAssigned.delete(statusId);
          setAssignedStatusIds(newAssigned);
          
          const newMap = new Map(contactStatusMap);
          newMap.delete(statusId);
          setContactStatusMap(newMap);
          
          onStatusesChanged?.();
        }
      }
    } else {
      // Add status
      const { data, error } = await supabase
        .from('contact_statuses')
        .insert({
          tenant_id: currentTenant.id,
          contact_id: contact.id,
          status_id: statusId,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to add status',
          variant: 'destructive',
        });
      } else if (data) {
        const newAssigned = new Set(assignedStatusIds);
        newAssigned.add(statusId);
        setAssignedStatusIds(newAssigned);
        
        const newMap = new Map(contactStatusMap);
        newMap.set(statusId, data.id);
        setContactStatusMap(newMap);
        
        onStatusesChanged?.();
      }
    }
    
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Manage Lead Statuses
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Select statuses to assign to <strong>{contact.name || 'this contact'}</strong>
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : availableStatuses.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No statuses available. Ask your admin to create some.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableStatuses.map((status) => {
                const colorClasses = getStatusColorClasses(status.color);
                const isAssigned = assignedStatusIds.has(status.id);

                return (
                  <button
                    key={status.id}
                    onClick={() => toggleStatus(status.id)}
                    disabled={isSaving}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all',
                      colorClasses.bg,
                      isAssigned 
                        ? 'border-primary ring-1 ring-primary' 
                        : cn(colorClasses.border, 'hover:border-primary/50')
                    )}
                  >
                    <Badge className={cn(colorClasses.bg, colorClasses.text, 'border', colorClasses.border)}>
                      {status.name}
                    </Badge>
                    {isAssigned ? (
                      <div className="flex items-center gap-1 text-primary">
                        <Check className="h-4 w-4" />
                        <span className="text-xs font-medium">Assigned</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Click to assign</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
