'use client';

// ---------------------------------------------------------------------------
// DiffViewer -- Side-by-side diff viewer for screenplay revisions
// ---------------------------------------------------------------------------
//
// Uses Monaco's built-in DiffEditor to display original vs. modified
// Fountain screenplay content.  Includes Accept All / Reject All controls
// and an optional per-hunk accept callback.
// ---------------------------------------------------------------------------

import React, { useCallback, useRef } from 'react';
import { DiffEditor, type BeforeMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { registerFountainLanguage } from './FountainLanguage';
import { registerFountainTheme, FOUNTAIN_THEME_NAME } from './FountainTheme';
import { useEditorStore } from '@/lib/store/editor';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, X, ChevronUp, ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiffViewerProps {
  /** The original screenplay content (left pane). */
  original: string;
  /** The modified screenplay content (right pane). */
  modified: string;
  /** Called when the user accepts all changes. */
  onAccept: () => void;
  /** Called when the user rejects all changes. */
  onReject: () => void;
  /** Optional callback to accept an individual hunk by index. */
  onAcceptHunk?: (hunkIndex: number) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Monaco diff editor options
// ---------------------------------------------------------------------------

const DIFF_EDITOR_OPTIONS: Monaco.editor.IDiffEditorConstructionOptions = {
  fontFamily: 'Courier Prime, Courier New, monospace',
  fontSize: 15,
  lineHeight: 22,
  wordWrap: 'on',
  wordWrapColumn: 65,
  minimap: { enabled: false },
  lineNumbers: 'on',
  renderLineHighlight: 'line',
  scrollBeyondLastLine: false,
  padding: { top: 20 },
  readOnly: true,
  originalEditable: false,
  automaticLayout: true,
  scrollbar: {
    verticalScrollbarSize: 8,
    horizontalScrollbarSize: 8,
  },
  overviewRulerLanes: 2,
  renderSideBySide: true,
  enableSplitViewResizing: true,
  renderOverviewRuler: true,
  ignoreTrimWhitespace: false,
  renderIndicators: true,
  renderMarginRevertIcon: false,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DiffViewer({
  original,
  modified,
  onAccept,
  onReject,
  onAcceptHunk,
  className,
}: DiffViewerProps) {
  const diffEditorRef = useRef<Monaco.editor.IStandaloneDiffEditor | null>(null);

  // ---- Character list for auto-complete -----------------------------------

  const getCharacters = useCallback((): string[] => {
    const sp = useEditorStore.getState().screenplay;
    return sp?.characters ?? [];
  }, []);

  // ---- Monaco lifecycle ---------------------------------------------------

  const handleBeforeMount: BeforeMount = useCallback(
    (monaco) => {
      registerFountainLanguage(monaco, getCharacters);
      registerFountainTheme(monaco);
    },
    [getCharacters],
  );

  const handleMount = useCallback(
    (editor: Monaco.editor.IStandaloneDiffEditor) => {
      diffEditorRef.current = editor;
    },
    [],
  );

  // ---- Hunk navigation ----------------------------------------------------

  const handleNextDiff = useCallback(() => {
    const editor = diffEditorRef.current;
    if (!editor) return;
    const nav = editor as unknown as { goToDiff?: (dir: string) => void };
    if (typeof nav.goToDiff === 'function') {
      nav.goToDiff('next');
    }
  }, []);

  const handlePrevDiff = useCallback(() => {
    const editor = diffEditorRef.current;
    if (!editor) return;
    const nav = editor as unknown as { goToDiff?: (dir: string) => void };
    if (typeof nav.goToDiff === 'function') {
      nav.goToDiff('previous');
    }
  }, []);

  // ---- Render -------------------------------------------------------------

  // Count approximate change regions for the summary line.
  const changeCount = countChanges(original, modified);

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-background',
        className,
      )}
    >
      {/* ---- Toolbar ---- */}
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
          <Button variant="ghost" size="sm" className="gap-1" onClick={handlePrevDiff}>
            <ChevronUp className="h-3.5 w-3.5" />
            Prev
          </Button>
          <Button variant="ghost" size="sm" className="gap-1" onClick={handleNextDiff}>
            Next
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>

          {/* Accept individual hunk (if supported) */}
          {onAcceptHunk && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAcceptHunk(0)}
            >
              Accept Hunk
            </Button>
          )}

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

      {/* ---- Column Labels ---- */}
      <div className="flex border-b border-border text-xs font-medium">
        <div className="flex-1 border-r border-border px-4 py-2 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-danger" />
          <span className="text-danger uppercase tracking-wide text-[10px] font-semibold">
            Original (Before)
          </span>
        </div>
        <div className="flex-1 px-4 py-2 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-success" />
          <span className="text-success uppercase tracking-wide text-[10px] font-semibold">
            Proposed (After)
          </span>
        </div>
      </div>

      {/* ---- Diff Editor ---- */}
      <div className="flex-1">
        <DiffEditor
          height="100%"
          language="fountain"
          theme={FOUNTAIN_THEME_NAME}
          original={original}
          modified={modified}
          options={DIFF_EDITOR_OPTIONS}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          loading={
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Loading diff view...
            </div>
          }
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Quickly count the number of contiguous changed regions between two texts.
 * This is a lightweight approximation -- not a full diff algorithm -- used
 * only for the summary line in the toolbar.
 */
function countChanges(original: string, modified: string): number {
  const origLines = original.split('\n');
  const modLines = modified.split('\n');
  const maxLen = Math.max(origLines.length, modLines.length);

  let changes = 0;
  let inChange = false;

  for (let i = 0; i < maxLen; i++) {
    const a = origLines[i] ?? '';
    const b = modLines[i] ?? '';
    if (a !== b) {
      if (!inChange) {
        changes++;
        inChange = true;
      }
    } else {
      inChange = false;
    }
  }

  return changes;
}
