'use client';

// ---------------------------------------------------------------------------
// SortableBeatCard -- Drag-and-drop wrapper for BeatCard
// ---------------------------------------------------------------------------
//
// Uses @dnd-kit/sortable to make each scene card draggable within the outline.
// Renders a drag handle (grip icon) that appears on hover. The BeatCard itself
// is shifted right to make room for the handle.
// ---------------------------------------------------------------------------

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SortableBeatCardProps {
  /** The SceneId used as the sortable item identifier. */
  id: string;
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SortableBeatCard({ id, children }: SortableBeatCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group/sortable',
        isDragging && 'opacity-30 z-10',
      )}
    >
      {/* Drag handle -- visible on hover */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-5 flex items-center justify-center
                   opacity-0 group-hover/sortable:opacity-100 cursor-grab active:cursor-grabbing
                   transition-opacity z-10"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Shift content right to make room for handle on hover */}
      <div className="pl-0 group-hover/sortable:pl-5 transition-all">
        {children}
      </div>
    </div>
  );
}
