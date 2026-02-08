-- Add enabled_features column with default core features
ALTER TABLE public.tenants 
ADD COLUMN enabled_features text[] DEFAULT ARRAY['inbox', 'contacts', 'channels']::text[];

-- Update existing tenants to have all features enabled (so nothing breaks)
UPDATE public.tenants 
SET enabled_features = ARRAY['inbox', 'contacts', 'objects', 'notes', 'statuses', 'rules', 'channels']
WHERE enabled_features IS NULL;