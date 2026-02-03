import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { StickyNote, Trash2, Pin, Pencil, Clock, MessageSquare, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContactNote, NoteStatus, getColorClasses } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NotesGridViewProps {
  notes: ContactNote[];
  statuses: NoteStatus[];
  editingNoteId: string | undefined;
  onEditNote: (note: ContactNote) => void;
  onDeleteNote: (noteId: string) => void;
  onNavigateToChat: (contactId: string) => void;
  activeTab: string;
}

export function NotesGridView({
  notes,
  statuses,
  editingNoteId,
  onEditNote,
  onDeleteNote,
  onNavigateToChat,
  activeTab,
}: NotesGridViewProps) {
  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <StickyNote className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          {activeTab === 'personal' 
            ? "No personal notes yet. Add one for yourself!" 
            : activeTab === 'chat'
            ? "No chat notes yet. Add notes to conversations!"
            : "No notes yet. Click 'New Note' to get started!"}
        </p>
      </div>
    );
  }

  // Build status lookup
  const statusMap = new Map(statuses.map(s => [s.id, s]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {notes.map((note) => {
        const colorClasses = getColorClasses(note.color || 'yellow');
        const isEditing = editingNoteId === note.id;
        const noteStatus = note.status_id ? statusMap.get(note.status_id) : null;
        
        if (isEditing) return null;
        
        return (
          <div
            key={note.id}
            className={cn(
              'group relative pt-6 pb-4 px-4 rounded-lg border-2 shadow-md transition-all hover:shadow-lg hover:scale-[1.01]',
              colorClasses.bg,
              colorClasses.border,
              colorClasses.shadow,
              'dark:bg-opacity-30'
            )}
          >
            {/* Pin - centered on top edge */}
            <div className={cn(
              'absolute -top-2.5 left-1/2 -translate-x-1/2 z-10',
              colorClasses.pin
            )}>
              <Pin className="h-5 w-5 fill-current drop-shadow-md" style={{ transform: 'rotate(45deg)' }} />
            </div>

            {/* Header row: Status badge + Contact/Personal + Actions */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {/* Status badge */}
                {noteStatus && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                        style={{ 
                          backgroundColor: `${noteStatus.color}20`,
                          color: noteStatus.color,
                          border: `1px solid ${noteStatus.color}40`
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: noteStatus.color }}
                        />
                        <span className="truncate max-w-[80px]">{noteStatus.name}</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{noteStatus.name}</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Contact badge */}
                {note.contact && note.contact_id ? (
                  <button
                    onClick={() => onNavigateToChat(note.contact_id!)}
                    className="inline-flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground transition-colors truncate"
                  >
                    <MessageSquare className="h-3 w-3 shrink-0" />
                    <span className="truncate">{note.contact.name || 'Unknown'}</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-foreground/60">
                    <Coffee className="h-3 w-3 shrink-0" />
                    <span>Personal</span>
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onEditNote(note)}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDeleteNote(note.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {note.content}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-current/10">
              <span className="text-[10px] text-foreground/60">
                {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
              </span>
              {note.reminder_at && (
                <span className={cn(
                  'flex items-center gap-1 text-[10px]',
                  !note.reminder_shown ? 'text-amber-600 font-medium' : 'text-foreground/60'
                )}>
                  <Clock className="h-3 w-3" />
                  {note.reminder_shown 
                    ? 'Reminded' 
                    : formatDistanceToNow(new Date(note.reminder_at), { addSuffix: true })
                  }
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
