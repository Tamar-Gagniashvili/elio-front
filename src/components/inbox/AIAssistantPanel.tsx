import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Message, Conversation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Sparkles, X, Loader2, Copy, Check, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AIAssistantPanelProps {
  conversation: Conversation;
  messages: Message[];
  onSendToChat?: (message: string) => void;
  onClose: () => void;
}

const ASSISTANT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/inbox-assistant`;

const QUICK_PROMPTS = [
  { label: 'Summarize', prompt: 'What is this conversation about? Give me a brief summary.' },
  { label: 'Customer needs', prompt: 'What is the customer asking for or what problem are they facing?' },
  { label: 'Suggest reply', prompt: 'Suggest a helpful response I can send to this customer.' },
  { label: 'Key points', prompt: 'What are the key points I should address in my response?' },
];

export function AIAssistantPanel({ 
  conversation, 
  messages, 
  onSendToChat,
  onClose 
}: AIAssistantPanelProps) {
  const { t } = useTranslation();
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const streamChat = useCallback(async (userMessage: string) => {
    const userMsg: AIMessage = { 
      id: crypto.randomUUID(), 
      role: 'user', 
      content: userMessage 
    };
    setAiMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const conversationContext = {
      contactName: conversation.contact?.name,
      channelType: conversation.contact?.channel_type,
      status: conversation.status,
      messages: messages.slice(-50).map(m => ({
        sender_type: m.sender_type,
        content: m.content,
      })),
    };

    try {
      const resp = await fetch(ASSISTANT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...aiMessages, userMsg].map(m => ({ role: m.role, content: m.content })),
          conversationContext,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start stream');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      const assistantId = crypto.randomUUID();
      let streamDone = false;

      // Add empty assistant message
      setAiMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setAiMessages(prev => 
                prev.map(m => m.id === assistantId ? { ...m, content: assistantSoFar } : m)
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('AI assistant error:', error);
      setAiMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Something went wrong. Please try again.'}`,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [aiMessages, conversation, messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput('');
    await streamChat(message);
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (isLoading) return;
    await streamChat(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUseInChat = (text: string) => {
    if (onSendToChat) {
      onSendToChat(text);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">{t('inbox.aiAssistant', 'AI Assistant')}</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick prompts */}
      {aiMessages.length === 0 && (
        <div className="p-4 border-b">
          <p className="text-xs text-muted-foreground mb-3">
            {t('inbox.aiQuickActions', 'Quick actions')}
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((qp) => (
              <Button
                key={qp.label}
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => handleQuickPrompt(qp.prompt)}
                disabled={isLoading}
              >
                {qp.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {aiMessages.length === 0 && (
            <div className="text-center py-8">
              <Bot className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {t('inbox.aiWelcome', 'Ask me anything about this conversation')}
              </p>
            </div>
          )}
          
          {aiMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-2',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {msg.role === 'assistant' && (
                <div className="p-1.5 rounded-lg bg-primary/10 h-fit mt-0.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content || '...'}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
                
                {/* Action buttons for assistant messages */}
                {msg.role === 'assistant' && msg.content && (
                  <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                    >
                      {copiedId === msg.id ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      {copiedId === msg.id ? 'Copied' : 'Copy'}
                    </Button>
                    {onSendToChat && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleUseInChat(msg.content)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Use in chat
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && aiMessages[aiMessages.length - 1]?.role === 'user' && (
            <div className="flex gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 h-fit">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-card">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('inbox.aiAskQuestion', 'Ask about this conversation...')}
            className="min-h-[40px] max-h-24 resize-none flex-1 text-sm"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-9 w-9 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
