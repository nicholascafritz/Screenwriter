'use client';

// ---------------------------------------------------------------------------
// OutlinePanel -- Scene navigator / beat sheet sidebar
// ---------------------------------------------------------------------------
//
// Lists every scene in the parsed screenplay as a BeatCard.  Clicking a
// card scrolls the Monaco editor to that scene's starting line.  The
// currently active scene (based on cursor position) is highlighted.
// ---------------------------------------------------------------------------

import React, { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/lib/store/editor';
import { getEditorHandle } from '@/components/editor/ScreenplayEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, MapPin } from 'lucide-react';
import BeatCard from './BeatCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OutlinePanelProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OutlinePanel({ className }: OutlinePanelProps) {
  // -- Store bindings -------------------------------------------------------

  const screenplay = useEditorStore((s) => s.screenplay);
  const cursorLine = useEditorStore((s) => s.cursorLine);

  // -- Derived data ---------------------------------------------------------

  const scenes = screenplay?.scenes ?? [];
  const pageCount = screenplay?.pageCount ?? 0;
  const sceneCount = scenes.length;

  /**
   * Determine which scene is "active" based on the current cursor line.
   * The active scene is the one whose line range contains the cursor.
   */
  const activeSceneId = useMemo(() => {
    if (scenes.length === 0) return null;

    // Walk backwards to find the scene whose startLine <= cursorLine.
    for (let i = scenes.length - 1; i >= 0; i--) {
      if (cursorLine >= scenes[i].startLine) {
        return scenes[i].id;
      }
    }
    return scenes[0]?.id ?? null;
  }, [scenes, cursorLine]);

  // -- Handlers -------------------------------------------------------------

  const handleSceneClick = useCallback((startLine: number) => {
    const handle = getEditorHandle();
    if (handle) {
      handle.revealLine(startLine);
    }
  }, []);

  // -- Render ---------------------------------------------------------------

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-background',
        className,
      )}
    >
      {/* Header with stats */}
      <div className="shrink-0 p-3 border-b border-border space-y-2">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          Outline
        </h2>

        {/* Summary stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>
              ~{pageCount} page{pageCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>
              {sceneCount} scene{sceneCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Scene list */}
      <ScrollArea className="flex-1 p-2">
        {scenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-sm text-muted-foreground p-6">
            <FileText className="h-8 w-8 mb-2 opacity-40" />
            <p className="font-medium">No scenes found</p>
            <p className="mt-1 text-xs">
              Add scene headings (INT./EXT.) to your screenplay to see them
              listed here.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {scenes.map((scene, idx) => (
              <BeatCard
                key={scene.id}
                scene={scene}
                sceneIndex={idx}
                isActive={scene.id === activeSceneId}
                onClick={() => handleSceneClick(scene.startLine)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
