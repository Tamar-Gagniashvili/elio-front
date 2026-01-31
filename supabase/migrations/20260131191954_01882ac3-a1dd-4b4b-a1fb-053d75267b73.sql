-- Add icon field to lead_statuses table
ALTER TABLE public.lead_statuses 
ADD COLUMN icon text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.lead_statuses.icon IS 'Optional icon name from lucide-react. If set, shown instead of color dot.';