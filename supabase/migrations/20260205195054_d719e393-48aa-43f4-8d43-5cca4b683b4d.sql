-- Create user_presence table to track online status
CREATE TABLE public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Policies: members can view presence in their tenant
CREATE POLICY "Members can view tenant presence"
ON public.user_presence
FOR SELECT
USING (public.is_tenant_member(tenant_id, auth.uid()));

-- Members can update their own presence
CREATE POLICY "Users can update their own presence"
ON public.user_presence
FOR UPDATE
USING (auth.uid() = user_id);

-- Members can insert their own presence
CREATE POLICY "Users can insert their own presence"
ON public.user_presence
FOR INSERT
WITH CHECK (auth.uid() = user_id AND public.is_tenant_member(tenant_id, auth.uid()));

-- Create index for fast lookups
CREATE INDEX idx_user_presence_tenant_online ON public.user_presence(tenant_id, is_online) WHERE is_online = true;