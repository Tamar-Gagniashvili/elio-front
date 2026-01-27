-- First, drop ALL existing policies on tenants to start fresh
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can view tenants they belong to" ON public.tenants;
DROP POLICY IF EXISTS "Admins can update their tenant" ON public.tenants;

-- Now create PERMISSIVE policies (PERMISSIVE is the default, but being explicit)
CREATE POLICY "Authenticated users can create tenants" 
ON public.tenants 
AS PERMISSIVE
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view tenants they belong to" 
ON public.tenants 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (is_tenant_member(auth.uid(), id));

CREATE POLICY "Admins can update their tenant" 
ON public.tenants 
AS PERMISSIVE
FOR UPDATE 
TO authenticated
USING (has_tenant_role(auth.uid(), id, 'admin'::app_role) OR has_tenant_role(auth.uid(), id, 'owner'::app_role));

-- Also fix tenant_memberships, channels, and chat_distribution policies
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.tenant_memberships;
DROP POLICY IF EXISTS "Users can insert their own initial membership" ON public.tenant_memberships;
DROP POLICY IF EXISTS "Users can view memberships in their tenants" ON public.tenant_memberships;

CREATE POLICY "Users can insert their own initial membership" 
ON public.tenant_memberships 
AS PERMISSIVE
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view memberships in their tenants" 
ON public.tenant_memberships 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage memberships" 
ON public.tenant_memberships 
AS PERMISSIVE
FOR ALL 
TO authenticated
USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));

-- Fix chat_distribution policies
DROP POLICY IF EXISTS "Admins can insert distribution" ON public.chat_distribution;
DROP POLICY IF EXISTS "Members can update distribution" ON public.chat_distribution;
DROP POLICY IF EXISTS "Members can view distribution" ON public.chat_distribution;

CREATE POLICY "Admins can insert distribution" 
ON public.chat_distribution 
AS PERMISSIVE
FOR INSERT 
TO authenticated
WITH CHECK (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));

CREATE POLICY "Members can update distribution" 
ON public.chat_distribution 
AS PERMISSIVE
FOR UPDATE 
TO authenticated
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Members can view distribution" 
ON public.chat_distribution 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (is_tenant_member(auth.uid(), tenant_id));

-- Fix channels policies  
DROP POLICY IF EXISTS "Admins can manage channels" ON public.channels;
DROP POLICY IF EXISTS "Members can view channels" ON public.channels;

CREATE POLICY "Admins can manage channels" 
ON public.channels 
AS PERMISSIVE
FOR ALL 
TO authenticated
USING (has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role));

CREATE POLICY "Members can view channels" 
ON public.channels 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (is_tenant_member(auth.uid(), tenant_id));