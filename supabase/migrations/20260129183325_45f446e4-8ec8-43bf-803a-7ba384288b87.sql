-- Create lead_statuses table for status definitions
CREATE TABLE public.lead_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_statuses junction table (many-to-many)
CREATE TABLE public.contact_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES public.lead_statuses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(contact_id, status_id)
);

-- Enable RLS
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_statuses ENABLE ROW LEVEL SECURITY;

-- RLS for lead_statuses: All members can view, only admin/owner can manage
CREATE POLICY "Tenant members can view statuses"
  ON public.lead_statuses FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can create statuses"
  ON public.lead_statuses FOR INSERT
  WITH CHECK (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR 
    has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role)
  );

CREATE POLICY "Admins can update statuses"
  ON public.lead_statuses FOR UPDATE
  USING (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR 
    has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role)
  );

CREATE POLICY "Admins can delete statuses"
  ON public.lead_statuses FOR DELETE
  USING (
    has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR 
    has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role)
  );

-- RLS for contact_statuses: All members can view and assign
CREATE POLICY "Tenant members can view contact statuses"
  ON public.contact_statuses FOR SELECT
  USING (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can assign statuses"
  ON public.contact_statuses FOR INSERT
  WITH CHECK (is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant members can remove statuses"
  ON public.contact_statuses FOR DELETE
  USING (is_tenant_member(auth.uid(), tenant_id));

-- Trigger for updated_at
CREATE TRIGGER update_lead_statuses_updated_at
  BEFORE UPDATE ON public.lead_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();