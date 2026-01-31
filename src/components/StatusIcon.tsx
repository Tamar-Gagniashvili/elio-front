import { icons, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Curated list of status-appropriate icons
export const STATUS_ICONS = [
  'Star', 'Heart', 'ThumbsUp', 'ThumbsDown', 'Check', 'X', 'AlertCircle', 'Clock',
  'Phone', 'Mail', 'MessageSquare', 'Calendar', 'Flag', 'Bookmark', 'Tag', 'Target',
  'TrendingUp', 'TrendingDown', 'Award', 'Zap', 'Flame', 'Snowflake', 'Sun', 'Moon',
  'DollarSign', 'CreditCard', 'ShoppingCart', 'Package', 'Gift', 'Truck',
  'User', 'Users', 'UserCheck', 'UserX', 'Building', 'Home', 'MapPin',
  'Eye', 'EyeOff', 'Lock', 'Unlock', 'Shield', 'Key',
  'CircleDot', 'Circle', 'Square', 'Diamond', 'Hexagon', 'Triangle',
] as const;

export type StatusIconName = typeof STATUS_ICONS[number];

interface StatusIconProps {
  iconName: string;
  className?: string;
  fallbackColor?: string;
}

export function StatusIcon({ iconName, className, fallbackColor }: StatusIconProps) {
  const IconComponent = icons[iconName as keyof typeof icons] as LucideIcon | undefined;
  
  if (!IconComponent) {
    // Fallback to color dot if icon not found
    return (
      <span 
        className={cn("rounded-full", className)} 
        style={{ backgroundColor: fallbackColor || '#888' }}
      />
    );
  }
  
  return <IconComponent className={className} />;
}

// Renders either an icon or a color dot based on status configuration
interface StatusIndicatorProps {
  icon?: string | null;
  color: string;
  colorDotClass?: string;
  iconClass?: string;
}

export function StatusIndicator({ icon, color, colorDotClass, iconClass }: StatusIndicatorProps) {
  if (icon && icons[icon as keyof typeof icons]) {
    const IconComponent = icons[icon as keyof typeof icons] as LucideIcon;
    return <IconComponent className={cn("flex-shrink-0", iconClass || "h-3.5 w-3.5")} />;
  }
  
  return (
    <span 
      className={cn("rounded-full flex-shrink-0", colorDotClass || "h-2.5 w-2.5")} 
      style={{ backgroundColor: color }}
    />
  );
}
