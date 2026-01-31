-- Add column to track if assignee has seen the assignment
ALTER TABLE public.conversations 
ADD COLUMN assignment_seen_by_assignee BOOLEAN NOT NULL DEFAULT true;

-- Set existing assigned conversations as seen (they're not "newly" assigned)
UPDATE public.conversations 
SET assignment_seen_by_assignee = true 
WHERE assigned_to IS NOT NULL;

-- When assigning to someone new, this should be set to false
-- The frontend will handle this when reassigning