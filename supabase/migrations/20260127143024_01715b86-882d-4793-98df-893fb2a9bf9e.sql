-- Drop the existing restrictive policies on tenants
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can view tenants they belong to" ON public.tenants;
DROP POLICY IF EXISTS "Admins can update their tenant" ON public.tenants;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Authenticated users can create tenants" 
ON public.tenants 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view tenants they belong to" 
ON public.tenants 
FOR SELECT 
TO authenticated
USING (is_tenant_member(auth.uid(), id));

CREATE POLICY "Admins can update their tenant" 
ON public.tenants 
FOR UPDATE 
TO authenticated
USING (has_tenant_role(auth.uid(), id, 'admin'::app_role) OR has_tenant_role(auth.uid(), id, 'owner'::app_role));