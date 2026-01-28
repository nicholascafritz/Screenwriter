'use client';

import React, { useMemo } from 'react';
import { useStoryBibleStore } from '@/lib/store/story-bible';
import { useOutlineStore } from '@/lib/store/outline';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Users,
  MapPin,
  ListChecks,
  CheckCircle2,
  Circle,
  FileText,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GuideSidebar() {
  const bible = useStoryBibleStore((s) => s.bible);
  const outlineScenes = useOutlineStore((s) => s.outline?.scenes ?? []);

  /** Map from beat ID → beat name for display. */
  const beatNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!bible) return map;
    for (const beat of bible.beatSheet) {
      map.set(beat.id, beat.beat);
    }
    return map;
  }, [bible]);

  if (!bible) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Loading story bible...
      </div>
    );
  }

  const completedBeats = bible.beatSheet.filter((b) => b.completed).length;
  const totalBeats = bible.beatSheet.length;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Overview Section */}
        <section>
          <div className="flex items-center gap-1.5 mb-3">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Overview
            </h3>
          </div>
          <div className="space-y-2">
            <FieldRow label="Genre" value={bible.genre} />
            <FieldRow label="Tone" value={bible.tone} />
            <FieldRow label="Logline" value={bible.logline} />
            {bible.synopsis && <FieldRow label="Synopsis" value={bible.synopsis} />}
            {bible.themes.length > 0 && (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Themes
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {bible.themes.map((theme) => (
                    <Badge
                      key={theme}
                      variant="secondary"
                      className="text-[10px] h-5 px-1.5"
                    >
                      {theme}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Characters Section */}
        {bible.characters.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Characters ({bible.characters.length})
              </h3>
            </div>
            <div className="space-y-2">
              {bible.characters.map((char) => (
                <div
                  key={char.id}
                  className="rounded-md border border-border bg-muted/30 p-2.5"
                >
                  <div className="font-medium text-xs text-foreground">
                    {char.name}
                  </div>
                  {char.description && (
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                      {char.description}
                    </p>
                  )}
                  {char.arc && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 italic">
                      Arc: {char.arc}
                    </p>
                  )}
                  {char.relationships.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {char.relationships.map((rel, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-[9px] h-4 px-1"
                        >
                          {rel.characterId}: {rel.relationship}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Locations Section */}
        {bible.locations.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Locations ({bible.locations.length})
              </h3>
            </div>
            <div className="space-y-1.5">
              {bible.locations.map((loc) => (
                <div
                  key={loc.id}
                  className="rounded-md border border-border bg-muted/30 p-2"
                >
                  <div className="font-medium text-xs text-foreground">
                    {loc.name}
                  </div>
                  {loc.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                      {loc.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Beat Sheet Section */}
        <section>
          <div className="flex items-center gap-1.5 mb-3">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Beat Sheet ({completedBeats}/{totalBeats})
            </h3>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-muted mb-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(completedBeats / totalBeats) * 100}%` }}
            />
          </div>

          <div className="space-y-1">
            {bible.beatSheet.map((beat) => (
              <div
                key={beat.id}
                className="flex items-start gap-2 py-1"
              >
                {beat.completed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs font-medium ${
                      beat.completed ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {beat.beat}
                  </div>
                  {beat.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                      {beat.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Outline Section */}
        {outlineScenes.length > 0 && (
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Scene Outline ({outlineScenes.length})
              </h3>
            </div>
            <div className="space-y-1.5">
              {outlineScenes.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-md border border-border bg-muted/30 p-2"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {entry.sortIndex + 1}.
                    </span>
                    <span className="text-xs font-medium text-foreground truncate">
                      {entry.heading || 'Untitled Scene'}
                    </span>
                  </div>
                  {entry.summary && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                      {entry.summary}
                    </p>
                  )}
                  {entry.beatId && beatNameMap.get(entry.beatId) && (
                    <Badge
                      variant="outline"
                      className="text-[8px] h-3.5 px-1 mt-1"
                    >
                      {beatNameMap.get(entry.beatId)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function FieldRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      <p className="text-xs text-foreground mt-0.5">{value}</p>
    </div>
  );
}
