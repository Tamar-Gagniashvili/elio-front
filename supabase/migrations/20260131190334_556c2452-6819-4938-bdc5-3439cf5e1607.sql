-- Add position column to tenant_memberships for sales hierarchy (Junior, Senior, Lead, etc.)
ALTER TABLE public.tenant_memberships 
ADD COLUMN position text;

-- Add comment for clarity
COMMENT ON COLUMN public.tenant_memberships.position IS 'Position/seniority level for sales roles (e.g., Junior, Senior, Lead)';