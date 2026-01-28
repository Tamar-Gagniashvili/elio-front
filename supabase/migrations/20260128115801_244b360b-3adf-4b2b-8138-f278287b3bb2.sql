-- Phase 1A: Add super_admin to enum and add tenant columns
-- (The enum value and columns only - no functions using the new value yet)

-- 1. Add 'super_admin' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Add pricing and channel enablement fields to tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS pricing_monthly decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS enabled_channels text[] DEFAULT ARRAY['web_chat']::text[],
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;