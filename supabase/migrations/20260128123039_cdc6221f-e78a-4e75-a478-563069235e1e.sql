-- Allow tenant members to view profiles of other members in their same tenant
CREATE POLICY "Tenant members can view profiles of other tenant members"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenant_memberships tm1
    WHERE tm1.user_id = auth.uid()
    AND tm1.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.tenant_memberships tm2
      WHERE tm2.user_id = profiles.user_id
      AND tm2.tenant_id = tm1.tenant_id
      AND tm2.is_active = true
    )
  )
);