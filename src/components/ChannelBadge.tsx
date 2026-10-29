import { MessageCircle, Send, MessageSquare, Facebook, Instagram, Phone, FileSpreadsheet, Music2, Mail } from 'lucide-react';
import { ChannelType, CHANNEL_CONFIG } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ChannelBadgeProps {
  channelType: ChannelType;
  showLabel?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const iconMap = {
  MessageCircle,
  Send,
  MessageSquare,
  Facebook,
  Instagram,
  Phone,
  FileSpreadsheet,
  Music2,
  Mail,
};

export function ChannelBadge({ channelType, showLabel = false, size = 'md', className }: ChannelBadgeProps) {
  const config = CHANNEL_CONFIG[channelType];
  const Icon = iconMap[config.icon as keyof typeof iconMap];
  
  const sizeClasses = {
    xs: 'h-4 w-4 text-[8px]',
    sm: 'h-5 w-5 text-[10px]',
    md: 'h-6 w-6 text-xs',
    lg: 'h-8 w-8 text-sm',
  };

  const iconSizes = {
    xs: 9,
    sm: 10,
    md: 12,
    lg: 16,
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full text-white',
          config.color,
          sizeClasses[size]
        )}
      >
        <Icon size={iconSizes[size]} />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground">
          {config.label}
        </span>
      )}
    </div>
  );
}
