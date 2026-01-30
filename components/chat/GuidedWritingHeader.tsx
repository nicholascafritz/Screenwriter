'use client';

// ---------------------------------------------------------------------------
// GuidedWritingHeader -- Progress header for guided scene writing mode
// ---------------------------------------------------------------------------
//
// Displays progress through the screenplay scenes when guided writing mode
// is active. Shows current scene, beat association, and completion progress.
// Includes controls to exit guided mode or skip to different scenes.
// ---------------------------------------------------------------------------

import React from 'react';
import { cn } from '@/lib/utils';
import { useGuidedWritingStore } from '@/lib/store/guided-writing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Progress Bar Component
// ---------------------------------------------------------------------------

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

function ProgressBar({ current, total, className }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
        {current}/{total}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface GuidedWritingHeaderProps {
  className?: string;
}

export default function GuidedWritingHeader({ className }: GuidedWritingHeaderProps) {
  const isActive = useGuidedWritingStore((s) => s.isActive);
  const currentSceneIndex = useGuidedWritingStore((s) => s.currentSceneIndex);
  const stopGuidedWriting = useGuidedWritingStore((s) => s.stopGuidedWriting);
  const advanceToNextScene = useGuidedWritingStore((s) => s.advanceToNextScene);
  const goToScene = useGuidedWritingStore((s) => s.goToScene);

  // Get derived data
  const sceneContext = useGuidedWritingStore((s) => s.buildSceneContext());
  const progress = useGuidedWritingStore((s) => s.getProgress());

  // Don't render if not active or no context
  if (!isActive || !sceneContext) {
    return null;
  }

  const canGoPrevious = currentSceneIndex > 0;
  const canGoNext = currentSceneIndex < sceneContext.totalScenes - 1;

  return (
    <div
      className={cn(
        'rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2',
        className
      )}
    >
      {/* Header row: title and exit button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Guided Writing
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={stopGuidedWriting}
          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Exit
        </Button>
      </div>

      {/* Progress bar */}
      <ProgressBar current={progress.completed} total={progress.total} />

      {/* Current scene info */}
      <div className="space-y-1.5">
        {/* Scene heading with navigation */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToScene(currentSceneIndex - 1)}
            disabled={!canGoPrevious}
            className="h-5 w-5 shrink-0"
            aria-label="Previous scene"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              Scene {sceneContext.sceneNumber}: {sceneContext.heading}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={advanceToNextScene}
            disabled={!canGoNext}
            className="h-5 w-5 shrink-0"
            aria-label="Next scene"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Beat badge */}
        {sceneContext.beatName && (
          <Badge variant="outline" className="text-[10px] h-5">
            {sceneContext.beatName}
          </Badge>
        )}

        {/* Summary preview */}
        {sceneContext.summary && (
          <p className="text-[10px] text-muted-foreground line-clamp-2">
            {sceneContext.summary}
          </p>
        )}
      </div>
    </div>
  );
}
