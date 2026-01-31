'use client';

// ---------------------------------------------------------------------------
// BeatCard -- Individual scene card in the outline panel
// ---------------------------------------------------------------------------
//
// Renders a single scene from the persistent Outline store. Accepts optional
// enrichment data (characters, element counts) from the ephemeral parse.
// Supports both drafted scenes (with Fountain text) and planned scenes.
// ---------------------------------------------------------------------------

import React, { useRef, useEffect } from 'react';
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
  /** Display name of the assigned beat (from the beat sheet). */
  beatName?: string;
  /** Whether the summary is being edited inline. */
  isEditing?: boolean;
  /** Called when the user saves a new summary value. */
  onSummaryChange?: (summary: string) => void;
  /** Called when editing completes (save or cancel). */
  onEditComplete?: () => void;
  /** Called on double-click to enter edit mode. */
  onEditRequest?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine a colour class for the INT/EXT badge.
 * Uses design system scene badge colors:
 *   INT  -> green (--badge-int-*)
 *   EXT  -> blue (--badge-ext-*)
 *   I/E or INT/EXT -> purple (--badge-mixed-*)
 */
function getIntExtColor(intExt: string): string {
  switch (intExt) {
    case 'INT':
      return 'bg-[var(--badge-int-bg)] text-[var(--badge-int-text)] border-[var(--badge-int-border)]';
    case 'EXT':
      return 'bg-[var(--badge-ext-bg)] text-[var(--badge-ext-text)] border-[var(--badge-ext-border)]';
    default:
      return 'bg-[var(--badge-mixed-bg)] text-[var(--badge-mixed-text)] border-[var(--badge-mixed-border)]';
  }
}

/** Status badge colour mapping using design system colors. */
function getStatusColor(status: OutlineEntry['status']): string {
  switch (status) {
    case 'planned':
      return 'bg-primary/15 text-primary border-primary/30';
    case 'drafted':
      return 'bg-info-500/15 text-info-400 border-info-500/30';
    case 'revised':
      return 'bg-success-500/15 text-success-400 border-success-500/30';
    case 'locked':
      return 'bg-error-500/15 text-error-400 border-error-500/30';
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
  beatName,
  isEditing,
  onSummaryChange,
  onEditComplete,
  onEditRequest,
}: BeatCardProps) {
  const isPlanned = entry.fountainRange === null;
  const elementCount = enrichment?.elementCount ?? 0;
  const characters = enrichment?.characters ?? [];
  const characterCount = characters.length;
  const lengthPercent = sceneLengthPercent(elementCount);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Approximate page fraction: ~56 lines per page, rough estimate of
  // 2 lines per element.
  const estimatedLines = elementCount * 2;
  const pageFraction = (estimatedLines / 56).toFixed(1);

  // Auto-focus textarea when entering edit mode.
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={isEditing ? undefined : onClick}
      onKeyDown={(e) => {
        if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'group w-full text-left rounded-lg border px-3 py-2.5 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isPlanned
          ? 'border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10'
          : 'hover:bg-[var(--color-bg-hover)] hover:border-[rgba(251,191,36,0.3)]',
        isActive && !isPlanned
          ? 'border-[rgba(251,191,36,0.5)] bg-primary/5 shadow-sm'
          : !isPlanned
            ? 'border-border bg-card'
            : '',
      )}
    >
      {/* Top row: scene number + INT/EXT badge + status */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-tiny font-mono text-muted-foreground">
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
              'text-[10px] px-1.5 py-0 leading-4 font-medium',
              !beatName && 'ml-auto',
              getStatusColor(entry.status),
            )}
          >
            {entry.status}
          </Badge>
        )}
        {/* Beat assignment badge */}
        {beatName && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 leading-4 font-medium ml-auto bg-primary/15 text-primary border-primary/30 truncate max-w-[100px]"
            title={beatName}
          >
            {beatName}
          </Badge>
        )}
      </div>

      {/* Location name */}
      <div
        className={cn(
          'text-body-sm font-medium leading-tight truncate',
          isPlanned ? 'text-muted-foreground italic' : 'text-foreground',
        )}
      >
        {entry.location || entry.heading || 'Untitled Scene'}
      </div>

      {/* Time of day */}
      {entry.timeOfDay && (
        <div className="text-caption text-muted-foreground mt-0.5">
          {entry.timeOfDay}
        </div>
      )}

      {/* Summary -- inline edit or display */}
      {isEditing ? (
        <textarea
          ref={textareaRef}
          defaultValue={entry.summary}
          className="w-full mt-1 text-caption bg-input border border-border rounded
                     px-1.5 py-1 text-foreground resize-none focus:outline-none
                     focus:ring-1 focus:ring-primary"
          rows={3}
          onBlur={(e) => {
            onSummaryChange?.(e.target.value);
            onEditComplete?.();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSummaryChange?.((e.target as HTMLTextAreaElement).value);
              onEditComplete?.();
            }
            if (e.key === 'Escape') {
              onEditComplete?.();
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : entry.summary ? (
        <div
          className="text-caption text-muted-foreground mt-1 line-clamp-2 leading-snug cursor-text"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onEditRequest?.();
          }}
        >
          {entry.summary}
        </div>
      ) : (
        <div
          className="text-caption text-muted-foreground/60 mt-1 italic cursor-text"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onEditRequest?.();
          }}
        >
          Double-click to add summary...
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
              className="inline-flex items-center justify-center h-5 rounded-full bg-secondary px-1.5 text-[9px] font-medium text-secondary-foreground truncate max-w-[60px]"
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
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isActive ? 'bg-primary/60' : 'bg-muted-foreground/40',
            )}
            style={{ width: `${lengthPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
