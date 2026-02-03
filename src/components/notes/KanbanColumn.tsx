import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanNoteCard } from './KanbanNoteCard';
import { ContactNote } from './types';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  notes: ContactNote[];
  onEditNote: (note: ContactNote) => void;
  onDeleteNote: (noteId: string) => void;
  onNavigateToChat: (contactId: string) => void;
  conversations: Record<string, string>;
}

export function KanbanColumn({
  id,
  title,
  color,
  notes,
  onEditNote,
  onDeleteNote,
  onNavigateToChat,
  conversations,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-72 bg-muted/30 rounded-lg border border-border',
        isOver && 'ring-2 ring-primary/50 bg-primary/5'
      )}
    >
      {/* Column Header */}
      <div
        className="px-3 py-2.5 border-b border-border flex items-center gap-2"
        style={{ borderTopColor: color, borderTopWidth: '3px' }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <h3 className="font-medium text-sm truncate">{title}</h3>
        <span className="ml-auto text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {notes.length}
        </span>
      </div>

      {/* Notes List */}
      <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
        <SortableContext items={notes.map(n => n.id)} strategy={verticalListSortingStrategy}>
          {notes.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Drop notes here
            </div>
          ) : (
            notes.map(note => (
              <KanbanNoteCard
                key={note.id}
                note={note}
                onEdit={() => onEditNote(note)}
                onDelete={() => onDeleteNote(note.id)}
                onNavigateToChat={() => {
                  if (note.contact_id && conversations[note.contact_id]) {
                    onNavigateToChat(note.contact_id);
                  }
                }}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
