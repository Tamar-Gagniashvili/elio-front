/** Status colours by name, as stored on each status */
export const STATUS_COLOR_NAMES = ['blue', 'green', 'yellow', 'red', 'purple', 'pink', 'orange', 'cyan'] as const;

export const COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
  purple: '#a855f7',
  pink: '#ec4899',
  orange: '#f97316',
  cyan: '#06b6d4',
};

export const statusHex = (color: string) => COLOR_HEX[color] || COLOR_HEX.blue;
