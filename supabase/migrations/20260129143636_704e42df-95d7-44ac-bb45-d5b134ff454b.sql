-- Add color column to contact_notes
ALTER TABLE public.contact_notes ADD COLUMN color TEXT DEFAULT 'yellow';