'use client';

import React from 'react';
import { useStoryBibleStore } from '@/lib/store/story-bible';
import { cn } from '@/lib/utils';

/**
 * Horizontal beat progress indicator showing which of the 15 Save the Cat
 * beats have been populated during the guided development session.
 */
export default function GuideProgress() {
  const beatSheet = useStoryBibleStore((s) => s.bible?.beatSheet ?? []);
  const completedCount = beatSheet.filter((b) => b.completed).length;

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-muted-foreground font-medium shrink-0 mr-1">
        {completedCount}/{beatSheet.length} beats
      </span>
      <div className="flex items-center gap-0.5">
        {beatSheet.map((beat) => (
          <div
            key={beat.id}
            title={beat.beat}
            className={cn(
              'h-2 w-2 rounded-full transition-all duration-300',
              beat.completed
                ? 'bg-primary scale-100'
                : 'bg-muted-foreground/20 scale-90',
            )}
          />
        ))}
      </div>
    </div>
  );
}
