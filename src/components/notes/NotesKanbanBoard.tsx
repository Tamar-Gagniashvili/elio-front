import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';
import { KanbanNoteCard } from './KanbanNoteCard';
import { NoteStatus, ContactNote } from './types';

interface NotesKanbanBoardProps {
  notes: ContactNote[];
  statuses: NoteStatus[];
  onMoveNote: (noteId: string, newStatusId: string | null) => void;
  onEditNote: (note: ContactNote) => void;
  onDeleteNote: (noteId: string) => void;
  onNavigateToChat: (contactId: string) => void;
  conversations: Record<string, string>;
}

export function NotesKanbanBoard({
  notes,
  statuses,
  onMoveNote,
  onEditNote,
  onDeleteNote,
  onNavigateToChat,
  conversations,
}: NotesKanbanBoardProps) {
  const [activeNote, setActiveNote] = useState<ContactNote | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group notes by status
  const notesByStatus: Record<string, ContactNote[]> = {};
  
  // Initialize with empty arrays for each status plus "unassigned"
  notesByStatus['unassigned'] = [];
  statuses.forEach(status => {
    notesByStatus[status.id] = [];
  });

  // Distribute notes into columns
  notes.forEach(note => {
    const statusId = note.status_id || 'unassigned';
    if (notesByStatus[statusId]) {
      notesByStatus[statusId].push(note);
    } else {
      notesByStatus['unassigned'].push(note);
    }
  });

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const note = notes.find(n => n.id === active.id);
    setActiveNote(note || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveNote(null);
      return;
    }

    const activeNoteId = active.id as string;
    const overId = over.id as string;

    // Find the target column
    let targetStatusId: string | null = null;
    
    // Check if dropped on a column directly
    if (overId === 'unassigned' || statuses.some(s => s.id === overId)) {
      targetStatusId = overId === 'unassigned' ? null : overId;
    } else {
      // Dropped on another note - find which column that note is in
      const targetNote = notes.find(n => n.id === overId);
      if (targetNote) {
        targetStatusId = targetNote.status_id;
      }
    }

    const activeNote = notes.find(n => n.id === activeNoteId);
    if (activeNote && activeNote.status_id !== targetStatusId) {
      onMoveNote(activeNoteId, targetStatusId);
    }

    setActiveNote(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Optional: handle hover effects
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
        {/* Unassigned column */}
        <KanbanColumn
          id="unassigned"
          title="Unassigned"
          color="#6b7280"
          notes={notesByStatus['unassigned']}
          onEditNote={onEditNote}
          onDeleteNote={onDeleteNote}
          onNavigateToChat={onNavigateToChat}
          conversations={conversations}
        />

        {/* Status columns */}
        {statuses.map(status => (
          <KanbanColumn
            key={status.id}
            id={status.id}
            title={status.name}
            color={status.color}
            notes={notesByStatus[status.id] || []}
            onEditNote={onEditNote}
            onDeleteNote={onDeleteNote}
            onNavigateToChat={onNavigateToChat}
            conversations={conversations}
          />
        ))}
      </div>

      <DragOverlay>
        {activeNote ? (
          <KanbanNoteCard
            note={activeNote}
            onEdit={() => {}}
            onDelete={() => {}}
            onNavigateToChat={() => {}}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
