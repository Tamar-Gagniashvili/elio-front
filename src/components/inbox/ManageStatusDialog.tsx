import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLinkedContacts } from '@/hooks/useLinkedContacts';
import { Contact } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { StatusIndicator } from '@/components/StatusIcon';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Tag, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadStatus {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
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
  const { linkedContactIds, isLinked } = useLinkedContacts(
    contact.id, 
    currentTenant?.id || ''
  );
  
  const [availableStatuses, setAvailableStatuses] = useState<LeadStatus[]>([]);
  const [assignedStatusIds, setAssignedStatusIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && currentTenant && linkedContactIds.length > 0) {
      fetchData();
    }
  }, [open, currentTenant, linkedContactIds]);

  const fetchData = async () => {
    if (!currentTenant) return;
    
    setIsLoading(true);
    
    // Fetch available statuses
    const { data: statusesData } = await supabase
      .from('lead_statuses')
      .select('id, name, color, icon')
      .eq('tenant_id', currentTenant.id)
      .order('created_at');

    // Fetch assigned statuses for ALL linked contacts
    const { data: assignedData } = await supabase
      .from('contact_statuses')
      .select('status_id')
      .in('contact_id', linkedContactIds);

    setAvailableStatuses(statusesData || []);
    
    const assignedIds = new Set<string>();
    (assignedData || []).forEach((cs) => {
      assignedIds.add(cs.status_id);
    });
    
    setAssignedStatusIds(assignedIds);
    setIsLoading(false);
  };

  const toggleStatus = async (statusId: string) => {
    if (!currentTenant || !user) return;
    
    setIsSaving(true);
    
    const isAssigned = assignedStatusIds.has(statusId);
    
    if (isAssigned) {
      // Remove status from ALL linked contacts
      const { error } = await supabase
        .from('contact_statuses')
        .delete()
        .eq('status_id', statusId)
        .in('contact_id', linkedContactIds);

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
        onStatusesChanged?.();
      }
    } else {
      // Add status to ALL linked contacts
      const inserts = linkedContactIds.map(contactId => ({
        tenant_id: currentTenant.id,
        contact_id: contactId,
        status_id: statusId,
        created_by: user.id,
      }));

      const { error } = await supabase
        .from('contact_statuses')
        .upsert(inserts, { onConflict: 'contact_id,status_id' });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to add status',
          variant: 'destructive',
        });
      } else {
        const newAssigned = new Set(assignedStatusIds);
        newAssigned.add(statusId);
        setAssignedStatusIds(newAssigned);
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
          <p className="text-sm text-muted-foreground mb-2">
            Select statuses to assign to <strong>{contact.name || 'this contact'}</strong>
          </p>
          
          {isLinked && (
            <div className="flex items-center gap-2 mb-4 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
              <Link2 className="h-3 w-3" />
              <span>This contact is linked with {linkedContactIds.length - 1} other(s). Statuses will apply to all.</span>
            </div>
          )}

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
                const isAssigned = assignedStatusIds.has(status.id);

                return (
                  <button
                    key={status.id}
                    onClick={() => toggleStatus(status.id)}
                    disabled={isSaving}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all',
                      isAssigned 
                        ? 'border-primary ring-1 ring-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50 bg-muted/30'
                    )}
                  >
                    <span 
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                      style={{ 
                        backgroundColor: `${status.color}20`,
                        borderColor: `${status.color}40`,
                        color: status.color
                      }}
                    >
                      <StatusIndicator 
                        icon={status.icon} 
                        color={status.color} 
                        iconClass="h-3 w-3"
                        colorDotClass="h-2 w-2"
                      />
                      {status.name}
                    </span>
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
