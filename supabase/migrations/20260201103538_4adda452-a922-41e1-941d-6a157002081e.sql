-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments', 
  'chat-attachments', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- Create storage policies for chat-attachments bucket
CREATE POLICY "Public can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Service role can manage chat attachments"
ON storage.objects FOR ALL
USING (bucket_id = 'chat-attachments');

-- Add media columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT,
ADD COLUMN IF NOT EXISTS media_filename TEXT;