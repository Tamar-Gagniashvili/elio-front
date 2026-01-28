-- Fix overly permissive INSERT policies

-- 1. Fix tenants INSERT - only super admin or authenticated users creating their first tenant
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;
CREATE POLICY "Authenticated users can create tenants" 
ON public.tenants 
FOR INSERT 
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid()) OR 
  NOT EXISTS (SELECT 1 FROM tenant_memberships WHERE user_id = auth.uid())
);

-- 2. Fix chat_distribution INSERT - only members of the tenant
DROP POLICY IF EXISTS "Authenticated users can insert distribution" ON public.chat_distribution;
CREATE POLICY "Members can insert distribution" 
ON public.chat_distribution 
FOR INSERT 
TO authenticated
WITH CHECK (is_tenant_member(auth.uid(), tenant_id) OR is_super_admin(auth.uid()));