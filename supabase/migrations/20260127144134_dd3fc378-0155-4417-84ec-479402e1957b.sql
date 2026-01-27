-- Drop and recreate the tenants INSERT policy with explicit TO authenticated
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;

-- Create policy that explicitly allows any authenticated user to insert
CREATE POLICY "Authenticated users can create tenants" 
ON public.tenants 
AS PERMISSIVE
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also need to ensure the user can see the tenant they just created
-- Currently they can only see it after membership is created, but we need to return the tenant immediately
-- Add a policy that allows users to see tenants they just created (within the same transaction)
DROP POLICY IF EXISTS "Users can view tenants they belong to" ON public.tenants;

CREATE POLICY "Users can view tenants they belong to" 
ON public.tenants 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (
  is_tenant_member(auth.uid(), id) OR
  -- Allow viewing tenant immediately after creation (for returning inserted row)
  EXISTS (
    SELECT 1 FROM public.tenant_memberships tm 
    WHERE tm.tenant_id = id AND tm.user_id = auth.uid()
  )
);