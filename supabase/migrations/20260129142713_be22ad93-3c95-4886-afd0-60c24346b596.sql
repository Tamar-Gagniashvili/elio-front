-- Create contact_notes table for storing notes with optional reminders
CREATE TABLE public.contact_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  content TEXT NOT NULL,
  reminder_at TIMESTAMP WITH TIME ZONE,
  reminder_shown BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Tenant members can view notes"
ON public.contact_notes
FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can create notes"
ON public.contact_notes
FOR INSERT
WITH CHECK (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can update notes"
ON public.contact_notes
FOR UPDATE
USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can delete notes"
ON public.contact_notes
FOR DELETE
USING (is_tenant_member(auth.uid(), tenant_id));

-- Super admin policies
CREATE POLICY "Super admin can manage all notes"
ON public.contact_notes
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_contact_notes_contact_id ON public.contact_notes(contact_id);
CREATE INDEX idx_contact_notes_reminder_at ON public.contact_notes(reminder_at) WHERE reminder_at IS NOT NULL AND reminder_shown = false;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contact_notes_updated_at
BEFORE UPDATE ON public.contact_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();