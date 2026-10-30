import { cn } from '@/lib/utils';
import { getColorHex } from '@/pages/Statuses';
import type { LeadStatus } from '@/components/contacts/clientTypes';

/** Quiet status label: a coloured dot and the name */
export function StatusPill({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-xs font-medium text-foreground/80 whitespace-nowrap',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getColorHex(status.color) }} />
      {status.name}
    </span>
  );
}
