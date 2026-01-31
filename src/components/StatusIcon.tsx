import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Map of icon names to their components
const ICON_MAP: Record<string, LucideIcon> = {
  Star: LucideIcons.Star,
  Heart: LucideIcons.Heart,
  ThumbsUp: LucideIcons.ThumbsUp,
  ThumbsDown: LucideIcons.ThumbsDown,
  Check: LucideIcons.Check,
  X: LucideIcons.X,
  AlertCircle: LucideIcons.AlertCircle,
  Clock: LucideIcons.Clock,
  Phone: LucideIcons.Phone,
  Mail: LucideIcons.Mail,
  MessageSquare: LucideIcons.MessageSquare,
  Calendar: LucideIcons.Calendar,
  Flag: LucideIcons.Flag,
  Bookmark: LucideIcons.Bookmark,
  Tag: LucideIcons.Tag,
  Target: LucideIcons.Target,
  TrendingUp: LucideIcons.TrendingUp,
  TrendingDown: LucideIcons.TrendingDown,
  Award: LucideIcons.Award,
  Zap: LucideIcons.Zap,
  Flame: LucideIcons.Flame,
  Snowflake: LucideIcons.Snowflake,
  Sun: LucideIcons.Sun,
  Moon: LucideIcons.Moon,
  DollarSign: LucideIcons.DollarSign,
  CreditCard: LucideIcons.CreditCard,
  ShoppingCart: LucideIcons.ShoppingCart,
  Package: LucideIcons.Package,
  Gift: LucideIcons.Gift,
  Truck: LucideIcons.Truck,
  User: LucideIcons.User,
  Users: LucideIcons.Users,
  UserCheck: LucideIcons.UserCheck,
  UserX: LucideIcons.UserX,
  Building: LucideIcons.Building,
  Home: LucideIcons.Home,
  MapPin: LucideIcons.MapPin,
  Eye: LucideIcons.Eye,
  EyeOff: LucideIcons.EyeOff,
  Lock: LucideIcons.Lock,
  Unlock: LucideIcons.Unlock,
  Shield: LucideIcons.Shield,
  Key: LucideIcons.Key,
  CircleDot: LucideIcons.CircleDot,
  Circle: LucideIcons.Circle,
  Square: LucideIcons.Square,
  Diamond: LucideIcons.Diamond,
  Hexagon: LucideIcons.Hexagon,
  Triangle: LucideIcons.Triangle,
};

// Curated list of status-appropriate icons
export const STATUS_ICONS = Object.keys(ICON_MAP);

export type StatusIconName = keyof typeof ICON_MAP;

export function getIconComponent(iconName: string): LucideIcon | null {
  return ICON_MAP[iconName] || null;
}

interface StatusIconProps {
  iconName: string;
  className?: string;
  fallbackColor?: string;
}

export function StatusIcon({ iconName, className, fallbackColor }: StatusIconProps) {
  const IconComponent = ICON_MAP[iconName];
  
  if (!IconComponent) {
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
  if (icon) {
    const IconComponent = ICON_MAP[icon];
    if (IconComponent) {
      return <IconComponent className={cn("flex-shrink-0", iconClass || "h-3.5 w-3.5")} />;
    }
  }
  
  return (
    <span 
      className={cn("rounded-full flex-shrink-0", colorDotClass || "h-2.5 w-2.5")} 
      style={{ backgroundColor: color }}
    />
  );
}
