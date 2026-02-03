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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map((note) => {
        const colorClasses = getColorClasses(note.color || 'yellow');
        const isEditing = editingNoteId === note.id;
        const noteStatus = note.status_id ? statusMap.get(note.status_id) : null;
        
        if (isEditing) return null;
        
        return (
          <div
            key={note.id}
            className={cn(
              'relative p-4 rounded-lg border-2 shadow-md transition-all hover:-rotate-1 hover:scale-[1.02]',
              colorClasses.bg,
              colorClasses.border,
              colorClasses.shadow,
              'dark:bg-opacity-30'
            )}
            style={{
              transform: `rotate(${(Math.random() - 0.5) * 2}deg)`,
            }}
          >
            {/* Pin */}
            <div className={cn(
              'absolute -top-2 left-1/2 -translate-x-1/2',
              colorClasses.pin
            )}>
              <Pin className="h-5 w-5 fill-current drop-shadow-sm" style={{ transform: 'rotate(45deg)' }} />
            </div>

            {/* Status badge - top right */}
            {noteStatus && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1"
                    style={{ 
                      backgroundColor: `${noteStatus.color}20`,
                      color: noteStatus.color,
                      borderColor: `${noteStatus.color}40`,
                      borderWidth: '1px'
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: noteStatus.color }}
                    />
                    <span className="truncate max-w-[60px]">{noteStatus.name}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{noteStatus.name}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Action buttons */}
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
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

            {/* Contact badge - clickable to go to chat */}
            {note.contact && note.contact_id && (
              <button
                onClick={() => onNavigateToChat(note.contact_id!)}
                className="mb-2 flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground hover:underline transition-colors"
              >
                <MessageSquare className="h-3 w-3" />
                <span>{note.contact.name || 'Unknown'}</span>
              </button>
            )}
            
            {!note.contact_id && (
              <div className="mb-2 flex items-center gap-1 text-xs text-foreground/70">
                <Coffee className="h-3 w-3" />
                <span>Personal</span>
              </div>
            )}

            {/* Content */}
            <p className="text-sm whitespace-pre-wrap pt-1 text-foreground/90">
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
                  !note.reminder_shown ? 'text-orange-600 font-medium' : 'text-foreground/60'
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
