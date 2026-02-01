import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ObjectType, ObjectTypeField, ObjectStatus, BusinessObject } from '@/lib/objectTypes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Package, Loader2, MoreHorizontal, Archive, Pencil, Upload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ObjectEditor } from './ObjectEditor';
import { ImportObjectsDialog } from './ImportObjectsDialog';
import { useToast } from '@/hooks/use-toast';

interface ObjectsTableProps {
  objectTypes: ObjectType[];
  fields: Record<string, ObjectTypeField[]>;
  statuses: Record<string, ObjectStatus[]>;
  selectedTypeId: string | null;
  onSelectType: (typeId: string | null) => void;
  onRefresh: () => void;
}

export function ObjectsTable({
  objectTypes,
  fields,
  statuses,
  selectedTypeId,
  onSelectType,
  onRefresh,
}: ObjectsTableProps) {
  const { currentTenant, currentMembership } = useAuth();
  const { toast } = useToast();
  const [objects, setObjects] = useState<BusinessObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingObject, setEditingObject] = useState<BusinessObject | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [relatedObjectsMap, setRelatedObjectsMap] = useState<Record<string, string>>({});

  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';
  const selectedType = objectTypes.find((t) => t.id === selectedTypeId);
  const typeFields = selectedTypeId ? fields[selectedTypeId] || [] : [];
  const typeStatuses = selectedTypeId ? statuses[selectedTypeId] || [] : [];

  useEffect(() => {
    if (selectedTypeId && currentTenant?.id) {
      fetchObjects();
    } else {
      setObjects([]);
    }
  }, [selectedTypeId, currentTenant?.id, statusFilter]);

  const fetchObjects = async () => {
    if (!selectedTypeId || !currentTenant?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('objects')
        .select('*, object_statuses(*)')
        .eq('tenant_id', currentTenant.id)
        .eq('object_type_id', selectedTypeId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status_id', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const fetchedObjects = (data || []).map((obj: any) => ({
        ...obj,
        status: obj.object_statuses,
      }));
      
      setObjects(fetchedObjects);

      // Fetch related object names for 'object' type fields
      const objectFields = typeFields.filter((f) => f.field_type === 'object');
      if (objectFields.length > 0 && fetchedObjects.length > 0) {
        const relatedIds = new Set<string>();
        fetchedObjects.forEach((obj: BusinessObject) => {
          objectFields.forEach((field) => {
            const id = obj.metadata?.[field.name];
            if (id && typeof id === 'string') {
              relatedIds.add(id);
            }
          });
        });

        if (relatedIds.size > 0) {
          const { data: relatedData } = await supabase
            .from('objects')
            .select('id, display_name')
            .in('id', Array.from(relatedIds));

          const nameMap: Record<string, string> = {};
          (relatedData || []).forEach((obj: any) => {
            nameMap[obj.id] = obj.display_name;
          });
          setRelatedObjectsMap(nameMap);
        }
      }
    } catch (error) {
      console.error('Error fetching objects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (objectId: string, statusId: string) => {
    try {
      const { error } = await supabase
        .from('objects')
        .update({ status_id: statusId })
        .eq('id', objectId);

      if (error) throw error;

      setObjects((prev) =>
        prev.map((obj) =>
          obj.id === objectId
            ? { ...obj, status_id: statusId, status: typeStatuses.find((s) => s.id === statusId) }
            : obj
        )
      );

      toast({
        title: 'Status Updated',
        description: 'Object status has been updated.',
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async (objectId: string) => {
    try {
      const { error } = await supabase
        .from('objects')
        .update({ is_archived: true })
        .eq('id', objectId);

      if (error) throw error;

      setObjects((prev) => prev.filter((obj) => obj.id !== objectId));

      toast({
        title: 'Object Archived',
        description: 'The object has been archived.',
      });
    } catch (error) {
      console.error('Error archiving object:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive object.',
        variant: 'destructive',
      });
    }
  };

  const handleCreate = () => {
    setEditingObject(null);
    setEditorOpen(true);
  };

  const handleEdit = (obj: BusinessObject) => {
    setEditingObject(obj);
    setEditorOpen(true);
  };

  const getFieldValue = (obj: BusinessObject, field: ObjectTypeField) => {
    const value = obj.metadata?.[field.name];
    if (value === undefined || value === null) return '-';

    if (field.field_type === 'price') {
      const currency = field.field_config?.currency || 'USD';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(Number(value));
    }

    // Resolve object relations to display names
    if (field.field_type === 'object' && typeof value === 'string') {
      return relatedObjectsMap[value] || value.slice(0, 8) + '...';
    }

    return String(value);
  };

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

  // Filter objects by search
  const filteredObjects = objects.filter((obj) => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    
    // Search in display name
    if (obj.display_name.toLowerCase().includes(searchLower)) return true;
    
    // Search in searchable fields
    for (const field of typeFields.filter((f) => f.is_searchable)) {
      const value = obj.metadata?.[field.name];
      if (value && String(value).toLowerCase().includes(searchLower)) return true;
    }
    
    return false;
  });

  if (objectTypes.length === 0) {
    return (
      <div className="p-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Object Types Defined</h3>
            <p className="text-sm text-muted-foreground text-center">
              {isAdmin
                ? 'Create an object type first to start adding inventory.'
                : 'Ask your admin to create object types to manage inventory.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select
          value={selectedTypeId || ''}
          onValueChange={(value) => onSelectType(value || null)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {objectTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name_plural}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedTypeId && typeStatuses.length > 0 && (
          <Select
            value={statusFilter || 'all'}
            onValueChange={(value) => setStatusFilter(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {typeStatuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${getStatusColor(status.color)}`} />
                    {status.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isAdmin && selectedTypeId && (
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add {selectedType?.name || 'Object'}
            </Button>
          </>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !selectedTypeId ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Select an Object Type</h3>
            <p className="text-sm text-muted-foreground">
              Choose an object type from the dropdown to view inventory.
            </p>
          </CardContent>
        </Card>
      ) : filteredObjects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No {selectedType?.name_plural} Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? 'Try adjusting your search.' : `Start by adding your first ${selectedType?.name?.toLowerCase()}.`}
            </p>
            {isAdmin && !search && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add {selectedType?.name}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                {typeFields.slice(0, 4).map((field) => (
                  <TableHead key={field.id}>{field.label}</TableHead>
                ))}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredObjects.map((obj) => (
                <TableRow key={obj.id}>
                  <TableCell className="font-medium">{obj.display_name}</TableCell>
                  <TableCell>
                    <Select
                      value={obj.status_id || ''}
                      onValueChange={(value) => handleStatusChange(obj.id, value)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue>
                          {obj.status && (
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full ${getStatusColor(obj.status.color)}`}
                              />
                              {obj.status.name}
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {typeStatuses.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-2 w-2 rounded-full ${getStatusColor(status.color)}`}
                              />
                              {status.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  {typeFields.slice(0, 4).map((field) => (
                    <TableCell key={field.id}>{getFieldValue(obj, field)}</TableCell>
                  ))}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(obj)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem
                            onClick={() => handleArchive(obj.id)}
                            className="text-destructive"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedTypeId && (
        <ObjectEditor
          open={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            setEditingObject(null);
          }}
          objectType={selectedType!}
          fields={typeFields}
          statuses={typeStatuses}
          object={editingObject}
          onSave={() => {
            fetchObjects();
            setEditorOpen(false);
            setEditingObject(null);
          }}
        />
      )}

      <ImportObjectsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        objectTypes={objectTypes}
        fields={fields}
        statuses={statuses}
        onImportComplete={() => {
          fetchObjects();
          setImportOpen(false);
        }}
      />
    </div>
  );
}
