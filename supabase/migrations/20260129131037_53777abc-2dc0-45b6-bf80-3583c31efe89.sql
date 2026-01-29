-- Fix RLS policies with correct parameter order for is_tenant_member
-- The function signature is: is_tenant_member(_user_id uuid, _tenant_id uuid)

-- Drop existing policies
DROP POLICY IF EXISTS "Tenant members can view their link groups" ON public.contact_link_groups;
DROP POLICY IF EXISTS "Tenant members can create link groups" ON public.contact_link_groups;
DROP POLICY IF EXISTS "Tenant members can update their link groups" ON public.contact_link_groups;
DROP POLICY IF EXISTS "Tenant members can delete their link groups" ON public.contact_link_groups;

-- Recreate with correct parameter order
CREATE POLICY "Tenant members can view their link groups"
  ON public.contact_link_groups
  FOR SELECT
  USING (
    public.is_tenant_member(auth.uid(), tenant_id)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Tenant members can create link groups"
  ON public.contact_link_groups
  FOR INSERT
  WITH CHECK (
    public.is_tenant_member(auth.uid(), tenant_id)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Tenant members can update their link groups"
  ON public.contact_link_groups
  FOR UPDATE
  USING (
    public.is_tenant_member(auth.uid(), tenant_id)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Tenant members can delete their link groups"
  ON public.contact_link_groups
  FOR DELETE
  USING (
    public.is_tenant_member(auth.uid(), tenant_id)
    OR public.is_super_admin(auth.uid())
  );