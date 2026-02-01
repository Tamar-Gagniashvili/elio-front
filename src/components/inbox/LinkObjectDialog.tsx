import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Search, Package, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ObjectType, BusinessObject, ObjectStatus } from '@/lib/objectTypes';

interface LinkObjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLink: (objectId: string) => Promise<boolean>;
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

export function LinkObjectDialog({
  open,
  onOpenChange,
  onLink,
  tenantId,
  linkedObjectIds,
}: LinkObjectDialogProps) {
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [objects, setObjects] = useState<(BusinessObject & { status?: ObjectStatus })[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);

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

  // Fetch objects when type changes
  useEffect(() => {
    if (!selectedTypeId || !tenantId) {
      setObjects([]);
      return;
    }

    const fetchObjects = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('objects')
          .select('*, object_statuses(*)')
          .eq('tenant_id', tenantId)
          .eq('object_type_id', selectedTypeId)
          .eq('is_archived', false)
          .order('display_name');

        const mapped = (data || []).map((obj: any) => ({
          ...obj,
          status: obj.object_statuses,
        }));
        setObjects(mapped);
      } finally {
        setLoading(false);
      }
    };

    fetchObjects();
  }, [selectedTypeId, tenantId]);

  const handleLink = async (objectId: string) => {
    setLinking(objectId);
    const success = await onLink(objectId);
    setLinking(null);
    if (success) {
      onOpenChange(false);
    }
  };

  // Filter objects by search
  const filteredObjects = objects.filter((obj) => {
    if (!search.trim()) return true;
    return obj.display_name.toLowerCase().includes(search.toLowerCase());
  });

  // Exclude already linked objects
  const availableObjects = filteredObjects.filter(
    (obj) => !linkedObjectIds.includes(obj.id)
  );

  const selectedType = objectTypes.find((t) => t.id === selectedTypeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link Inventory Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
          <ScrollArea className="h-[300px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableObjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Package className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {search
                    ? 'No matching items found'
                    : `No ${selectedType?.name_plural?.toLowerCase() || 'items'} available`}
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {availableObjects.map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => handleLink(obj.id)}
                    disabled={linking === obj.id}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-md text-left transition-colors',
                      'hover:bg-muted focus:bg-muted focus:outline-none',
                      linking === obj.id && 'opacity-50'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {obj.display_name}
                      </p>
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
                    {linking === obj.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Check className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
