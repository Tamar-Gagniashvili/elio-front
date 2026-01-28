-- Phase 1B: Super Admin function and RLS policies

-- 1. Create a function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- 2. Update tenants RLS - super admin can see ALL tenants
DROP POLICY IF EXISTS "Users can view tenants they belong to" ON public.tenants;
CREATE POLICY "Users can view tenants they belong to" 
ON public.tenants 
FOR SELECT 
TO authenticated
USING (
  is_super_admin(auth.uid()) OR is_tenant_member(auth.uid(), id)
);

-- Super admin can manage all tenants
DROP POLICY IF EXISTS "Super admin can manage all tenants" ON public.tenants;
CREATE POLICY "Super admin can manage all tenants" 
ON public.tenants 
FOR ALL 
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- 3. Update profiles RLS - super admin can view all profiles
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
CREATE POLICY "Super admin can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_super_admin(auth.uid()));

-- Super admin can insert profiles (for creating users)
DROP POLICY IF EXISTS "Super admin can insert profiles" ON public.profiles;
CREATE POLICY "Super admin can insert profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

-- 4. Update tenant_memberships RLS - super admin can manage all memberships
DROP POLICY IF EXISTS "Super admin can manage all memberships" ON public.tenant_memberships;
CREATE POLICY "Super admin can manage all memberships" 
ON public.tenant_memberships 
FOR ALL 
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- 5. Update user_roles RLS - super admin can manage user roles
DROP POLICY IF EXISTS "Super admin can manage user roles" ON public.user_roles;
CREATE POLICY "Super admin can manage user roles" 
ON public.user_roles 
FOR ALL 
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- 6. Update channels RLS - super admin access
DROP POLICY IF EXISTS "Super admin can manage all channels" ON public.channels;
CREATE POLICY "Super admin can manage all channels" 
ON public.channels 
FOR ALL 
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- 7. Update conversations RLS - super admin access
DROP POLICY IF EXISTS "Super admin can view all conversations" ON public.conversations;
CREATE POLICY "Super admin can view all conversations" 
ON public.conversations 
FOR SELECT 
TO authenticated
USING (is_super_admin(auth.uid()));

-- 8. Update contacts RLS - super admin access
DROP POLICY IF EXISTS "Super admin can view all contacts" ON public.contacts;
CREATE POLICY "Super admin can view all contacts" 
ON public.contacts 
FOR SELECT 
TO authenticated
USING (is_super_admin(auth.uid()));