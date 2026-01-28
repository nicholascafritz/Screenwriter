'use client';

// ---------------------------------------------------------------------------
// OutlinePanel -- Scene navigator / structural spine sidebar
// ---------------------------------------------------------------------------
//
// Lists every scene from the persistent Outline store as a BeatCard.
// Clicking a card scrolls the Monaco editor to that scene's starting line.
// The currently active scene (based on cursor position) is highlighted.
//
// Features:
// - Act grouping with collapsible headers (auto-detected or explicit)
// - Inline summary editing (double-click on BeatCard summary)
// - Add planned scene button
// - Drag-and-drop reordering (via SortableBeatCard)
// - Right-click context menu (via SceneContextMenu)
//
// Data source priority:
// - Scene identity & metadata: useOutlineStore (persistent SceneIds)
// - Character names & element counts: useEditorStore (ephemeral parse data)
// ---------------------------------------------------------------------------

import React, { useCallback, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/lib/store/editor';
import { useOutlineStore } from '@/lib/store/outline';
import { useStoryBibleStore } from '@/lib/store/story-bible';
import type { OutlineEntry, OutlineAct } from '@/lib/store/outline-types';
import { getEditorHandle } from '@/components/editor/ScreenplayEditor';
import { reorderDraftedSceneInEditor } from '@/lib/outline/reorder';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip } from '@/components/ui/tooltip';
import { FileText, MapPin, Plus, ChevronRight } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import BeatCard from './BeatCard';
import SortableBeatCard from './SortableBeatCard';
import SceneContextMenu from './SceneContextMenu';

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

  // -- Local state ----------------------------------------------------------

  const [collapsedActs, setCollapsedActs] = useState<Set<string>>(new Set());
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // -- DnD sensors ----------------------------------------------------------

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // -- Derived data ---------------------------------------------------------

  const entries = outline?.scenes ?? [];
  const pageCount = screenplay?.pageCount ?? 0;
  const draftedCount = entries.filter((e) => e.fountainRange !== null).length;
  const plannedCount = entries.filter((e) => e.fountainRange === null).length;

  /**
   * Build a lookup from startLine → parsed Scene for enrichment data.
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
   */
  const activeSceneId = useMemo(() => {
    if (entries.length === 0) return null;
    for (let i = entries.length - 1; i >= 0; i--) {
      const range = entries[i].fountainRange;
      if (range && cursorLine >= range.startLine) {
        return entries[i].id;
      }
    }
    const first = entries.find((e) => e.fountainRange !== null);
    return first?.id ?? null;
  }, [entries, cursorLine]);


  // -- Handlers -------------------------------------------------------------

  const handleSceneClick = useCallback((entry: OutlineEntry) => {
    if (!entry.fountainRange) return;
    const handle = getEditorHandle();
    if (handle) {
      handle.revealLine(entry.fountainRange.startLine);
    }
  }, []);

  const toggleAct = useCallback((actId: string) => {
    setCollapsedActs((prev) => {
      const next = new Set(prev);
      if (next.has(actId)) next.delete(actId);
      else next.add(actId);
      return next;
    });
  }, []);

  const handleSummaryChange = useCallback((sceneId: string, summary: string) => {
    useOutlineStore.getState().updateScene(sceneId, { summary });
  }, []);

  const handleAddScene = useCallback(() => {
    const afterId = activeSceneId ?? entries[entries.length - 1]?.id ?? null;
    const newId = useOutlineStore.getState().addPlannedScene(afterId, {
      heading: 'NEW SCENE',
    });
    setEditingSceneId(newId);
  }, [activeSceneId, entries]);

  // -- DnD handlers ---------------------------------------------------------

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const movedEntry = entries.find((e) => e.id === active.id);
      const targetEntry = entries.find((e) => e.id === over.id);
      if (!movedEntry || !targetEntry) return;

      const oldIndex = entries.findIndex((e) => e.id === active.id);
      const newIndex = entries.findIndex((e) => e.id === over.id);

      if (movedEntry.fountainRange !== null) {
        // Drafted scene: move Fountain text in the editor.
        const position = newIndex > oldIndex ? 'after' : 'before';
        reorderDraftedSceneInEditor(movedEntry, targetEntry, position);
      } else {
        // Planned scene: just reorder in the outline store.
        useOutlineStore.getState().reorderScene(movedEntry.id, newIndex);
      }
    },
    [entries],
  );

  const activeDragEntry = activeDragId
    ? entries.find((e) => e.id === activeDragId)
    : null;

  // -- Render helpers -------------------------------------------------------

  /** Render a single BeatCard wrapped with sortable + context menu. */
  const renderBeatCard = (entry: OutlineEntry, idx: number) => {
    const prevEntry = entries[idx - 1];
    return (
      <SortableBeatCard key={entry.id} id={entry.id}>
        <SceneContextMenu
          entry={entry}
          beats={beatSheet ?? []}
          onEditSummary={() => setEditingSceneId(entry.id)}
          onAssignBeat={(beatId) =>
            useOutlineStore.getState().assignBeat(entry.id, beatId)
          }
          onUnassignBeat={() =>
            useOutlineStore.getState().unassignBeat(entry.id)
          }
          onChangeStatus={(status) =>
            useOutlineStore.getState().updateScene(entry.id, { status })
          }
          onDelete={() => useOutlineStore.getState().removeScene(entry.id)}
          onAddAbove={() =>
            useOutlineStore.getState().addPlannedScene(prevEntry?.id ?? null)
          }
          onAddBelow={() =>
            useOutlineStore.getState().addPlannedScene(entry.id)
          }
        >
          <BeatCard
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
              entry.beatId ? beatNameMap.get(entry.beatId) : undefined
            }
            isEditing={editingSceneId === entry.id}
            onSummaryChange={(summary) => handleSummaryChange(entry.id, summary)}
            onEditComplete={() => setEditingSceneId(null)}
            onEditRequest={() => setEditingSceneId(entry.id)}
          />
        </SceneContextMenu>
      </SortableBeatCard>
    );
  };

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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            Outline
          </h2>
          <Tooltip content="Add planned scene">
            <button
              type="button"
              onClick={handleAddScene}
              className="flex items-center justify-center h-6 w-6 rounded-md
                         text-muted-foreground hover:text-foreground hover:bg-accent
                         transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>

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

      {/* Scene list with drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={entries.map((e) => e.id)}
          strategy={verticalListSortingStrategy}
        >
          <ScrollArea className="flex-1 p-2">
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-sm text-muted-foreground p-6">
                <FileText className="h-8 w-8 mb-2 opacity-40" />
                <p className="font-medium">No scenes found</p>
                <p className="mt-1 text-xs">
                  Add scene headings (INT./EXT.) to your screenplay to see them
                  listed here, or click + to add a planned scene.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Render all scenes as siblings for proper dnd-kit sorting */}
                {entries.map((entry, idx) => {
                  // Check if this scene starts a new act group
                  const actForEntry = outline?.acts?.find((act) =>
                    act.sceneIds.includes(entry.id)
                  );
                  const prevEntry = entries[idx - 1];
                  const prevActForEntry = prevEntry
                    ? outline?.acts?.find((act) => act.sceneIds.includes(prevEntry.id))
                    : null;
                  const isNewAct = actForEntry?.id !== prevActForEntry?.id && actForEntry;
                  const isCollapsed = actForEntry && collapsedActs.has(actForEntry.id);

                  return (
                    <React.Fragment key={entry.id}>
                      {/* Act header when starting new act */}
                      {isNewAct && (
                        <button
                          type="button"
                          onClick={() => toggleAct(actForEntry!.id)}
                          className="flex items-center gap-1.5 w-full px-1 py-1.5 text-[10px]
                                     font-semibold text-muted-foreground uppercase tracking-wider
                                     hover:text-foreground transition-colors rounded"
                        >
                          <ChevronRight
                            className={cn(
                              'h-3 w-3 transition-transform shrink-0',
                              !collapsedActs.has(actForEntry!.id) && 'rotate-90',
                            )}
                          />
                          <span className="truncate">{actForEntry!.label}</span>
                          <span className="ml-auto font-normal text-[9px] shrink-0">
                            {outline?.acts?.find((a) => a.id === actForEntry!.id)?.sceneIds.length ?? 0} scene
                            {(outline?.acts?.find((a) => a.id === actForEntry!.id)?.sceneIds.length ?? 0) !== 1 ? 's' : ''}
                          </span>
                        </button>
                      )}
                      {/* Scene card (hidden when act is collapsed) */}
                      {!isCollapsed && renderBeatCard(entry, idx)}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SortableContext>

        {/* Drag overlay -- ghost card while dragging */}
        <DragOverlay>
          {activeDragEntry && (
            <div className="opacity-90 shadow-lg rounded-lg">
              <BeatCard
                entry={activeDragEntry}
                enrichment={
                  activeDragEntry.fountainRange
                    ? enrichmentMap.get(activeDragEntry.fountainRange.startLine)
                    : undefined
                }
                sceneIndex={entries.findIndex((e) => e.id === activeDragEntry.id)}
                isActive={false}
                onClick={() => {}}
                beatName={
                  activeDragEntry.beatId
                    ? beatNameMap.get(activeDragEntry.beatId)
                    : undefined
                }
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
