'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useStoryBibleStore } from '@/lib/store/story-bible';
import { useEditorStore } from '@/lib/store/editor';
import { useOutlineStore } from '@/lib/store/outline';
import { getEditorHandle } from '@/components/editor/ScreenplayEditor';
import type { OutlineEntry } from '@/lib/store/outline-types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronDown, ChevronRight, MapPin, Sparkles } from 'lucide-react';

export default function LocationsTab() {
  const bible = useStoryBibleStore((s) => s.bible);
  const addLocation = useStoryBibleStore((s) => s.addLocation);
  const updateLocation = useStoryBibleStore((s) => s.updateLocation);
  const removeLocation = useStoryBibleStore((s) => s.removeLocation);
  const screenplay = useEditorStore((s) => s.screenplay);

  const outlineScenes = useOutlineStore((s) => s.outline?.scenes ?? []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  /** Map from uppercase location name → scenes at that location. */
  const scenesForLocation = useMemo(() => {
    const map = new Map<string, OutlineEntry[]>();
    for (const scene of outlineScenes) {
      if (!scene.location) continue;
      const key = scene.location.toUpperCase().trim();
      const existing = map.get(key) ?? [];
      existing.push(scene);
      map.set(key, existing);
    }
    return map;
  }, [outlineScenes]);

  const handleSceneClick = useCallback((entry: OutlineEntry) => {
    if (!entry.fountainRange) return;
    const handle = getEditorHandle();
    if (handle) {
      handle.revealLine(entry.fountainRange.startLine);
    }
  }, []);

  if (!bible) return null;

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addLocation(trimmed);
    setNewName('');
  };

  // Auto-populate from screenplay locations.
  const handleAutoPopulate = () => {
    if (!screenplay?.locations) return;
    const existing = new Set(bible.locations.map((l) => l.name.toUpperCase()));
    for (const loc of screenplay.locations) {
      if (!existing.has(loc.toUpperCase())) {
        addLocation(loc);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Add location */}
      <div className="p-2 border-b border-border shrink-0 space-y-1">
        <div className="flex gap-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Location name..."
            className="text-xs h-7 flex-1"
          />
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={handleAdd}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {screenplay?.locations && screenplay.locations.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-6 text-[10px] gap-1"
            onClick={handleAutoPopulate}
          >
            <Sparkles className="h-3 w-3" />
            Import from screenplay ({screenplay.locations.length} locations)
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {bible.locations.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-6">
              <MapPin className="h-5 w-5 mx-auto mb-1 opacity-40" />
              <p>No locations yet</p>
            </div>
          ) : (
            bible.locations.map((loc) => {
              const isExpanded = expandedId === loc.id;
              return (
                <div key={loc.id} className="border border-border rounded-md">
                  <button
                    className="flex items-center w-full p-2 text-xs font-medium text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : loc.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 mr-1 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3 w-3 mr-1 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{loc.name}</span>
                    {(() => {
                      const count = scenesForLocation.get(loc.name.toUpperCase().trim())?.length ?? 0;
                      return count > 0 ? (
                        <span className="text-[9px] text-emerald-400 font-medium mr-1">
                          {count} scene{count !== 1 ? 's' : ''}
                        </span>
                      ) : null;
                    })()}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLocation(loc.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </button>

                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-2 border-t border-border pt-2">
                      <Input
                        value={loc.name}
                        onChange={(e) => updateLocation(loc.id, { name: e.target.value })}
                        placeholder="Name"
                        className="text-xs h-7"
                      />
                      <Textarea
                        value={loc.description}
                        onChange={(e) => updateLocation(loc.id, { description: e.target.value })}
                        placeholder="Description (atmosphere, significance, details)..."
                        className="text-xs min-h-[60px] resize-none"
                        rows={3}
                      />
                      {(() => {
                        const scenes = scenesForLocation.get(loc.name.toUpperCase().trim()) ?? [];
                        if (scenes.length === 0) return null;
                        return (
                          <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Scenes ({scenes.length})
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {scenes.map((scene) => (
                                <Badge
                                  key={scene.id}
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 leading-4 gap-1 cursor-pointer hover:bg-accent/50"
                                  onClick={() => handleSceneClick(scene)}
                                  title={scene.heading}
                                >
                                  {scene.intExt && (
                                    <span className="text-muted-foreground">{scene.intExt}</span>
                                  )}
                                  {scene.timeOfDay || scene.heading}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
