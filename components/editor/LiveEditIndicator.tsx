'use client';

// ---------------------------------------------------------------------------
// LiveEditIndicator -- Floating UI showing live edit progress and controls
// ---------------------------------------------------------------------------
//
// Displays during AI edit animation with current edit info and speed controls.
// ---------------------------------------------------------------------------

import React, { useEffect } from 'react';
import { Sparkles, Pause, Play, FastForward, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useLiveEditStore,
  type AnimationSpeed,
} from '@/lib/store/live-edit';
import { cancelLiveEditAnimation } from '@/lib/editor/animation-engine';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Speed Labels
// ---------------------------------------------------------------------------

const SPEED_LABELS: Record<AnimationSpeed, string> = {
  slow: 'Slow',
  normal: 'Normal',
  fast: 'Fast',
  instant: 'Instant',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LiveEditIndicator() {
  const isAnimating = useLiveEditStore((s) => s.isAnimating);
  const currentEdit = useLiveEditStore((s) => s.currentEdit);
  const isPaused = useLiveEditStore((s) => s.isPaused);
  const animationSpeed = useLiveEditStore((s) => s.animationSpeed);
  const pendingEdits = useLiveEditStore((s) => s.pendingEdits);

  const setSpeed = useLiveEditStore((s) => s.setSpeed);
  const togglePause = useLiveEditStore((s) => s.togglePause);
  const skipToEnd = useLiveEditStore((s) => s.skipToEnd);

  // Keyboard shortcuts for controlling animation
  useEffect(() => {
    if (!isAnimating) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        skipToEnd();
      } else if (e.key === ' ' && !e.ctrlKey && !e.metaKey) {
        // Don't capture space if Ctrl/Cmd is held (could be other shortcut)
        e.preventDefault();
        togglePause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnimating, skipToEnd, togglePause]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelLiveEditAnimation();
    };
  }, []);

  // Don't render if not animating
  if (!isAnimating || !currentEdit) {
    return null;
  }

  const queueLength = pendingEdits.length;

  return (
    <div
      className={cn(
        'absolute bottom-4 left-4 z-50',
        'bg-background/95 backdrop-blur-sm',
        'border border-border rounded-lg shadow-lg',
        'p-3 min-w-[200px]'
      )}
    >
      {/* Edit info header */}
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        <span className="text-sm font-medium">{currentEdit.toolName}</span>
        {currentEdit.sceneName && (
          <span className="text-xs text-muted-foreground">
            : {currentEdit.sceneName}
          </span>
        )}
      </div>

      {/* Queue indicator */}
      {queueLength > 0 && (
        <div className="text-xs text-muted-foreground mb-2">
          +{queueLength} more edit{queueLength > 1 ? 's' : ''} queued
        </div>
      )}

      {/* Speed controls */}
      <div className="flex items-center gap-1">
        {/* Pause/Play button */}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={togglePause}
          title={isPaused ? 'Resume (Space)' : 'Pause (Space)'}
        >
          {isPaused ? (
            <Play className="h-3.5 w-3.5" />
          ) : (
            <Pause className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Speed buttons */}
        <div className="flex gap-0.5 ml-1">
          {(['slow', 'normal', 'fast'] as AnimationSpeed[]).map((speed) => (
            <Button
              key={speed}
              size="sm"
              variant={animationSpeed === speed ? 'secondary' : 'ghost'}
              className="h-7 px-2 text-xs"
              onClick={() => setSpeed(speed)}
            >
              {SPEED_LABELS[speed]}
            </Button>
          ))}
        </div>

        {/* Skip button */}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs ml-1"
          onClick={skipToEnd}
          title="Skip to end (Escape)"
        >
          <SkipForward className="h-3.5 w-3.5 mr-1" />
          Skip
        </Button>
      </div>

      {/* Keyboard hints */}
      <div className="text-[10px] text-muted-foreground mt-2 opacity-70">
        Space to pause • Esc to skip
      </div>
    </div>
  );
}
