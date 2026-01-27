'use client';

import React from 'react';
import type { TimelineEntry } from '@/lib/diff/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, User, Bot } from 'lucide-react';

interface ChangeLogEntryProps {
  entry: TimelineEntry;
  onViewDiff: (entry: TimelineEntry) => void;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ChangeLogEntry({ entry, onViewDiff }: ChangeLogEntryProps) {
  const isAI = entry.source === 'ai';

  return (
    <div className="flex items-start gap-2 rounded-md border border-border p-2 text-xs hover:bg-muted/30 transition-colors">
      <div className="mt-0.5 shrink-0">
        {isAI ? (
          <Bot className="h-3.5 w-3.5 text-primary" />
        ) : (
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <Badge variant={isAI ? 'default' : 'outline'} className="text-[10px] h-4 px-1">
            {isAI ? 'AI' : 'You'}
          </Badge>
          <span className="text-muted-foreground truncate">
            {formatRelativeTime(entry.timestamp)}
          </span>
        </div>
        <p className="text-foreground/80 truncate">{entry.description}</p>
        {entry.sceneName && (
          <p className="text-muted-foreground truncate text-[10px]">{entry.sceneName}</p>
        )}
        <p className="text-muted-foreground text-[10px]">{entry.diff.summary}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => onViewDiff(entry)}
        title="View diff"
      >
        <Eye className="h-3 w-3" />
      </Button>
    </div>
  );
}
