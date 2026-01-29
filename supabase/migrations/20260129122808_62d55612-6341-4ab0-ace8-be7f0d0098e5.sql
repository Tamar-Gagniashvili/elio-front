-- Create contact_links table for linking contacts across channels
CREATE TABLE public.contact_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  link_group_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (contact_id) -- Each contact can only be in one link group
);

-- Create index for efficient queries
CREATE INDEX idx_contact_links_tenant_id ON public.contact_links(tenant_id);
CREATE INDEX idx_contact_links_link_group_id ON public.contact_links(link_group_id);
CREATE INDEX idx_contact_links_contact_id ON public.contact_links(contact_id);

-- Enable Row Level Security
ALTER TABLE public.contact_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Super admin can manage all contact links
CREATE POLICY "Super admin can manage all contact links"
ON public.contact_links
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Tenant members can view contact links in their tenant
CREATE POLICY "Members can view contact links"
ON public.contact_links
FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

-- Tenant members can create contact links in their tenant
CREATE POLICY "Members can create contact links"
ON public.contact_links
FOR INSERT
WITH CHECK (is_tenant_member(auth.uid(), tenant_id));

-- Tenant members can delete contact links in their tenant
CREATE POLICY "Members can delete contact links"
ON public.contact_links
FOR DELETE
USING (is_tenant_member(auth.uid(), tenant_id));

-- Tenant members can update contact links in their tenant (for merging groups)
CREATE POLICY "Members can update contact links"
ON public.contact_links
FOR UPDATE
USING (is_tenant_member(auth.uid(), tenant_id));