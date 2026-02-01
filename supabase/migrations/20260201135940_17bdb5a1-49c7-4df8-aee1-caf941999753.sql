-- Create enum for field types
CREATE TYPE object_field_type AS ENUM ('text', 'number', 'price', 'select', 'relation');

-- Object Types table: Define what types of items the tenant sells
CREATE TABLE public.object_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_plural text NOT NULL,
  icon text DEFAULT 'Package',
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Object Type Fields table: Custom fields for each object type
CREATE TABLE public.object_type_fields (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  object_type_id uuid NOT NULL REFERENCES public.object_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  label text NOT NULL,
  field_type object_field_type NOT NULL DEFAULT 'text',
  field_config jsonb DEFAULT '{}'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  is_searchable boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Object Statuses table: Status definitions per object type
CREATE TABLE public.object_statuses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  object_type_id uuid NOT NULL REFERENCES public.object_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'gray',
  is_default boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Objects table: The actual business objects/inventory items
CREATE TABLE public.objects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  object_type_id uuid NOT NULL REFERENCES public.object_types(id) ON DELETE CASCADE,
  status_id uuid REFERENCES public.object_statuses(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  is_archived boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Conversation Objects table: Links between conversations and objects
CREATE TABLE public.conversation_objects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  object_id uuid NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  linked_by uuid,
  linked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, object_id)
);

-- Enable RLS on all tables
ALTER TABLE public.object_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.object_type_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.object_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_objects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for object_types
CREATE POLICY "Admins can manage object types"
ON public.object_types FOR ALL
USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));

CREATE POLICY "Members can view non-archived object types"
ON public.object_types FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id) AND is_archived = false);

-- RLS Policies for object_type_fields
CREATE POLICY "Admins can manage object type fields"
ON public.object_type_fields FOR ALL
USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));

CREATE POLICY "Members can view object type fields"
ON public.object_type_fields FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

-- RLS Policies for object_statuses
CREATE POLICY "Admins can manage object statuses"
ON public.object_statuses FOR ALL
USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));

CREATE POLICY "Members can view object statuses"
ON public.object_statuses FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

-- RLS Policies for objects
CREATE POLICY "Admins can manage all objects"
ON public.objects FOR ALL
USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));

CREATE POLICY "Members can view non-archived objects"
ON public.objects FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id) AND is_archived = false);

CREATE POLICY "Members can update object status"
ON public.objects FOR UPDATE
USING (is_tenant_member(auth.uid(), tenant_id))
WITH CHECK (is_tenant_member(auth.uid(), tenant_id));

-- RLS Policies for conversation_objects
CREATE POLICY "Members can manage conversation objects"
ON public.conversation_objects FOR ALL
USING (is_tenant_member(auth.uid(), tenant_id));

-- Create indexes for performance
CREATE INDEX idx_object_types_tenant ON public.object_types(tenant_id);
CREATE INDEX idx_object_type_fields_type ON public.object_type_fields(object_type_id);
CREATE INDEX idx_object_statuses_type ON public.object_statuses(object_type_id);
CREATE INDEX idx_objects_tenant ON public.objects(tenant_id);
CREATE INDEX idx_objects_type ON public.objects(object_type_id);
CREATE INDEX idx_objects_status ON public.objects(status_id);
CREATE INDEX idx_conversation_objects_conversation ON public.conversation_objects(conversation_id);
CREATE INDEX idx_conversation_objects_object ON public.conversation_objects(object_id);

-- Add updated_at triggers
CREATE TRIGGER update_object_types_updated_at
BEFORE UPDATE ON public.object_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_objects_updated_at
BEFORE UPDATE ON public.objects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();