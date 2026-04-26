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
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Package, Loader2, Check, MapPin, DollarSign, Ruler, Building2, Truck, Hash, ArrowLeft, ChevronRight, Send, Link2, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  // Steps: 'select' -> 'details' -> 'confirm'
  const [step, setStep] = useState<'select' | 'details' | 'confirm'>('select');
  const [selectedObject, setSelectedObject] = useState<(BusinessObject & { status?: ObjectStatus }) | null>(null);
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null);
  const [relatedObjects, setRelatedObjects] = useState<RelatedObject[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  
  // Track selected fields for sending to chat (field name -> boolean)
  const [selectedMainFields, setSelectedMainFields] = useState<Record<string, boolean>>({});
  const [selectedRelatedFields, setSelectedRelatedFields] = useState<Record<string, Record<string, boolean>>>({});
  // Track if header (name + status) should be included
  const [includeMainHeader, setIncludeMainHeader] = useState(true);
  const [includeRelatedHeaders, setIncludeRelatedHeaders] = useState<Record<string, boolean>>({});

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep('select');
      setSelectedObject(null);
      setSelectedStatusId(null);
      setRelatedObjects([]);
      setSearch('');
      setSelectedMainFields({});
      setSelectedRelatedFields({});
      setIncludeMainHeader(true);
      setIncludeRelatedHeaders({});
      setFieldFilters({});
      setStatusFilter('');
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
          const relatedItem = {
            object: { 
              ...objData, 
              metadata: (objData.metadata || {}) as Record<string, unknown>,
              status: objData.object_statuses 
            },
            objectType: typeRes.data as ObjectType,
            fields: (fieldsRes.data || []) as ObjectTypeField[],
            relationLabel: field.label,
          };
          related.push(relatedItem);
          
          // Initialize related object fields as selected
          const relMeta = (objData.metadata || {}) as Record<string, any>;
          const initialRelatedFields: Record<string, boolean> = {};
          for (const f of relatedItem.fields) {
            if (f.field_type === 'relation' || f.field_type === 'object') continue;
            const value = relMeta[f.name];
            if (value !== null && value !== undefined && value !== '') {
              initialRelatedFields[f.name] = true;
            }
          }
          setSelectedRelatedFields(prev => ({ ...prev, [objData.id]: initialRelatedFields }));
          // Include related header by default
          setIncludeRelatedHeaders(prev => ({ ...prev, [objData.id]: true }));
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
    
    // Initialize all main fields as selected by default
    const metadata = (obj.metadata || {}) as Record<string, any>;
    const initialMainFields: Record<string, boolean> = {};
    for (const field of fields) {
      if (field.field_type === 'relation' || field.field_type === 'object') continue;
      const value = metadata[field.name];
      if (value !== null && value !== undefined && value !== '') {
        initialMainFields[field.name] = true;
      }
    }
    setSelectedMainFields(initialMainFields);
    setSelectedRelatedFields({});
    
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
    
    // Build message with only selected fields
    const message = formatObjectAsMessage(
      selectedObject, 
      fields, 
      relatedObjects, 
      selectedMainFields, 
      selectedRelatedFields,
      includeMainHeader,
      includeRelatedHeaders
    );
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

  // Get filterable fields (select fields and searchable fields)
  const filterableFields = fields.filter(f => 
    f.field_type === 'select' || (f.is_searchable && f.field_type !== 'object' && f.field_type !== 'relation')
  );

  // Get unique values for select fields
  const getSelectOptions = (fieldName: string): string[] => {
    const field = fields.find(f => f.name === fieldName);
    if (field?.field_type === 'select' && field.field_config) {
      const config = field.field_config as { options?: string[] };
      return config.options || [];
    }
    return [];
  };

  // Filter objects by search and field filters
  const filteredObjects = objects.filter((obj) => {
    const metadata = (obj.metadata || {}) as Record<string, any>;
    
    // Apply status filter
    if (statusFilter && obj.status_id !== statusFilter) {
      return false;
    }
    
    // Apply field filters
    for (const [fieldName, filterValue] of Object.entries(fieldFilters)) {
      if (!filterValue) continue;
      
      const field = fields.find(f => f.name === fieldName);
      const objValue = metadata[fieldName];
      
      if (field?.field_type === 'select') {
        // Exact match for select fields
        if (objValue !== filterValue) return false;
      } else {
        // Partial match for other fields
        if (!objValue || !String(objValue).toLowerCase().includes(filterValue.toLowerCase())) {
          return false;
        }
      }
    }
    
    // Apply search filter
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    
    if (obj.display_name.toLowerCase().includes(searchLower)) return true;
    
    for (const key of Object.keys(metadata)) {
      const value = metadata[key];
      if (value && String(value).toLowerCase().includes(searchLower)) {
        return true;
      }
    }
    
    return false;
  });

  const hasActiveFilters = statusFilter || Object.values(fieldFilters).some(v => v);
  
  const clearAllFilters = () => {
    setFieldFilters({});
    setStatusFilter('');
  };

  const availableObjects = filteredObjects.filter(
    (obj) => !linkedObjectIds.includes(obj.id)
  );

  const selectedType = objectTypes.find((t) => t.id === selectedTypeId);
  const currentStatus = statuses.find(s => s.id === selectedStatusId);

  const getObjectDetails = (obj: BusinessObject, objFields: ObjectTypeField[]) => {
    const metadata = (obj.metadata || {}) as Record<string, any>;
    const details: { name: string; label: string; value: string; icon: React.ReactNode; fieldType: string }[] = [];
    
    for (const field of objFields) {
      if (field.field_type === 'relation' || field.field_type === 'object') continue;
      const value = formatFieldValue(metadata[field.name], field.field_type);
      if (value) {
        details.push({
          name: field.name,
          label: field.label,
          value,
          icon: getFieldIcon(field.name, field.field_type),
          fieldType: field.field_type,
        });
      }
    }
    
    return details;
  };
  
  const toggleMainField = (fieldName: string) => {
    setSelectedMainFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };
  
  const toggleRelatedField = (objectId: string, fieldName: string) => {
    setSelectedRelatedFields(prev => ({
      ...prev,
      [objectId]: {
        ...prev[objectId],
        [fieldName]: !prev[objectId]?.[fieldName]
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
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
          <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
            {/* Fixed header section - never scrolls */}
            <div className="flex-shrink-0 space-y-4">
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

              {/* Filters */}
              {(statuses.length > 0 || filterableFields.length > 0) && (
                <Collapsible>
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-3.5 w-3.5" />
                        Filters
                        {hasActiveFilters && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            {Object.values(fieldFilters).filter(v => v).length + (statusFilter ? 1 : 0)}
                          </Badge>
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-8 px-2 text-xs text-muted-foreground">
                        <X className="h-3 w-3 mr-1" />
                        Clear all
                      </Button>
                    )}
                  </div>
                  <CollapsibleContent className="pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Status filter */}
                      {statuses.length > 0 && (
                        <Select
                          value={statusFilter || '__all__'}
                          onValueChange={(val) => setStatusFilter(val === '__all__' ? '' : val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border shadow-md">
                            <SelectItem value="__all__">All statuses</SelectItem>
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
                      )}
                      
                      {/* Field filters */}
                      {filterableFields.map((field) => (
                        field.field_type === 'select' ? (
                          <Select
                            key={field.id}
                            value={fieldFilters[field.name] || '__all__'}
                            onValueChange={(value) => setFieldFilters(prev => ({ ...prev, [field.name]: value === '__all__' ? '' : value }))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder={field.label} />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border shadow-md">
                              <SelectItem value="__all__">All {field.label}</SelectItem>
                              {getSelectOptions(field.name).filter(opt => opt).map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            key={field.id}
                            placeholder={field.label}
                            value={fieldFilters[field.name] || ''}
                            onChange={(e) => setFieldFilters(prev => ({ ...prev, [field.name]: e.target.value }))}
                            className="h-8 text-xs"
                          />
                        )
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            {/* Objects list - scrollable */}
            <ScrollArea className="flex-1 min-h-0 border rounded-lg">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : availableObjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                  <Package className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {search || hasActiveFilters
                      ? 'No matching items found'
                      : `No ${selectedType?.name_plural?.toLowerCase() || 'items'} available`}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="link" size="sm" onClick={clearAllFilters} className="mt-2 text-xs">
                      Clear filters
                    </Button>
                  )}
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
              <div 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setIncludeMainHeader(!includeMainHeader)}
              >
                <Checkbox 
                  checked={includeMainHeader}
                  onCheckedChange={() => setIncludeMainHeader(!includeMainHeader)}
                  className="h-4 w-4"
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
              </div>
              <p className="font-semibold text-lg ml-6">{selectedObject.display_name}</p>
              
              {(() => {
                const details = getObjectDetails(selectedObject, fields);
                return details.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-border/50">
                    {details.map((detail, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center gap-2 text-sm cursor-pointer group"
                        onClick={() => toggleMainField(detail.name)}
                      >
                        <Checkbox 
                          checked={selectedMainFields[detail.name] ?? false}
                          onCheckedChange={() => toggleMainField(detail.name)}
                          className="h-4 w-4"
                        />
                        {detail.icon && <span className="shrink-0 text-muted-foreground">{detail.icon}</span>}
                        <span className="group-hover:text-foreground transition-colors">
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
                    <div 
                      className="flex items-center gap-2 cursor-pointer group"
                      onClick={() => setIncludeRelatedHeaders(prev => ({ ...prev, [related.object.id]: !prev[related.object.id] }))}
                    >
                      <Checkbox 
                        checked={includeRelatedHeaders[related.object.id] ?? false}
                        onCheckedChange={() => setIncludeRelatedHeaders(prev => ({ ...prev, [related.object.id]: !prev[related.object.id] }))}
                        className="h-4 w-4"
                      />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                    </div>
                    <p className="font-semibold ml-6">{related.object.display_name}</p>
                    
                    {(() => {
                      const details = getObjectDetails(related.object, related.fields);
                      return details.length > 0 && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 pt-2 border-t border-border/30">
                          {details.map((detail, dIdx) => (
                            <div 
                              key={dIdx} 
                              className="flex items-center gap-1.5 text-xs cursor-pointer group"
                              onClick={() => toggleRelatedField(related.object.id, detail.name)}
                            >
                              <Checkbox 
                                checked={selectedRelatedFields[related.object.id]?.[detail.name] ?? false}
                                onCheckedChange={() => toggleRelatedField(related.object.id, detail.name)}
                                className="h-3.5 w-3.5"
                              />
                              {detail.icon && <span className="shrink-0 text-muted-foreground/70">{detail.icon}</span>}
                              <span className="group-hover:text-foreground transition-colors">
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
  relatedObjects: RelatedObject[],
  selectedMainFields: Record<string, boolean>,
  selectedRelatedFields: Record<string, Record<string, boolean>>,
  includeMainHeader: boolean,
  includeRelatedHeaders: Record<string, boolean>
): string {
  const metadata = (obj.metadata || {}) as Record<string, any>;
  let message = '';
  
  // Only include main header if selected
  if (includeMainHeader) {
    message = `📦 *${obj.display_name}*`;
    if (obj.status) {
      message += ` (${obj.status.name})`;
    }
    message += '\n';
  }
  
  // Add only selected main object fields
  const mainFields: string[] = [];
  for (const field of fields) {
    if (field.field_type === 'relation' || field.field_type === 'object') continue;
    if (!selectedMainFields[field.name]) continue; // Skip if not selected
    
    const value = metadata[field.name];
    if (value !== null && value !== undefined && value !== '') {
      const formatted = formatFieldValue(value, field.field_type);
      if (formatted) {
        mainFields.push(`• ${field.label}: ${formatted}`);
      }
    }
  }
  
  if (mainFields.length > 0) {
    if (message) message += '\n';
    message += mainFields.join('\n');
  }
  
  // Add related objects (only fields that are selected)
  for (const related of relatedObjects) {
    const relMeta = (related.object.metadata || {}) as Record<string, any>;
    const relSelectedFields = selectedRelatedFields[related.object.id] || {};
    const showHeader = includeRelatedHeaders[related.object.id] ?? false;
    
    // Check if header or any fields are selected for this related object
    const hasSelectedFields = Object.values(relSelectedFields).some(v => v);
    if (!showHeader && !hasSelectedFields) continue;
    
    // Add header if selected
    if (showHeader) {
      message += `\n\n🏢 *${related.relationLabel}: ${related.object.display_name}*`;
      if (related.object.status) {
        message += ` (${related.object.status.name})`;
      }
    }
    
    // Add selected fields
    const relFields: string[] = [];
    for (const field of related.fields) {
      if (field.field_type === 'relation' || field.field_type === 'object') continue;
      if (!relSelectedFields[field.name]) continue; // Skip if not selected
      
      const value = relMeta[field.name];
      if (value !== null && value !== undefined && value !== '') {
        const formatted = formatFieldValue(value, field.field_type);
        if (formatted) {
          relFields.push(`  • ${field.label}: ${formatted}`);
        }
      }
    }
    
    if (relFields.length > 0) {
      message += '\n' + relFields.join('\n');
    }
  }
  
  return message.trim();
}
