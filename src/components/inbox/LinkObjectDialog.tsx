import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Package, Loader2, Check, MapPin, DollarSign, Ruler, Building2, Truck, Hash, ArrowLeft, ChevronRight, Send, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ObjectType, BusinessObject, ObjectStatus, ObjectTypeField } from '@/lib/objectTypes';

interface LinkObjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (objectId: string, newStatusId?: string) => Promise<boolean>;
  onSendToChat?: (message: string) => void;
  tenantId: string;
  linkedObjectIds: string[];
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

const getFieldIcon = (fieldName: string, fieldType: string) => {
  const name = fieldName.toLowerCase();
  if (name.includes('address') || name.includes('location') || name.includes('destination')) {
    return <MapPin className="h-3.5 w-3.5" />;
  }
  if (fieldType === 'price' || name.includes('price') || name.includes('cost')) {
    return <DollarSign className="h-3.5 w-3.5" />;
  }
  if (name.includes('area') || name.includes('sqm') || name.includes('square') || name.includes('size')) {
    return <Ruler className="h-3.5 w-3.5" />;
  }
  if (name.includes('floor') || name.includes('building')) {
    return <Building2 className="h-3.5 w-3.5" />;
  }
  if (name.includes('plate') || name.includes('vehicle') || name.includes('type')) {
    return <Truck className="h-3.5 w-3.5" />;
  }
  if (name.includes('tracking') || name.includes('number') || name.includes('id')) {
    return <Hash className="h-3.5 w-3.5" />;
  }
  return null;
};

interface RelatedObject {
  object: BusinessObject & { status?: ObjectStatus };
  objectType: ObjectType;
  fields: ObjectTypeField[];
  relationLabel: string;
}

