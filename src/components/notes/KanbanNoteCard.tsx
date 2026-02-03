import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow } from 'date-fns';
import { Pencil, Trash2, MessageSquare, Coffee, Clock, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactNote, NOTE_COLORS, getColorClasses } from './types';
import { cn } from '@/lib/utils';

interface KanbanNoteCardProps {
  note: ContactNote;
  onEdit: () => void;
  onDelete: () => void;
  onNavigateToChat: () => void;
  isDragging?: boolean;
}

export function KanbanNoteCard({
  note,
  onEdit,
  onDelete,
  onNavigateToChat,
  isDragging = false,
}: KanbanNoteCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const colorClasses = getColorClasses(note.color || 'yellow');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative p-3 rounded-md border shadow-sm cursor-grab active:cursor-grabbing',
        colorClasses.bg,
        colorClasses.border,
        'dark:bg-opacity-40',
        (isDragging || isSortableDragging) && 'opacity-50 rotate-3 scale-105 shadow-lg',
        !isDragging && !isSortableDragging && 'hover:shadow-md'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Contact/Personal badge */}
      {note.contact && note.contact_id ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigateToChat();
          }}
          className="mb-2 flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground hover:underline transition-colors"
        >
          <MessageSquare className="h-3 w-3" />
          <span className="truncate max-w-[120px]">{note.contact.name || 'Unknown'}</span>
        </button>
      ) : (
        <div className="mb-2 flex items-center gap-1 text-xs text-foreground/70">
          <Coffee className="h-3 w-3" />
          <span>Personal</span>
        </div>
      )}

      {/* Content */}
      <p className="text-sm whitespace-pre-wrap line-clamp-4 text-foreground/90">
        {note.content}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
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

      {/* Action buttons */}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </div>
  );
}
