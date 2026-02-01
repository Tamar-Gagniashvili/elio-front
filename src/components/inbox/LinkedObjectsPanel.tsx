import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LinkedObject } from '@/hooks/useConversationObjects';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, X, Loader2, MapPin, DollarSign, Ruler, Building2, Truck, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LinkObjectDialog } from './LinkObjectDialog';

interface LinkedObjectsPanelProps {
  linkedObjects: LinkedObject[];
  loading: boolean;
  onLink: (objectId: string, newStatusId?: string) => Promise<boolean>;
  onUnlink: (linkId: string) => Promise<boolean>;
  tenantId: string;
  conversationId: string;
}

interface FieldDef {
  name: string;
  label: string;
  field_type: string;
}

const getStatusColor = (color: string) => {
  const colors: Record<string, string> = {
    gray: 'bg-gray-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
  };
  return colors[color] || colors.gray;
};

// Format field value based on type
const formatFieldValue = (value: any, fieldType: string): string => {
  if (value === null || value === undefined || value === '') return '';
  
  if (fieldType === 'price') {
    const num = parseFloat(value);
    return isNaN(num) ? '' : `$${num.toLocaleString()}`;
  }
  
  if (fieldType === 'number') {
    const num = parseFloat(value);
    return isNaN(num) ? '' : num.toLocaleString();
  }
  
  return String(value);
};

// Get icon for common field patterns
const getFieldIcon = (fieldName: string, fieldType: string) => {
  const name = fieldName.toLowerCase();
  if (name.includes('address') || name.includes('location') || name.includes('destination')) {
    return <MapPin className="h-3 w-3" />;
  }
  if (fieldType === 'price' || name.includes('price') || name.includes('cost')) {
    return <DollarSign className="h-3 w-3" />;
  }
  if (name.includes('area') || name.includes('sqm') || name.includes('square') || name.includes('size')) {
    return <Ruler className="h-3 w-3" />;
  }
  if (name.includes('floor') || name.includes('building')) {
    return <Building2 className="h-3 w-3" />;
  }
  if (name.includes('plate') || name.includes('vehicle') || name.includes('type')) {
    return <Truck className="h-3 w-3" />;
  }
  if (name.includes('tracking') || name.includes('number') || name.includes('id')) {
    return <Hash className="h-3 w-3" />;
  }
  return null;
};

export function LinkedObjectsPanel({
  linkedObjects,
  loading,
  onLink,
  onUnlink,
  tenantId,
  conversationId,
}: LinkedObjectsPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [fieldsByType, setFieldsByType] = useState<Record<string, FieldDef[]>>({});

  // Fetch field definitions for all object types in linked objects
  useEffect(() => {
    const objectTypeIds = [...new Set(linkedObjects.map(o => o.object_type_id).filter(Boolean))];
    if (objectTypeIds.length === 0) return;

    const fetchFields = async () => {
      const { data } = await supabase
        .from('object_type_fields')
        .select('name, label, field_type, object_type_id')
        .in('object_type_id', objectTypeIds)
        .order('display_order');

      if (data) {
        const grouped: Record<string, FieldDef[]> = {};
        data.forEach((f: any) => {
          if (f.field_type !== 'relation' && f.field_type !== 'object') {
            if (!grouped[f.object_type_id]) grouped[f.object_type_id] = [];
            grouped[f.object_type_id].push({ name: f.name, label: f.label, field_type: f.field_type });
          }
        });
        setFieldsByType(grouped);
      }
    };

    fetchFields();
  }, [linkedObjects]);

  const handleUnlink = async (linkId: string) => {
    setUnlinkingId(linkId);
    await onUnlink(linkId);
    setUnlinkingId(null);
  };

  // Get display details for an object
  const getObjectDetails = (obj: LinkedObject) => {
    const metadata = (obj.metadata || {}) as Record<string, any>;
    const fields = fieldsByType[obj.object_type_id] || [];
    const details: { label: string; value: string; icon: React.ReactNode }[] = [];
    
    for (const field of fields) {
      const value = formatFieldValue(metadata[field.name], field.field_type);
      if (value) {
        details.push({
          label: field.label,
          value,
          icon: getFieldIcon(field.name, field.field_type),
        });
      }
    }
    
    return details;
  };

  return (
    <div className="mt-6 px-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Linked Items
          </h4>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : linkedObjects.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">No items linked</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Link Item
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {linkedObjects.map((obj) => {
            const details = getObjectDetails(obj);
            
            return (
              <div
                key={obj.link_id}
                className="group relative bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">
                        {obj.object_type?.name}
                      </span>
                    </div>
                    <p className="font-medium text-sm truncate">{obj.display_name}</p>
                    {obj.status && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full',
                            getStatusColor(obj.status.color)
                          )}
                        />
                        <span className="text-xs text-muted-foreground">
                          {obj.status.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => obj.link_id && handleUnlink(obj.link_id)}
                    disabled={unlinkingId === obj.link_id}
                  >
                    {unlinkingId === obj.link_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                
                {/* Full metadata details */}
                {details.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      {details.map((detail, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center gap-1 text-xs text-muted-foreground overflow-hidden"
                        >
                          {detail.icon && (
                            <span className="shrink-0 text-muted-foreground/70">
                              {detail.icon}
                            </span>
                          )}
                          <span className="truncate">
                            <span className="text-muted-foreground/70">{detail.label}: </span>
                            <span className="text-foreground/80">{detail.value}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <LinkObjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onLink={onLink}
        tenantId={tenantId}
        linkedObjectIds={linkedObjects.map((o) => o.id)}
      />
    </div>
  );
}