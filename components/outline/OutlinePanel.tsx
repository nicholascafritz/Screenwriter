'use client';

// ---------------------------------------------------------------------------
// OutlinePanel -- Scene navigator / structural spine sidebar
// ---------------------------------------------------------------------------
//
// Lists every scene from the persistent Outline store as a BeatCard.
// Clicking a card scrolls the Monaco editor to that scene's starting line.
// The currently active scene (based on cursor position) is highlighted.
//
// Data source priority:
// - Scene identity & metadata: useOutlineStore (persistent SceneIds)
// - Character names & element counts: useEditorStore (ephemeral parse data)
// ---------------------------------------------------------------------------

import React, { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/lib/store/editor';
import { useOutlineStore } from '@/lib/store/outline';
import { useStoryBibleStore } from '@/lib/store/story-bible';
import type { OutlineEntry } from '@/lib/store/outline-types';
import type { Scene } from '@/lib/fountain/types';
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

/**
 * Enrichment data from the ephemeral parse for display purposes.
 * The Outline store doesn't track element counts or character names yet;
 * those come from the parsed Scene.
 */
export interface SceneEnrichment {
  characters: string[];
  elementCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OutlinePanel({ className }: OutlinePanelProps) {
  // -- Store bindings -------------------------------------------------------

  const outline = useOutlineStore((s) => s.outline);
  const screenplay = useEditorStore((s) => s.screenplay);
  const cursorLine = useEditorStore((s) => s.cursorLine);
  const beatSheet = useStoryBibleStore((s) => s.bible?.beatSheet);

  // -- Derived data ---------------------------------------------------------

  const entries = outline?.scenes ?? [];
  const pageCount = screenplay?.pageCount ?? 0;
  const draftedCount = entries.filter((e) => e.fountainRange !== null).length;
  const plannedCount = entries.filter((e) => e.fountainRange === null).length;

  /**
   * Build a lookup from startLine → parsed Scene for enrichment data.
   * This lets us pull characters and element counts from the ephemeral parse
   * while keeping identity rooted in the Outline store.
   */
  const enrichmentMap = useMemo(() => {
    const map = new Map<number, SceneEnrichment>();
    if (!screenplay) return map;
    for (const scene of screenplay.scenes) {
      map.set(scene.startLine, {
        characters: scene.characters,
        elementCount: scene.elements.length,
      });
    }
    return map;
  }, [screenplay]);

  /**
   * Map from beat ID → beat name for display in BeatCards.
   */
  const beatNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!beatSheet) return map;
    for (const beat of beatSheet) {
      map.set(beat.id, beat.beat);
    }
    return map;
  }, [beatSheet]);

  /**
   * Determine which scene is "active" based on the current cursor line.
   * Uses the Outline store's fountainRange for matching.
   */
  const activeSceneId = useMemo(() => {
    if (entries.length === 0) return null;

    // Walk backwards through drafted scenes to find the one containing the cursor.
    for (let i = entries.length - 1; i >= 0; i--) {
      const range = entries[i].fountainRange;
      if (range && cursorLine >= range.startLine) {
        return entries[i].id;
      }
    }
    // Fallback: first drafted scene.
    const first = entries.find((e) => e.fountainRange !== null);
    return first?.id ?? null;
  }, [entries, cursorLine]);

  // -- Handlers -------------------------------------------------------------

  const handleSceneClick = useCallback((entry: OutlineEntry) => {
    if (!entry.fountainRange) return; // Can't navigate to planned scenes.
    const handle = getEditorHandle();
    if (handle) {
      handle.revealLine(entry.fountainRange.startLine);
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
              {draftedCount} scene{draftedCount !== 1 ? 's' : ''}
            </span>
          </div>
          {plannedCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-amber-400">
                {plannedCount} planned
              </span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Scene list */}
      <ScrollArea className="flex-1 p-2">
        {entries.length === 0 ? (
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
            {entries.map((entry, idx) => (
              <BeatCard
                key={entry.id}
                entry={entry}
                enrichment={
                  entry.fountainRange
                    ? enrichmentMap.get(entry.fountainRange.startLine)
                    : undefined
                }
                sceneIndex={idx}
                isActive={entry.id === activeSceneId}
                onClick={() => handleSceneClick(entry)}
                beatName={
                  entry.beatId
                    ? beatNameMap.get(entry.beatId)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