export function LinkObjectDialog({
  open,
  onOpenChange,
  onLink,
  onSendToChat,
  tenantId,
  linkedObjectIds,
}: LinkObjectDialogProps) {
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [objects, setObjects] = useState<(BusinessObject & { status?: ObjectStatus })[]>([]);
  const [statuses, setStatuses] = useState<ObjectStatus[]>([]);
  const [fields, setFields] = useState<ObjectTypeField[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Steps: 'select' -> 'details' -> 'confirm'
  const [step, setStep] = useState<'select' | 'details' | 'confirm'>('select');
  const [selectedObject, setSelectedObject] = useState<(BusinessObject & { status?: ObjectStatus }) | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [relatedObjects, setRelatedObjects] = useState<RelatedObject[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('select');
      setSelectedObject(null);
      setSelectedStatusId(null);
      setRelatedObjects([]);
      setSearch('');
    }
  }, [open]);

  // Fetch object types
  useEffect(() => {
    if (!open || !tenantId) return;

    const fetchTypes = async () => {
      const { data } = await supabase
        .from('object_types')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_archived', false)
        .order('name');

      setObjectTypes(data || []);
      if (data && data.length > 0 && !selectedTypeId) {
        setSelectedTypeId(data[0].id);
      }
    };

    fetchTypes();
  }, [open, tenantId]);

  // Fetch objects, fields, and statuses when type changes
  useEffect(() => {
    if (!selectedTypeId || !tenantId) {
      setObjects([]);
      setFields([]);
      setStatuses([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const [objectsRes, fieldsRes, statusesRes] = await Promise.all([
          supabase
            .from('objects')
            .select('*, object_statuses(*)')
            .eq('tenant_id', tenantId)
            .eq('object_type_id', selectedTypeId)
            .eq('is_archived', false)
            .order('display_name'),
          supabase
            .from('object_type_fields')
            .select('*')
            .eq('object_type_id', selectedTypeId)
            .order('display_order'),
          supabase
            .from('object_statuses')
            .select('*')
            .eq('object_type_id', selectedTypeId)
            .order('display_order'),
        ]);

        const mapped = (objectsRes.data || []).map((obj: any) => ({
          ...obj,
          status: obj.object_statuses,
        }));
        setObjects(mapped);
        setStatuses(statusesRes.data || []);
        setFields((fieldsRes.data || []) as ObjectTypeField[]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTypeId, tenantId]);

  // Fetch related objects when an item is selected
  const fetchRelatedObjects = async (obj: BusinessObject) => {
    setLoadingRelated(true);
    setRelatedObjects([]);
    
    try {
      const metadata = (obj.metadata || {}) as Record<string, any>;
      const objectFields = fields.filter(f => f.field_type === 'object');
      
      const related: RelatedObject[] = [];
      
      for (const field of objectFields) {
        const relatedObjectId = metadata[field.name];
        if (!relatedObjectId) continue;
        
        const config = field.field_config as { related_object_type_id?: string } || {};
        const relatedTypeId = config.related_object_type_id;
        if (!relatedTypeId) continue;
        
        // Fetch the related object, its type, fields, and status
        const [objRes, typeRes, fieldsRes] = await Promise.all([
          supabase
            .from('objects')
            .select('*, object_statuses(*)')
            .eq('id', relatedObjectId)
            .single(),
          supabase
            .from('object_types')
            .select('*')
            .eq('id', relatedTypeId)
            .single(),
          supabase
            .from('object_type_fields')
            .select('*')
            .eq('object_type_id', relatedTypeId)
            .order('display_order'),
        ]);
        
        if (objRes.data && typeRes.data) {
          const objData = objRes.data as any;
          related.push({
            object: { 
              ...objData, 
              metadata: (objData.metadata || {}) as Record<string, unknown>,
              status: objData.object_statuses 
            },
            objectType: typeRes.data as ObjectType,
            fields: (fieldsRes.data || []) as ObjectTypeField[],
            relationLabel: field.label,
          });
        }
      }
      
      setRelatedObjects(related);
    } finally {
      setLoadingRelated(false);
    }
  };

  const handleSelectObject = async (obj: BusinessObject & { status?: ObjectStatus }) => {
    setSelectedObject(obj);
    setSelectedStatusId(obj.status_id || null);
    setStep('details');
    await fetchRelatedObjects(obj);
  };

  const handleProceedToConfirm = () => {
    setStep('confirm');
  };

  const handleConfirmLink = async () => {
    if (!selectedObject) return;
    
    setLinking(true);
    const statusChanged = selectedStatusId !== selectedObject.status_id;
    const success = await onLink(selectedObject.id, statusChanged ? (selectedStatusId || undefined) : undefined);
    setLinking(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  const handleSendToChat = async () => {
    if (!selectedObject || !onSendToChat) return;
    
    setSending(true);
    
    // Build message with item details
    const message = formatObjectAsMessage(selectedObject, fields, relatedObjects);
    onSendToChat(message);
    
    setSending(false);
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('details');
    } else if (step === 'details') {
      setStep('select');
      setSelectedObject(null);
      setSelectedStatusId(null);
      setRelatedObjects([]);
    }
  };

  // Filter objects by search
  const filteredObjects = objects.filter((obj) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    
    if (obj.display_name.toLowerCase().includes(searchLower)) return true;
    
    if (obj.metadata) {
      const metadata = obj.metadata as Record<string, any>;
      for (const key of Object.keys(metadata)) {
        const value = metadata[key];
        if (value && String(value).toLowerCase().includes(searchLower)) {
          return true;
        }
      }
    }
    
    return false;
  });

  const availableObjects = filteredObjects.filter(
    (obj) => !linkedObjectIds.includes(obj.id)
  );

  const selectedType = objectTypes.find((t) => t.id === selectedTypeId);
  const currentStatus = statuses.find(s => s.id === selectedStatusId);

  const getObjectDetails = (obj: BusinessObject, objFields: ObjectTypeField[]) => {
    const metadata = (obj.metadata || {}) as Record<string, any>;
    const details: { label: string; value: string; icon: React.ReactNode; fieldType: string }[] = [];
    
    for (const field of objFields) {
      if (field.field_type === 'relation' || field.field_type === 'object') continue;
      const value = formatFieldValue(metadata[field.name], field.field_type);
      if (value) {
        details.push({
          label: field.label,
          value,
          icon: getFieldIcon(field.name, field.field_type),
          fieldType: field.field_type,
        });
      }
    }
    
    return details;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(step === 'details' || step === 'confirm') && (
              <Button variant="ghost" size="icon" className="h-6 w-6 -ml-1" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 'select' && 'Browse Inventory'}
            {step === 'details' && 'Item Details'}
            {step === 'confirm' && 'Link & Set Status'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Type selector */}
            <Select
              value={selectedTypeId || ''}
              onValueChange={setSelectedTypeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border shadow-md">
                {objectTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name_plural}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${selectedType?.name_plural?.toLowerCase() || 'items'}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Objects list */}
            <ScrollArea className="flex-1 border rounded-lg min-h-0">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableObjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                  <Package className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {search
                      ? 'No matching items found'
                      : `No ${selectedType?.name_plural?.toLowerCase() || 'items'} available`}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {availableObjects.map((obj) => {
                    const details = getObjectDetails(obj, fields.filter(f => f.field_type !== 'object' && f.field_type !== 'relation'));
                    
                    return (
                      <button
                        key={obj.id}
                        onClick={() => handleSelectObject(obj)}
                        className={cn(
                          'w-full p-3 rounded-lg text-left transition-colors border',
                          'hover:bg-muted hover:border-primary/30 focus:bg-muted focus:outline-none',
                          'bg-card border-border'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-medium text-sm">{obj.display_name}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {obj.status && (
                              <Badge variant="outline" className="text-[10px] h-5 gap-1">
                                <div className={cn('h-1.5 w-1.5 rounded-full', getStatusColor(obj.status.color))} />
                                {obj.status.name}
                              </Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        </div>
                        
                        {details.length > 0 && (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {details.slice(0, 4).map((detail, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground overflow-hidden">
                                {detail.icon && <span className="shrink-0 text-muted-foreground/70">{detail.icon}</span>}
                                <span className="truncate">
                                  <span className="text-muted-foreground/70">{detail.label}: </span>
                                  <span className="text-foreground/80">{detail.value}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {step === 'details' && selectedObject && (
          <div className="space-y-4 flex-1 overflow-auto">
            {/* Main item details */}
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Package className="h-3.5 w-3.5" />
                <span>{selectedType?.name}</span>
                {selectedObject.status && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="text-[10px] h-5 gap-1">
                      <div className={cn('h-1.5 w-1.5 rounded-full', getStatusColor(selectedObject.status.color))} />
                      {selectedObject.status.name}
                    </Badge>
                  </>
                )}
              </div>
              <p className="font-semibold text-lg">{selectedObject.display_name}</p>
              
              {(() => {
                const details = getObjectDetails(selectedObject, fields);
                return details.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-border/50">
                    {details.map((detail, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {detail.icon && <span className="shrink-0 text-muted-foreground">{detail.icon}</span>}
                        <span>
                          <span className="text-muted-foreground">{detail.label}: </span>
                          <span className="text-foreground font-medium">{detail.value}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Related objects */}
            {loadingRelated ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : relatedObjects.length > 0 && (
              <div className="space-y-3">
                <Separator />
                <h4 className="text-sm font-medium text-muted-foreground">Related Items</h4>
                
                {relatedObjects.map((related, idx) => (
                  <div key={idx} className="bg-muted/30 rounded-lg p-4 border border-dashed">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{related.relationLabel}: {related.objectType.name}</span>
                      {related.object.status && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-[10px] h-5 gap-1">
                            <div className={cn('h-1.5 w-1.5 rounded-full', getStatusColor(related.object.status.color))} />
                            {related.object.status.name}
                          </Badge>
                        </>
                      )}
                    </div>
                    <p className="font-semibold">{related.object.display_name}</p>
                    
                    {(() => {
                      const details = getObjectDetails(related.object, related.fields);
                      return details.length > 0 && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 pt-2 border-t border-border/30">
                          {details.map((detail, dIdx) => (
                            <div key={dIdx} className="flex items-center gap-1.5 text-xs">
                              {detail.icon && <span className="shrink-0 text-muted-foreground/70">{detail.icon}</span>}
                              <span>
                                <span className="text-muted-foreground/70">{detail.label}: </span>
                                <span className="text-foreground/80">{detail.value}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'confirm' && selectedObject && (
          <div className="space-y-4">
            {/* Selected item summary */}
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span>{selectedType?.name}</span>
              </div>
              <p className="font-semibold text-lg">{selectedObject.display_name}</p>
            </div>

            {/* Status selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Set Status</label>
              <Select
                value={selectedStatusId || ''}
                onValueChange={setSelectedStatusId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status...">
                    {currentStatus && (
                      <div className="flex items-center gap-2">
                        <div className={cn('h-2 w-2 rounded-full', getStatusColor(currentStatus.color))} />
                        {currentStatus.name}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-md">
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      <div className="flex items-center gap-2">
                        <div className={cn('h-2 w-2 rounded-full', getStatusColor(status.color))} />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStatusId !== selectedObject?.status_id && (
                <p className="text-xs text-muted-foreground">
                  Status will be updated when linked
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer actions */}
        {step === 'details' && (
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            {onSendToChat && (
              <Button 
                variant="outline" 
                onClick={handleSendToChat} 
                disabled={sending}
                className="flex-1"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send to Chat
              </Button>
            )}
            <Button onClick={handleProceedToConfirm} className="flex-1">
              <Link2 className="h-4 w-4 mr-2" />
              Link Item
            </Button>
          </DialogFooter>
        )}

        {step === 'confirm' && (
          <DialogFooter>
            <Button variant="outline" onClick={handleBack} disabled={linking}>
              Back
            </Button>
            <Button onClick={handleConfirmLink} disabled={linking}>
              {linking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirm Link
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Helper function to format object as a chat message
function formatObjectAsMessage(
  obj: BusinessObject & { status?: ObjectStatus },
  fields: ObjectTypeField[],
  relatedObjects: RelatedObject[]
): string {
  const metadata = (obj.metadata || {}) as Record<string, any>;
  let message = `📦 *${obj.display_name}*`;
  
  if (obj.status) {
    message += ` (${obj.status.name})`;
  }
  message += '\n\n';
  
  // Add main object fields
  for (const field of fields) {
    if (field.field_type === 'relation' || field.field_type === 'object') continue;
    const value = metadata[field.name];
    if (value !== null && value !== undefined && value !== '') {
      const formatted = formatFieldValue(value, field.field_type);
      if (formatted) {
        message += `• ${field.label}: ${formatted}\n`;
      }
    }
  }
  
  // Add related objects
  for (const related of relatedObjects) {
    const relMeta = (related.object.metadata || {}) as Record<string, any>;
    message += `\n🏢 *${related.relationLabel}: ${related.object.display_name}*`;
    if (related.object.status) {
      message += ` (${related.object.status.name})`;
    }
    message += '\n';
    
    for (const field of related.fields) {
      if (field.field_type === 'relation' || field.field_type === 'object') continue;
      const value = relMeta[field.name];
      if (value !== null && value !== undefined && value !== '') {
        const formatted = formatFieldValue(value, field.field_type);
        if (formatted) {
          message += `  • ${field.label}: ${formatted}\n`;
        }
      }
    }
  }
  
  return message.trim();
}
