-- Create routing_rules table
CREATE TABLE public.routing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '{"operator": "AND", "conditions": []}'::jsonb,
  actions JSONB NOT NULL DEFAULT '{"actions": []}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rule_action_logs table for audit trail
CREATE TABLE public.rule_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.routing_rules(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rule_action_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_routing_rules_tenant_priority ON public.routing_rules(tenant_id, priority) WHERE is_active = true;
CREATE INDEX idx_rule_action_logs_tenant ON public.rule_action_logs(tenant_id, created_at DESC);
CREATE INDEX idx_rule_action_logs_rule ON public.rule_action_logs(rule_id);

-- RLS Policies for routing_rules

-- All tenant members can view rules
CREATE POLICY "Tenant members can view rules"
ON public.routing_rules
FOR SELECT
USING (is_tenant_member(auth.uid(), tenant_id));

-- Admins/Owners can create rules
CREATE POLICY "Admins can create rules"
ON public.routing_rules
FOR INSERT
WITH CHECK (
  has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR 
  has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role)
);

-- Admins/Owners can update rules
CREATE POLICY "Admins can update rules"
ON public.routing_rules
FOR UPDATE
USING (
  has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR 
  has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role)
);

-- Admins/Owners can delete rules
CREATE POLICY "Admins can delete rules"
ON public.routing_rules
FOR DELETE
USING (
  has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR 
  has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role)
);

-- RLS Policies for rule_action_logs

-- Admins can view logs
CREATE POLICY "Admins can view rule logs"
ON public.rule_action_logs
FOR SELECT
USING (
  has_tenant_role(auth.uid(), tenant_id, 'admin'::app_role) OR 
  has_tenant_role(auth.uid(), tenant_id, 'owner'::app_role)
);

-- System can insert logs (via service role in edge functions)
CREATE POLICY "Service role can insert logs"
ON public.rule_action_logs
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at on routing_rules
CREATE TRIGGER update_routing_rules_updated_at
BEFORE UPDATE ON public.routing_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();