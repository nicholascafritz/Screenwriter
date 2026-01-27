'use client';

import React, { useState } from 'react';
import { useStoryBibleStore, SAVE_THE_CAT_BEATS } from '@/lib/store/story-bible';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';

export default function BeatSheetTab() {
  const bible = useStoryBibleStore((s) => s.bible);
  const updateBeat = useStoryBibleStore((s) => s.updateBeat);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!bible) return null;

  const completedCount = bible.beatSheet.filter((b) => b.completed).length;
  const total = bible.beatSheet.length;

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
          <span>Save the Cat Beat Sheet</span>
          <span>{completedCount}/{total} beats</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(completedCount / total) * 100}%` }}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {bible.beatSheet.map((beat, idx) => {
            const isExpanded = expandedId === beat.id;
            const hint = SAVE_THE_CAT_BEATS[idx]?.hint ?? '';

            return (
              <div
                key={beat.id}
                className={cn(
                  'border border-border rounded-md transition-colors',
                  beat.completed && 'border-primary/30 bg-primary/5',
                )}
              >
                {/* Beat header */}
                <button
                  className="flex items-center w-full p-2 text-xs text-left hover:bg-muted/30 transition-colors gap-1.5"
                  onClick={() => setExpandedId(isExpanded ? null : beat.id)}
                >
                  {/* Completion toggle */}
                  <button
                    className={cn(
                      'flex items-center justify-center h-4 w-4 rounded-full border shrink-0 transition-colors',
                      beat.completed
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground/40 hover:border-primary',
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      updateBeat(beat.id, { completed: !beat.completed });
                    }}
                  >
                    {beat.completed && <Check className="h-2.5 w-2.5" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{beat.beat}</span>
                    {beat.description && (
                      <p className="text-muted-foreground truncate text-[10px] mt-0.5">
                        {beat.description}
                      </p>
                    )}
                  </div>

                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="px-2 pb-2 space-y-1.5 border-t border-border pt-2">
                    <p className="text-[10px] text-muted-foreground italic">{hint}</p>
                    <Textarea
                      value={beat.description}
                      onChange={(e) => updateBeat(beat.id, { description: e.target.value })}
                      placeholder={`Describe how "${beat.beat}" manifests in your story...`}
                      className="text-xs min-h-[60px] resize-none"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
