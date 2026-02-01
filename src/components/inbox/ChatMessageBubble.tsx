import { formatDistanceToNow } from 'date-fns';
import { Message } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { FileText, Download } from 'lucide-react';

interface ChatMessageBubbleProps {
  message: Message;
  isAgent: boolean;
  contactAvatar?: string;
  contactName?: string;
  agentAvatar?: string;
  agentName?: string;
}

export function ChatMessageBubble({
  message,
  isAgent,
  contactAvatar,
  contactName,
  agentAvatar,
  agentName,
}: ChatMessageBubbleProps) {
  const metadata = message.metadata as Record<string, unknown> || {};
  const mediaUrl = metadata.media_url as string | undefined;
  const mediaType = metadata.media_type as 'image' | 'file' | undefined;
  const mediaFilename = metadata.media_filename as string | undefined;

  const renderMedia = () => {
    if (!mediaUrl) return null;

    if (mediaType === 'image') {
      return (
        <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={mediaUrl}
            alt={mediaFilename || 'Image'}
            className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      );
    }

    if (mediaType === 'file') {
      return (
        <a
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-2 p-2 rounded-md transition-colors',
            isAgent
              ? 'bg-primary-foreground/10 hover:bg-primary-foreground/20'
              : 'bg-foreground/5 hover:bg-foreground/10'
          )}
        >
          <FileText className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm truncate flex-1">{mediaFilename || 'File'}</span>
          <Download className="h-4 w-4 flex-shrink-0 opacity-50" />
        </a>
      );
    }

    return null;
  };

  return (
    <div
      className={cn(
        'flex gap-2 animate-fade-in',
        isAgent ? 'justify-end' : 'justify-start'
      )}
    >
      {!isAgent && (
        <Avatar
          src={contactAvatar}
          name={contactName}
          size="sm"
        />
      )}
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-4 py-2 overflow-hidden',
          isAgent
            ? 'bg-chat-bubble-agent text-chat-bubble-agent-text rounded-br-md'
            : 'bg-chat-bubble-contact text-chat-bubble-contact-text rounded-bl-md'
        )}
      >
        {renderMedia()}
        {message.content && !message.content.match(/^\[(Image|File):/) && (
          <p className={cn('text-sm whitespace-pre-wrap break-words', mediaUrl && 'mt-2')}>
            {message.content}
          </p>
        )}
        <span className="text-[10px] opacity-70 mt-1 block">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </span>
      </div>
      {isAgent && (
        <Avatar
          src={agentAvatar}
          name={agentName}
          size="sm"
        />
      )}
    </div>
  );
}
