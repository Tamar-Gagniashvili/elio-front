-- Fix 1: Remove overly permissive push_subscriptions policy
-- The service role already bypasses RLS, so USING(true) is unnecessary and dangerous

DROP POLICY IF EXISTS "Service can read all subscriptions" ON public.push_subscriptions;

-- Add a proper policy that only allows service_role or the user themselves
CREATE POLICY "Service role or user can read subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (
    auth.uid() = user_id
  );

-- Fix 2: Make chat-attachments bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-attachments';

-- Drop the overly permissive public view policy
DROP POLICY IF EXISTS "Public can view chat attachments" ON storage.objects;

-- Create proper tenant-based access policy for viewing
CREATE POLICY "Tenant members can view chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' AND
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id::text = (storage.foldername(name))[2]
    AND is_tenant_member(auth.uid(), c.tenant_id)
  )
);