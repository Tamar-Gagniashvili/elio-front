-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'sales');

-- Create tenants table (companies)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tenant memberships (links users to tenants with roles)
CREATE TABLE public.tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'sales',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Create channel types enum
CREATE TYPE public.channel_type AS ENUM ('web_chat', 'telegram', 'whatsapp', 'messenger', 'instagram', 'sms');

-- Create channels table (connected social channels per tenant)
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  channel_type channel_type NOT NULL,
  name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create contacts table (customers who message the business)
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT, -- ID from the social platform
  channel_type channel_type NOT NULL,
  name TEXT,
  avatar_url TEXT,
  phone TEXT,
  email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create conversation status enum
CREATE TYPE public.conversation_status AS ENUM ('open', 'assigned', 'resolved', 'archived');

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status conversation_status NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create message sender type enum
CREATE TYPE public.message_sender_type AS ENUM ('contact', 'agent', 'system');

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_type message_sender_type NOT NULL,
  sender_id UUID, -- user_id if agent, contact_id if contact
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table for role-based access (security best practice)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create round-robin tracking table
CREATE TABLE public.chat_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  last_assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignment_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_distribution ENABLE ROW LEVEL SECURITY;

-- Security definer function to check tenant membership
CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND is_active = true
  )
$$;

-- Security definer function to check tenant role
CREATE OR REPLACE FUNCTION public.has_tenant_role(_user_id UUID, _tenant_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_memberships
    WHERE user_id = _user_id AND tenant_id = _tenant_id AND role = _role AND is_active = true
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tenant policies
CREATE POLICY "Users can view tenants they belong to" ON public.tenants
  FOR SELECT USING (public.is_tenant_member(auth.uid(), id));

CREATE POLICY "Admins can update their tenant" ON public.tenants
  FOR UPDATE USING (public.has_tenant_role(auth.uid(), id, 'admin') OR public.has_tenant_role(auth.uid(), id, 'owner'));

CREATE POLICY "Authenticated users can create tenants" ON public.tenants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Tenant membership policies
CREATE POLICY "Users can view memberships in their tenants" ON public.tenant_memberships
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage memberships" ON public.tenant_memberships
  FOR ALL USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin') OR public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

CREATE POLICY "Users can insert their own initial membership" ON public.tenant_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Channels policies
CREATE POLICY "Members can view channels" ON public.channels
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can manage channels" ON public.channels
  FOR ALL USING (public.has_tenant_role(auth.uid(), tenant_id, 'admin') OR public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

-- Contacts policies
CREATE POLICY "Members can view contacts" ON public.contacts
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Members can manage contacts" ON public.contacts
  FOR ALL USING (public.is_tenant_member(auth.uid(), tenant_id));

-- Conversations policies
CREATE POLICY "Members can view conversations" ON public.conversations
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Members can manage conversations" ON public.conversations
  FOR ALL USING (public.is_tenant_member(auth.uid(), tenant_id));

-- Messages policies
CREATE POLICY "Members can view messages in their tenant conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND public.is_tenant_member(auth.uid(), c.tenant_id)
    )
  );

CREATE POLICY "Members can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND public.is_tenant_member(auth.uid(), c.tenant_id)
    )
  );

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Chat distribution policies
CREATE POLICY "Members can view distribution" ON public.chat_distribution
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Members can update distribution" ON public.chat_distribution
  FOR UPDATE USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Admins can insert distribution" ON public.chat_distribution
  FOR INSERT WITH CHECK (public.has_tenant_role(auth.uid(), tenant_id, 'admin') OR public.has_tenant_role(auth.uid(), tenant_id, 'owner'));

-- Enable realtime for messages and conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tenant_memberships_updated_at BEFORE UPDATE ON public.tenant_memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-creating profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();