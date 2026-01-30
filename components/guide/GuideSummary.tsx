'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStoryBibleStore } from '@/lib/store/story-bible';
import { useProjectStore } from '@/lib/store/project';
import { useEditorStore } from '@/lib/store/editor';
import { useOutlineStore } from '@/lib/store/outline';
import { useGuidedWritingStore } from '@/lib/store/guided-writing';
import { outlineToFountain } from '@/lib/guide/outline-to-fountain';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  FileText,
  Loader2,
  PenLine,
  Sparkles,
} from 'lucide-react';

interface GuideSummaryProps {
  /** Whether scene generation is still in progress. */
  isGenerating?: boolean;
}

/**
 * Transition screen shown after the guide conversation and outline generation
 * are complete.  Shows a summary of the beat sheet and scene outline, and
 * offers two paths forward: auto-generate a Fountain skeleton or start blank.
 */
export default function GuideSummary({ isGenerating = false }: GuideSummaryProps) {
  const router = useRouter();
  const bible = useStoryBibleStore((s) => s.bible);
  const projectName = useProjectStore((s) => s.name);
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

  if (!bible) return null;

  const completedBeats = bible.beatSheet.filter((b) => b.completed);

  const handleGenerateSkeleton = () => {
    const fountain = outlineToFountain(projectName, outlineScenes, beatNameMap);
    useEditorStore.getState().setContent(fountain);
    useEditorStore.setState({ _lastCommittedContent: fountain });
    // Activate guided writing mode for scene-by-scene AI prompting
    useGuidedWritingStore.getState().startGuidedWriting();
    router.push('/editor');
  };

  const handleStartBlank = () => {
    router.push('/editor');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center py-8 px-6 border-b border-border">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          Story Bible Complete
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Your story is developed and ready to write.
          {completedBeats.length} beats defined
          {outlineScenes.length > 0 && `, ${outlineScenes.length} scenes outlined`}.
        </p>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-6 space-y-8">
          {/* Beat Sheet Summary */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Beat Sheet ({completedBeats.length}/15)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {bible.beatSheet.map((beat) => (
                <div
                  key={beat.id}
                  className={`rounded-md border p-2.5 ${
                    beat.completed
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border bg-muted/20'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {beat.completed ? (
                      <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-muted-foreground/30 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-foreground">
                      {beat.beat}
                    </span>
                  </div>
                  {beat.description && (
                    <p className="text-[10px] text-muted-foreground mt-1 ml-[18px] line-clamp-2">
                      {beat.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Scene Outline */}
          {(outlineScenes.length > 0 || isGenerating) && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 text-primary" />
                )}
                Scene Outline ({outlineScenes.length} scenes)
                {isGenerating && (
                  <span className="text-xs font-normal text-muted-foreground">
                    — Generating...
                  </span>
                )}
              </h3>
              <div className="space-y-1.5">
                {outlineScenes.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-md border border-border p-2.5 flex items-start gap-3"
                  >
                    <span className="text-xs text-muted-foreground font-mono shrink-0 w-6 text-right">
                      {entry.sortIndex + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground">
                        {entry.heading || 'Untitled Scene'}
                      </div>
                      {entry.summary && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
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
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>

      {/* Action buttons */}
      <div className="shrink-0 border-t border-border p-6">
        <div className="flex items-center justify-center gap-4 max-w-lg mx-auto">
          {outlineScenes.length > 0 && (
            <Button
              size="lg"
              className="gap-2 flex-1"
              onClick={handleGenerateSkeleton}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isGenerating ? 'Generating Scenes...' : 'Generate Screenplay Skeleton'}
            </Button>
          )}
          <Button
            variant={outlineScenes.length > 0 ? 'outline' : 'default'}
            size="lg"
            className="gap-2 flex-1"
            onClick={handleStartBlank}
          >
            <PenLine className="h-4 w-4" />
            Start with Blank Page
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          Your story bible is saved and accessible in the editor&apos;s Bible panel.
        </p>
      </div>
    </div>
  );
}
