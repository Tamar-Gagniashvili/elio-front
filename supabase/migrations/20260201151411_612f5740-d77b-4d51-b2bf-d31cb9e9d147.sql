-- Add 'object' to object_field_type enum for object-to-object relations
ALTER TYPE object_field_type ADD VALUE IF NOT EXISTS 'object';