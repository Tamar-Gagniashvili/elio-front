-- Add 'offline' to the channel_type enum
ALTER TYPE channel_type ADD VALUE IF NOT EXISTS 'offline';