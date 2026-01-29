-- Create a table for link groups with display name
CREATE TABLE public.contact_link_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.contact_link_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_link_groups
CREATE POLICY "Tenant members can view their link groups"
  ON public.contact_link_groups
  FOR SELECT
  USING (
    public.is_tenant_member(tenant_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Tenant members can create link groups"
  ON public.contact_link_groups
  FOR INSERT
  WITH CHECK (
    public.is_tenant_member(tenant_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Tenant members can update their link groups"
  ON public.contact_link_groups
  FOR UPDATE
  USING (
    public.is_tenant_member(tenant_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Tenant members can delete their link groups"
  ON public.contact_link_groups
  FOR DELETE
  USING (
    public.is_tenant_member(tenant_id, auth.uid())
    OR public.is_super_admin(auth.uid())
  );

-- Insert existing link groups from contact_links
INSERT INTO public.contact_link_groups (id, tenant_id, created_by, created_at)
SELECT DISTINCT link_group_id, tenant_id, created_by, MIN(created_at)
FROM public.contact_links
GROUP BY link_group_id, tenant_id, created_by;

-- Add foreign key from contact_links to contact_link_groups
ALTER TABLE public.contact_links
  ADD CONSTRAINT contact_links_link_group_id_fkey
  FOREIGN KEY (link_group_id)
  REFERENCES public.contact_link_groups(id)
  ON DELETE CASCADE;