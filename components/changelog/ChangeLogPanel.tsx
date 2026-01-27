'use client';

import React, { useState, useMemo } from 'react';
import { useTimelineStore } from '@/lib/store/timeline';
import type { TimelineEntry } from '@/lib/diff/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ChangeLogEntry from './ChangeLogEntry';

type Filter = 'all' | 'human' | 'ai';

interface ChangeLogPanelProps {
  className?: string;
  onViewDiff: (entry: TimelineEntry) => void;
}

export default function ChangeLogPanel({ className, onViewDiff }: ChangeLogPanelProps) {
  const entries = useTimelineStore((s) => s.entries);
  const [filter, setFilter] = useState<Filter>('all');

  const filteredEntries = useMemo(() => {
    const filtered = filter === 'all'
      ? entries
      : entries.filter((e) => e.source === filter);
    // Show newest first.
    return [...filtered].reverse();
  }, [entries, filter]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Filter bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border shrink-0">
        {(['all', 'human', 'ai'] as Filter[]).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 px-2 text-[11px]"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'human' ? 'You' : 'AI'}
          </Button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground">
          {filteredEntries.length} {filteredEntries.length === 1 ? 'edit' : 'edits'}
        </span>
      </div>

      {/* Entries list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {filteredEntries.length === 0 ? (
            <div className="flex items-center justify-center text-center text-xs text-muted-foreground py-8 px-4">
              <p>No edits recorded yet. Changes will appear here as you write.</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <ChangeLogEntry key={entry.id} entry={entry} onViewDiff={onViewDiff} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
