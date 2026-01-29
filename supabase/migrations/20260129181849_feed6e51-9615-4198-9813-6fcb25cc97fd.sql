-- Make contact_id nullable so notes can exist without being attached to a contact
ALTER TABLE public.contact_notes 
ALTER COLUMN contact_id DROP NOT NULL;

-- Drop the existing foreign key constraint
ALTER TABLE public.contact_notes 
DROP CONSTRAINT IF EXISTS contact_notes_contact_id_fkey;

-- Re-add the foreign key with ON DELETE SET NULL for orphaned notes
ALTER TABLE public.contact_notes
ADD CONSTRAINT contact_notes_contact_id_fkey 
FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Update RLS policies to allow users to only see their own notes
DROP POLICY IF EXISTS "Tenant members can view notes" ON public.contact_notes;
DROP POLICY IF EXISTS "Tenant members can update notes" ON public.contact_notes;
DROP POLICY IF EXISTS "Tenant members can delete notes" ON public.contact_notes;

-- Users can view only their own notes
CREATE POLICY "Users can view their own notes" 
ON public.contact_notes 
FOR SELECT 
USING (auth.uid() = created_by);

-- Users can update only their own notes
CREATE POLICY "Users can update their own notes" 
ON public.contact_notes 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Users can delete only their own notes
CREATE POLICY "Users can delete their own notes" 
ON public.contact_notes 
FOR DELETE 
USING (auth.uid() = created_by);