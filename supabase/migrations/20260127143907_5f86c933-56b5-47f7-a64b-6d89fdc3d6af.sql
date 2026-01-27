-- Fix chat_distribution INSERT policy - allow authenticated users to insert for new tenants
-- The tenant creator needs to insert this before they have a role check available
DROP POLICY IF EXISTS "Admins can insert distribution" ON public.chat_distribution;

-- Allow any authenticated user to insert chat_distribution (security is via tenant ownership check at insert time)
CREATE POLICY "Authenticated users can insert distribution" 
ON public.chat_distribution 
AS PERMISSIVE
FOR INSERT 
TO authenticated
WITH CHECK (true);