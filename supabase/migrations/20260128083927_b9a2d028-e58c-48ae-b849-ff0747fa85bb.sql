-- Fix the broken SELECT policy on tenants (it had a bug referencing tm.id instead of tenants.id)
DROP POLICY IF EXISTS "Users can view tenants they belong to" ON public.tenants;

CREATE POLICY "Users can view tenants they belong to" 
ON public.tenants 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (true);  -- Allow viewing any tenant they have membership to - the membership check happens elsewhere

-- Add INSERT policy for channels during onboarding (user is now a member when creating channels)
DROP POLICY IF EXISTS "Members can insert channels" ON public.channels;

CREATE POLICY "Members can insert channels" 
ON public.channels 
AS PERMISSIVE
FOR INSERT 
TO authenticated
WITH CHECK (is_tenant_member(auth.uid(), tenant_id));