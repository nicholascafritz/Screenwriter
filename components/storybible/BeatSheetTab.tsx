'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useStoryBibleStore, SAVE_THE_CAT_BEATS } from '@/lib/store/story-bible';
import { useOutlineStore } from '@/lib/store/outline';
import { getEditorHandle } from '@/components/editor/ScreenplayEditor';
import type { OutlineEntry } from '@/lib/store/outline-types';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, ChevronRight, X, MapPin } from 'lucide-react';

export default function BeatSheetTab() {
  const bible = useStoryBibleStore((s) => s.bible);
  const updateBeat = useStoryBibleStore((s) => s.updateBeat);
  const outlineScenes = useOutlineStore((s) => s.outline?.scenes ?? []);
  const assignBeat = useOutlineStore((s) => s.assignBeat);
  const unassignBeat = useOutlineStore((s) => s.unassignBeat);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assigningBeatId, setAssigningBeatId] = useState<string | null>(null);

  /** Scenes assigned to each beat, keyed by beat ID. */
  const scenesForBeat = useMemo(() => {
    const map = new Map<string, OutlineEntry[]>();
    for (const scene of outlineScenes) {
      if (scene.beatId) {
        const existing = map.get(scene.beatId) ?? [];
        existing.push(scene);
        map.set(scene.beatId, existing);
      }
    }
    return map;
  }, [outlineScenes]);

  /** Scenes not yet assigned to any beat. */
  const unassignedScenes = useMemo(
    () => outlineScenes.filter((s) => !s.beatId && s.fountainRange !== null),
    [outlineScenes],
  );

  const handleSceneClick = useCallback((entry: OutlineEntry) => {
    if (!entry.fountainRange) return;
    const handle = getEditorHandle();
    if (handle) {
      handle.revealLine(entry.fountainRange.startLine);
    }
  }, []);

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
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{beat.beat}</span>
                      {(scenesForBeat.get(beat.id)?.length ?? 0) > 0 && (
                        <span className="text-[9px] text-amber-400 font-medium">
                          {scenesForBeat.get(beat.id)!.length} scene
                          {scenesForBeat.get(beat.id)!.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
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

                    {/* Assigned scenes */}
                    {(() => {
                      const assigned = scenesForBeat.get(beat.id) ?? [];
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Scenes ({assigned.length})
                            </span>
                            {unassignedScenes.length > 0 && (
                              <button
                                className="text-[10px] text-primary hover:underline"
                                onClick={() =>
                                  setAssigningBeatId(
                                    assigningBeatId === beat.id ? null : beat.id,
                                  )
                                }
                              >
                                {assigningBeatId === beat.id ? 'Cancel' : '+ Assign Scene'}
                              </button>
                            )}
                          </div>

                          {/* Scene badges */}
                          {assigned.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {assigned.map((scene) => (
                                <Badge
                                  key={scene.id}
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 leading-4 gap-1 cursor-pointer hover:bg-accent/50 group/badge"
                                  onClick={() => handleSceneClick(scene)}
                                  title={`Click to navigate to ${scene.location || scene.heading}`}
                                >
                                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate max-w-[80px]">
                                    {scene.location || scene.heading || 'Untitled'}
                                  </span>
                                  <button
                                    className="ml-0.5 opacity-0 group-hover/badge:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      unassignBeat(scene.id);
                                    }}
                                    title="Unassign scene"
                                  >
                                    <X className="h-2.5 w-2.5 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Assignment dropdown */}
                          {assigningBeatId === beat.id && (
                            <div className="border border-border rounded-md bg-popover max-h-32 overflow-y-auto">
                              {unassignedScenes.map((scene) => (
                                <button
                                  key={scene.id}
                                  className="w-full text-left px-2 py-1 text-[10px] hover:bg-accent/50 transition-colors flex items-center gap-1.5"
                                  onClick={() => {
                                    assignBeat(scene.id, beat.id);
                                    setAssigningBeatId(null);
                                  }}
                                >
                                  <MapPin className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                                  <span className="truncate">
                                    {scene.location || scene.heading || 'Untitled'}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
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
