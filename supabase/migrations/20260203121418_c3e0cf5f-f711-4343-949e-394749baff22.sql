-- Create note_statuses table for custom kanban columns
CREATE TABLE public.note_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add status_id column to contact_notes
ALTER TABLE public.contact_notes 
ADD COLUMN status_id UUID REFERENCES public.note_statuses(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.note_statuses ENABLE ROW LEVEL SECURITY;

-- Policies for note_statuses
CREATE POLICY "Users can view note statuses in their tenant"
ON public.note_statuses FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tenant_memberships 
  WHERE tenant_memberships.tenant_id = note_statuses.tenant_id 
  AND tenant_memberships.user_id = auth.uid()
));

CREATE POLICY "Admins can create note statuses"
ON public.note_statuses FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM tenant_memberships 
  WHERE tenant_memberships.tenant_id = note_statuses.tenant_id 
  AND tenant_memberships.user_id = auth.uid()
  AND tenant_memberships.role IN ('owner', 'admin')
));

CREATE POLICY "Admins can update note statuses"
ON public.note_statuses FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM tenant_memberships 
  WHERE tenant_memberships.tenant_id = note_statuses.tenant_id 
  AND tenant_memberships.user_id = auth.uid()
  AND tenant_memberships.role IN ('owner', 'admin')
));

CREATE POLICY "Admins can delete note statuses"
ON public.note_statuses FOR DELETE
USING (EXISTS (
  SELECT 1 FROM tenant_memberships 
  WHERE tenant_memberships.tenant_id = note_statuses.tenant_id 
  AND tenant_memberships.user_id = auth.uid()
  AND tenant_memberships.role IN ('owner', 'admin')
));

-- Create index for faster lookups
CREATE INDEX idx_note_statuses_tenant ON public.note_statuses(tenant_id);
CREATE INDEX idx_contact_notes_status ON public.contact_notes(status_id);