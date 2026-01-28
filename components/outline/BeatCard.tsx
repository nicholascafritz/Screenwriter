'use client';

// ---------------------------------------------------------------------------
// BeatCard -- Individual scene card in the outline panel
// ---------------------------------------------------------------------------
//
// Renders a single scene from the persistent Outline store. Accepts optional
// enrichment data (characters, element counts) from the ephemeral parse.
// Supports both drafted scenes (with Fountain text) and planned scenes.
// ---------------------------------------------------------------------------

import React from 'react';
import { cn } from '@/lib/utils';
import type { OutlineEntry } from '@/lib/store/outline-types';
import type { SceneEnrichment } from './OutlinePanel';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BeatCardProps {
  entry: OutlineEntry;
  enrichment?: SceneEnrichment;
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

/** Status badge colour mapping. */
function getStatusColor(status: OutlineEntry['status']): string {
  switch (status) {
    case 'planned':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'drafted':
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    case 'revised':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'locked':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
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
  entry,
  enrichment,
  isActive,
  onClick,
  sceneIndex,
}: BeatCardProps) {
  const isPlanned = entry.fountainRange === null;
  const elementCount = enrichment?.elementCount ?? 0;
  const characters = enrichment?.characters ?? [];
  const characterCount = characters.length;
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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isPlanned
          ? 'border-dashed border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
          : 'hover:bg-accent/50 hover:border-accent-foreground/20',
        isActive && !isPlanned
          ? 'border-primary/50 bg-primary/5 shadow-sm'
          : !isPlanned
            ? 'border-border bg-card'
            : '',
      )}
    >
      {/* Top row: scene number + INT/EXT badge + status */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-mono text-muted-foreground">
          {entry.sceneNumber ?? `#${sceneIndex + 1}`}
        </span>
        {entry.intExt && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 leading-4 font-semibold',
              getIntExtColor(entry.intExt),
            )}
          >
            {entry.intExt}
          </Badge>
        )}
        {/* Status badge — only show for non-drafted states */}
        {entry.status !== 'drafted' && (
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 leading-4 font-medium ml-auto',
              getStatusColor(entry.status),
            )}
          >
            {entry.status}
          </Badge>
        )}
      </div>

      {/* Location name */}
      <div
        className={cn(
          'text-sm font-medium leading-tight truncate',
          isPlanned ? 'text-muted-foreground italic' : 'text-foreground',
        )}
      >
        {entry.location || entry.heading || 'Untitled Scene'}
      </div>

      {/* Time of day */}
      {entry.timeOfDay && (
        <div className="text-xs text-muted-foreground mt-0.5">
          {entry.timeOfDay}
        </div>
      )}

      {/* Summary (if present — from guide or manual entry) */}
      {entry.summary && (
        <div className="text-xs text-muted-foreground/70 mt-1 line-clamp-2 leading-snug">
          {entry.summary}
        </div>
      )}

      {/* Metadata row: characters + page fraction (only for drafted scenes) */}
      {!isPlanned && (
        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
          <span>
            {characterCount} character{characterCount !== 1 ? 's' : ''}
          </span>
          <span>~{pageFraction} pg</span>
        </div>
      )}

      {/* Character avatars (first 4) — only for drafted scenes */}
      {!isPlanned && characterCount > 0 && (
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {characters.slice(0, 4).map((name) => (
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

      {/* Scene length indicator bar (only for drafted scenes) */}
      {!isPlanned && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary/50">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isActive ? 'bg-primary/60' : 'bg-muted-foreground/30',
            )}
            style={{ width: `${lengthPercent}%` }}
          />
        </div>
      )}
    </button>
  );
}
