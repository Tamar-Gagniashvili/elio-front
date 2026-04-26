import { useRef, useState } from 'react';
import { Image, Paperclip, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChatMediaUploadProps {
  tenantId: string;
  conversationId: string;
  onUploadComplete: (media: { url: string; type: 'image' | 'file'; filename: string }) => void;
  disabled?: boolean;
}

interface PendingUpload {
  file: File;
  preview?: string;
  progress: number;
}

export function ChatMediaUpload({ tenantId, conversationId, onUploadComplete, disabled }: ChatMediaUploadProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (file: File, type: 'image' | 'file') => {
    if (!file) return;

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }

    // Create preview for images
    let preview: string | undefined;
    if (type === 'image') {
      preview = URL.createObjectURL(file);
    }

    setPendingUpload({ file, preview, progress: 0 });
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenant_id', tenantId);
      formData.append('conversation_id', conversationId);

      const { data: funcData } = await supabase.functions.invoke('upload-chat-attachment', {
        body: formData,
      });

      if (funcData?.ok) {
        onUploadComplete({
          url: funcData.url,
          type: funcData.type,
          filename: funcData.filename,
        });
        toast.success('File uploaded');
      } else {
        toast.error(funcData?.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      if (pendingUpload?.preview) {
        URL.revokeObjectURL(pendingUpload.preview);
      }
      setPendingUpload(null);
      setIsUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, 'image');
    }
    e.target.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      handleFileSelect(file, type);
    }
    e.target.value = '';
  };

  const cancelUpload = () => {
    if (pendingUpload?.preview) {
      URL.revokeObjectURL(pendingUpload.preview);
    }
    setPendingUpload(null);
    setIsUploading(false);
  };

  return (
    <div className="flex items-center gap-1">
      {/* Image upload button */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleImageChange}
        disabled={disabled || isUploading}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => imageInputRef.current?.click()}
        disabled={disabled || isUploading}
        title="Upload image"
      >
        {isUploading && pendingUpload?.file.type.startsWith('image/') ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Image className="h-4 w-4" />
        )}
      </Button>

      {/* File upload button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        title="Attach file"
      >
        {isUploading && !pendingUpload?.file.type.startsWith('image/') ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </Button>

      {/* Upload preview overlay */}
      {pendingUpload?.preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-4 max-w-sm relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
              onClick={cancelUpload}
            >
              <X className="h-3 w-3" />
            </Button>
            <img
              src={pendingUpload.preview}
              alt="Upload preview"
              className="max-h-48 rounded-md"
            />
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
