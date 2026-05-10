import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ObjectTypeList } from '@/components/objects/ObjectTypeList';
import { ObjectsTable } from '@/components/objects/ObjectsTable';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { ObjectType, ObjectTypeField, ObjectStatus } from '@/lib/objectTypes';
import { TableSkeleton, PageHeaderSkeleton } from '@/components/skeletons/ListSkeletons';

export default function Objects() {
  const { t } = useTranslation();
  const { currentTenant, currentMembership } = useAuth();
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [fields, setFields] = useState<Record<string, ObjectTypeField[]>>({});
  const [statuses, setStatuses] = useState<Record<string, ObjectStatus[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  const isAdmin = currentMembership?.role === 'admin' || currentMembership?.role === 'owner';

  useEffect(() => {
    if (currentTenant?.id) {
      fetchObjectTypes();
    }
  }, [currentTenant?.id]);

  const fetchObjectTypes = async () => {
    if (!currentTenant?.id) return;

    setLoading(true);
    try {
      // Fetch object types
      const { data: typesData, error: typesError } = await supabase
        .from('object_types')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: true });

      if (typesError) throw typesError;

      const types = (typesData || []) as ObjectType[];
      setObjectTypes(types);

      // Fetch fields for all types
      if (types.length > 0) {
        const { data: fieldsData, error: fieldsError } = await supabase
          .from('object_type_fields')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .in('object_type_id', types.map(t => t.id))
          .order('display_order', { ascending: true });

        if (fieldsError) throw fieldsError;

        const fieldsByType: Record<string, ObjectTypeField[]> = {};
        (fieldsData || []).forEach((field) => {
          const typedField: ObjectTypeField = {
            ...field,
            field_config: (field.field_config || {}) as ObjectTypeField['field_config'],
          };
          if (!fieldsByType[typedField.object_type_id]) {
            fieldsByType[typedField.object_type_id] = [];
          }
          fieldsByType[typedField.object_type_id].push(typedField);
        });
        setFields(fieldsByType);

        // Fetch statuses for all types
        const { data: statusesData, error: statusesError } = await supabase
          .from('object_statuses')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .in('object_type_id', types.map(t => t.id))
          .order('display_order', { ascending: true });

        if (statusesError) throw statusesError;

        const statusesByType: Record<string, ObjectStatus[]> = {};
        (statusesData || []).forEach((status: ObjectStatus) => {
          if (!statusesByType[status.object_type_id]) {
            statusesByType[status.object_type_id] = [];
          }
          statusesByType[status.object_type_id].push(status);
        });
        setStatuses(statusesByType);

        // Auto-select first type if none selected
        if (!selectedTypeId && types.length > 0) {
          setSelectedTypeId(types[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching object types:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-4">
          <PageHeaderSkeleton />
          <TableSkeleton rows={6} cols={5} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="border-b px-4 py-3">
          <h1 className="text-2xl font-bold">{t('objects.title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('objects.subtitle')}
          </p>
        </div>

        <Tabs defaultValue={isAdmin ? "types" : "inventory"} className="flex-1 flex flex-col">
          <div className="border-b px-4">
            <TabsList className="h-12">
              {isAdmin && (
                <TabsTrigger value="types" className="data-[state=active]:bg-background">
                  {t('objects.objectTypes')}
                </TabsTrigger>
              )}
              <TabsTrigger value="inventory" className="data-[state=active]:bg-background">
                {t('objects.title')}
              </TabsTrigger>
            </TabsList>
          </div>

          {isAdmin && (
            <TabsContent value="types" className="flex-1 m-0">
              <ObjectTypeList
                objectTypes={objectTypes}
                fields={fields}
                statuses={statuses}
                onRefresh={fetchObjectTypes}
              />
            </TabsContent>
          )}

          <TabsContent value="inventory" className="flex-1 m-0">
            <ObjectsTable
              objectTypes={objectTypes}
              fields={fields}
              statuses={statuses}
              selectedTypeId={selectedTypeId}
              onSelectType={setSelectedTypeId}
              onRefresh={fetchObjectTypes}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
