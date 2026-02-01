import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Package, Link, AlertCircle, MapPin, DollarSign, Ruler, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  id: string;
  content: string;
  sender_type: 'contact' | 'agent' | 'system';
}

interface MatchedObject {
  id: string;
  display_name: string;
  metadata: Record<string, any>;
  status?: {
    id: string;
    name: string;
    color: string;
  };
}

interface AIIntent {
  object_type?: string;
  filters: { field: string; operator: string; value: string | number }[];
  keywords: string[];
  summary?: string;
  objectType?: { id: string; name: string; name_plural: string };
}

interface AISuggestionsPanelProps {
  messages: Message[];
  tenantId: string;
  conversationId: string;
  linkedObjectIds: string[];
  onLink: (objectId: string, newStatusId?: string) => Promise<boolean>;
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

const getFieldIcon = (fieldName: string) => {
  const name = fieldName.toLowerCase();
  if (name.includes('address') || name.includes('location')) return <MapPin className="h-3 w-3" />;
  if (name.includes('price') || name.includes('cost')) return <DollarSign className="h-3 w-3" />;
  if (name.includes('area') || name.includes('sqm')) return <Ruler className="h-3 w-3" />;
  if (name.includes('floor') || name.includes('building')) return <Building2 className="h-3 w-3" />;
  return null;
};

export function AISuggestionsPanel({
  messages,
  tenantId,
  conversationId,
  linkedObjectIds,
  onLink,
}: AISuggestionsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [intent, setIntent] = useState<AIIntent | null>(null);
  const [matches, setMatches] = useState<MatchedObject[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setIntent(null);
    setMatches([]);
    setMessage(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-inventory-match', {
        body: { messages, tenantId },
      });

      if (fnError) throw fnError;

      if (data.error) {
        setError(data.error);
        return;
      }

      setIntent(data.intent);
      setMatches(data.matches || []);
      setMessage(data.message);
    } catch (err: any) {
      console.error('AI analysis error:', err);
      setError(err.message || 'Failed to analyze messages');
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (objectId: string) => {
    setLinkingId(objectId);
    const success = await onLink(objectId);
    setLinkingId(null);
    
    if (success) {
      toast.success('Item linked successfully');
      // Remove from matches
      setMatches(prev => prev.filter(m => m.id !== objectId));
    }
  };

  // Filter out already linked items
  const availableMatches = matches.filter(m => !linkedObjectIds.includes(m.id));

  const hasCustomerMessages = messages.some(m => m.sender_type === 'contact');

  return (
    <div className="mt-6 px-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            AI Suggestions
          </h4>
        </div>
      </div>

      {!intent && !loading && !error && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">
            Analyze customer messages to find matching inventory
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyze}
            disabled={!hasCustomerMessages}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Find Matches
          </Button>
          {!hasCustomerMessages && (
            <p className="text-xs text-muted-foreground mt-2">
              No customer messages to analyze
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Analyzing messages...</span>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-destructive font-medium">Analysis failed</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            onClick={handleAnalyze}
          >
            Try Again
          </Button>
        </div>
      )}

      {intent && !loading && (
        <div className="space-y-3">
          {/* Intent summary */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-sm font-medium text-primary mb-1">Customer Intent</p>
            <p className="text-sm text-foreground">{message}</p>
            {intent.filters.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {intent.filters.map((f, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {f.field} {f.operator} {f.value}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Matched items */}
          {availableMatches.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                {availableMatches.length} matching {intent.objectType?.name_plural?.toLowerCase() || 'items'}
              </p>
              {availableMatches.map((obj) => (
                <div
                  key={obj.id}
                  className="group bg-muted/50 rounded-lg p-3 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
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
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => handleLink(obj.id)}
                      disabled={linkingId === obj.id}
                    >
                      {linkingId === obj.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Link className="h-3 w-3 mr-1" />
                          Link
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Show key metadata */}
                  {obj.metadata && Object.keys(obj.metadata).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/50">
                      {Object.entries(obj.metadata)
                        .slice(0, 4)
                        .map(([key, value]) => {
                          if (typeof value === 'object') return null;
                          const icon = getFieldIcon(key);
                          const displayValue = typeof value === 'number'
                            ? value.toLocaleString()
                            : String(value);
                          return (
                            <div key={key} className="flex items-center gap-1 text-xs text-muted-foreground">
                              {icon}
                              <span className="truncate max-w-[100px]">{displayValue}</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3">
              <Package className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No matching items found</p>
            </div>
          )}

          {/* Re-analyze button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={handleAnalyze}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Re-analyze
          </Button>
        </div>
      )}
    </div>
  );
}