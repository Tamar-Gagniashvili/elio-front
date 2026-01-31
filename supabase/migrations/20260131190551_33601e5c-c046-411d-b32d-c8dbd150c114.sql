-- Create a function to auto-assign "New Lead" status to new contacts
CREATE OR REPLACE FUNCTION public.auto_assign_new_lead_status()
RETURNS TRIGGER AS $$
DECLARE
  new_lead_status_id uuid;
BEGIN
  -- Find a status named "New Lead" (case insensitive) for this tenant
  SELECT id INTO new_lead_status_id
  FROM public.lead_statuses
  WHERE tenant_id = NEW.tenant_id
    AND LOWER(name) = 'new lead'
  LIMIT 1;

  -- If "New Lead" status exists, assign it to the new contact
  IF new_lead_status_id IS NOT NULL THEN
    INSERT INTO public.contact_statuses (tenant_id, contact_id, status_id)
    VALUES (NEW.tenant_id, NEW.id, new_lead_status_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run after contact creation
DROP TRIGGER IF EXISTS trigger_auto_assign_new_lead_status ON public.contacts;
CREATE TRIGGER trigger_auto_assign_new_lead_status
  AFTER INSERT ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_new_lead_status();