import { useState } from 'react';
import { LinkedObject } from '@/hooks/useConversationObjects';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, X, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LinkObjectDialog } from './LinkObjectDialog';

interface LinkedObjectsPanelProps {
  linkedObjects: LinkedObject[];
  loading: boolean;
  onLink: (objectId: string) => Promise<boolean>;
  onUnlink: (linkId: string) => Promise<boolean>;
  tenantId: string;
  conversationId: string;
}

const getStatusColor = (color: string) => {
  const colors: Record<string, string> = {
    gray: 'bg-gray-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
  };
  return colors[color] || colors.gray;
};

export function LinkedObjectsPanel({
  linkedObjects,
  loading,
  onLink,
  onUnlink,
  tenantId,
  conversationId,
}: LinkedObjectsPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const handleUnlink = async (linkId: string) => {
    setUnlinkingId(linkId);
    await onUnlink(linkId);
    setUnlinkingId(null);
  };

  return (
    <div className="mt-6 px-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Linked Items
          </h4>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : linkedObjects.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">No items linked</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Link Item
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {linkedObjects.map((obj) => (
            <div
              key={obj.link_id}
              className="group relative bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">
                      {obj.object_type?.name}
                    </span>
                  </div>
                  <p className="font-medium text-sm truncate">{obj.display_name}</p>
                  {obj.status && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          getStatusColor(obj.status.color)
                        )}
                      />
                      <span className="text-xs text-muted-foreground">
                        {obj.status.name}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => obj.link_id && handleUnlink(obj.link_id)}
                  disabled={unlinkingId === obj.link_id}
                >
                  {unlinkingId === obj.link_id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </Button>
              </div>
              
              {/* Show key metadata */}
              {obj.metadata && Object.keys(obj.metadata).length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(obj.metadata)
                      .slice(0, 2)
                      .map(([key, value]) => {
                        if (typeof value === 'object') return null;
                        const displayValue = typeof value === 'number' 
                          ? value.toLocaleString() 
                          : String(value);
                        return (
                          <Badge
                            key={key}
                            variant="secondary"
                            className="text-[10px] font-normal"
                          >
                            {displayValue}
                          </Badge>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <LinkObjectDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onLink={onLink}
        tenantId={tenantId}
        linkedObjectIds={linkedObjects.map((o) => o.id)}
      />
    </div>
  );
}
