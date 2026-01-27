'use client';

// ---------------------------------------------------------------------------
// BeatCard -- Individual scene card in the outline panel
// ---------------------------------------------------------------------------

import React from 'react';
import { cn } from '@/lib/utils';
import type { Scene } from '@/lib/fountain/types';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BeatCardProps {
  scene: Scene;
  isActive: boolean;
  onClick: () => void;
  sceneIndex: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine a colour class for the INT/EXT badge.
 *   INT  -> green
 *   EXT  -> blue
 *   I/E or INT/EXT -> purple
 */
function getIntExtColor(intExt: string): string {
  switch (intExt) {
    case 'INT':
      return 'bg-green-500/15 text-green-400 border-green-500/30';
    case 'EXT':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    default:
      return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  }
}

/**
 * Estimate a relative scene length bar width from the number of elements.
 * We cap at 100% and use a simple heuristic: each element adds ~8%.
 */
function sceneLengthPercent(elementCount: number): number {
  return Math.min(100, Math.max(5, elementCount * 8));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BeatCard({
  scene,
  isActive,
  onClick,
  sceneIndex,
}: BeatCardProps) {
  const elementCount = scene.elements.length;
  const characterCount = scene.characters.length;
  const lengthPercent = sceneLengthPercent(elementCount);

  // Approximate page fraction: ~56 lines per page, rough estimate of
  // 2 lines per element.
  const estimatedLines = elementCount * 2;
  const pageFraction = (estimatedLines / 56).toFixed(1);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group w-full text-left rounded-lg border px-3 py-2.5 transition-all',
        'hover:bg-accent/50 hover:border-accent-foreground/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'border-primary/50 bg-primary/5 shadow-sm'
          : 'border-border bg-card',
      )}
    >
      {/* Top row: scene number + INT/EXT badge */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-mono text-muted-foreground">
          {scene.sceneNumber ?? `#${sceneIndex + 1}`}
        </span>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] px-1.5 py-0 leading-4 font-semibold',
            getIntExtColor(scene.intExt),
          )}
        >
          {scene.intExt}
        </Badge>
      </div>

      {/* Location name */}
      <div className="text-sm font-medium text-foreground leading-tight truncate">
        {scene.location || 'Unknown Location'}
      </div>

      {/* Time of day */}
      {scene.timeOfDay && (
        <div className="text-xs text-muted-foreground mt-0.5">
          {scene.timeOfDay}
        </div>
      )}

      {/* Metadata row: characters + page fraction */}
      <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
        <span>
          {characterCount} character{characterCount !== 1 ? 's' : ''}
        </span>
        <span>~{pageFraction} pg</span>
      </div>

      {/* Character avatars (first 4) */}
      {characterCount > 0 && (
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {scene.characters.slice(0, 4).map((name) => (
            <span
              key={name}
              className="inline-flex items-center justify-center h-5 rounded-full bg-muted px-1.5 text-[9px] font-medium text-muted-foreground truncate max-w-[60px]"
              title={name}
            >
              {name}
            </span>
          ))}
          {characterCount > 4 && (
            <span className="text-[9px] text-muted-foreground">
              +{characterCount - 4}
            </span>
          )}
        </div>
      )}

      {/* Scene length indicator bar */}
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary/50">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isActive ? 'bg-primary/60' : 'bg-muted-foreground/30',
          )}
          style={{ width: `${lengthPercent}%` }}
        />
      </div>
    </button>
  );
}
