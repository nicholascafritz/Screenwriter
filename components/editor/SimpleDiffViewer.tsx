'use client';

// ---------------------------------------------------------------------------
// SimpleDiffViewer -- Text-based diff viewer for screenplay revisions
// ---------------------------------------------------------------------------
//
// A lightweight diff viewer that doesn't use Monaco, avoiding the lifecycle
// issues with TextModel disposal. Uses a unified diff display with colored
// line highlights for additions, removals, and modifications.
// ---------------------------------------------------------------------------

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, X, ChevronUp, ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SimpleDiffViewerProps {
  /** The original screenplay content. */
  original: string;
  /** The modified screenplay content. */
  modified: string;
  /** Called when the user accepts all changes. */
  onAccept: () => void;
  /** Called when the user rejects all changes. */
  onReject: () => void;
  className?: string;
}

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  originalLineNum?: number;
  modifiedLineNum?: number;
}

// ---------------------------------------------------------------------------
// Diff computation
// ---------------------------------------------------------------------------

/**
 * Compute a simple line-by-line diff between original and modified text.
 * Uses a longest common subsequence approach for better quality.
 */
function computeLineDiff(original: string, modified: string): DiffLine[] {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');

  // Use a simple LCS-based diff for reasonable quality
  const result: DiffLine[] = [];

  // Build LCS table
  const m = origLines.length;
  const n = modLines.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origLines[i - 1] === modLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the diff
  const diffResult: Array<{ type: 'unchanged' | 'added' | 'removed'; line: string; origIdx?: number; modIdx?: number }> = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === modLines[j - 1]) {
      diffResult.unshift({ type: 'unchanged', line: origLines[i - 1], origIdx: i, modIdx: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffResult.unshift({ type: 'added', line: modLines[j - 1], modIdx: j });
      j--;
    } else if (i > 0) {
      diffResult.unshift({ type: 'removed', line: origLines[i - 1], origIdx: i });
      i--;
    }
  }

  // Convert to DiffLine format with proper line numbers
  for (const item of diffResult) {
    result.push({
      type: item.type,
      content: item.line,
      originalLineNum: item.origIdx,
      modifiedLineNum: item.modIdx,
    });
  }

  return result;
}

/**
 * Count total changes (additions + removals).
 */
function countChanges(lines: DiffLine[]): number {
  let count = 0;
  let inChange = false;

  for (const line of lines) {
    if (line.type !== 'unchanged') {
      if (!inChange) {
        count++;
        inChange = true;
      }
    } else {
      inChange = false;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SimpleDiffViewer({
  original,
  modified,
  onAccept,
  onReject,
  className,
}: SimpleDiffViewerProps) {
  const diffLines = useMemo(() => computeLineDiff(original, modified), [original, modified]);
  const changeCount = useMemo(() => countChanges(diffLines), [diffLines]);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Find indices of changed sections for navigation
  const changeIndices = useMemo(() => {
    const indices: number[] = [];
    let inChange = false;

    for (let i = 0; i < diffLines.length; i++) {
      if (diffLines[i].type !== 'unchanged') {
        if (!inChange) {
          indices.push(i);
          inChange = true;
        }
      } else {
        inChange = false;
      }
    }

    return indices;
  }, [diffLines]);

  const [currentChangeIndex, setCurrentChangeIndex] = React.useState(0);

  const scrollToChange = (index: number) => {
    if (index < 0 || index >= changeIndices.length) return;
    setCurrentChangeIndex(index);

    const lineIndex = changeIndices[index];
    const lineElement = document.getElementById(`diff-line-${lineIndex}`);
    if (lineElement && scrollContainerRef.current) {
      lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextDiff = () => {
    scrollToChange(Math.min(currentChangeIndex + 1, changeIndices.length - 1));
  };

  const handlePrevDiff = () => {
    scrollToChange(Math.max(currentChangeIndex - 1, 0));
  };

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-background',
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2.5">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground">
            Review Changes
          </h3>
          <span className="text-xs text-muted-foreground">
            {changeCount} {changeCount === 1 ? 'change' : 'changes'} detected
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation */}
          <Button variant="ghost" size="sm" className="gap-1" onClick={handlePrevDiff} disabled={changeIndices.length === 0}>
            <ChevronUp className="h-3.5 w-3.5" />
            Prev
          </Button>
          <Button variant="ghost" size="sm" className="gap-1" onClick={handleNextDiff} disabled={changeIndices.length === 0}>
            Next
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>

          {/* Primary actions */}
          <Button variant="destructive" size="sm" className="gap-1" onClick={onReject}>
            <X className="h-3.5 w-3.5" />
            Reject All
          </Button>
          <Button variant="success" size="sm" className="gap-1" onClick={onAccept}>
            <Check className="h-3.5 w-3.5" />
            Accept All
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 border-b border-border px-4 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-red-500/20 border border-red-500/40" />
          <span className="text-muted-foreground">Removed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-green-500/20 border border-green-500/40" />
          <span className="text-muted-foreground">Added</span>
        </div>
      </div>

      {/* Diff Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto font-mono text-sm"
        style={{ fontFamily: 'Courier Prime, Courier New, monospace' }}
      >
        <div className="min-w-fit">
          {diffLines.map((line, index) => (
            <div
              key={index}
              id={`diff-line-${index}`}
              className={cn(
                'flex border-b border-border/30',
                line.type === 'removed' && 'bg-red-500/10',
                line.type === 'added' && 'bg-green-500/10',
              )}
            >
              {/* Line number gutter */}
              <div className="flex-shrink-0 w-20 flex">
                <span className="w-10 px-2 py-0.5 text-right text-xs text-muted-foreground/60 border-r border-border/30">
                  {line.type !== 'added' ? line.originalLineNum : ''}
                </span>
                <span className="w-10 px-2 py-0.5 text-right text-xs text-muted-foreground/60 border-r border-border/30">
                  {line.type !== 'removed' ? line.modifiedLineNum : ''}
                </span>
              </div>

              {/* Change indicator */}
              <div className="flex-shrink-0 w-6 flex items-center justify-center">
                {line.type === 'removed' && (
                  <span className="text-red-400 font-bold">−</span>
                )}
                {line.type === 'added' && (
                  <span className="text-green-400 font-bold">+</span>
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  'flex-1 px-2 py-0.5 whitespace-pre-wrap break-all',
                  line.type === 'removed' && 'text-red-300',
                  line.type === 'added' && 'text-green-300',
                  line.type === 'unchanged' && 'text-foreground/80',
                )}
              >
                {line.content || '\u00A0'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
