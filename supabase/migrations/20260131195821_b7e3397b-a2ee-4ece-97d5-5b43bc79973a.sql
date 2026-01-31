-- Add column to store reassignment reason
ALTER TABLE public.conversations 
ADD COLUMN assignment_reason TEXT DEFAULT NULL;

-- Add column to track who reassigned
ALTER TABLE public.conversations 
ADD COLUMN reassigned_by UUID DEFAULT NULL;