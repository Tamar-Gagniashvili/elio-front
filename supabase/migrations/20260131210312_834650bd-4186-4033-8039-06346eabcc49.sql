-- Add 'tiktok' and 'email' to the channel_type enum
ALTER TYPE public.channel_type ADD VALUE IF NOT EXISTS 'tiktok';
ALTER TYPE public.channel_type ADD VALUE IF NOT EXISTS 'email';