'use client';

// ---------------------------------------------------------------------------
// TrustDial -- Unified AI autonomy control replacing discrete mode buttons
// ---------------------------------------------------------------------------
//
// Presents a single mental model to users: "how much do I trust the AI?"
// Replaces the four-mode system with a continuous 0-3 slider.
//
// Level 0: Brainstorm (writers-room) — read-only, ideas only
// Level 1: Review (diff) — changes shown for approval
// Level 2: Edit (inline) — direct changes with undo
// Level 3: Auto (agent) — autonomous multi-step tasks
// ---------------------------------------------------------------------------

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useChatStore, TRUST_LEVEL_CONFIG, type TrustLevel } from '@/lib/store/chat';
import { Tooltip } from '@/components/ui/tooltip';
import { Lightbulb, GitCompare, Pencil, Bot } from 'lucide-react';

// Icon mapping
const ICONS = {
  Lightbulb,
  GitCompare,
  Pencil,
  Bot,
} as const;

interface TrustDialProps {
  className?: string;
  /** Compact mode for tight spaces */
  compact?: boolean;
}

export default function TrustDial({ className, compact = false }: TrustDialProps) {
  const trustLevel = useChatStore((s) => s.trustLevel);
  const setTrustLevel = useChatStore((s) => s.setTrustLevel);

  const levels: TrustLevel[] = [0, 1, 2, 3];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = Math.min(3, trustLevel + 1) as TrustLevel;
        setTrustLevel(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        const prev = Math.max(0, trustLevel - 1) as TrustLevel;
        setTrustLevel(prev);
      }
    },
    [trustLevel, setTrustLevel]
  );

  return (
    <div
      className={cn('flex flex-col gap-2', className)}
      role="slider"
      aria-label="AI trust level"
      aria-valuemin={0}
      aria-valuemax={3}
      aria-valuenow={trustLevel}
      aria-valuetext={TRUST_LEVEL_CONFIG[trustLevel].label}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Slider track with detents */}
      <div className="relative flex items-center h-6">
        {/* Track background */}
        <div className="absolute inset-x-2 h-1 bg-muted rounded-full" />

        {/* Active track fill */}
        <div
          className="absolute left-2 h-1 bg-gradient-to-r from-green-500 via-blue-500 via-amber-500 to-purple-500 rounded-full transition-all duration-200"
          style={{ width: `calc(${(trustLevel / 3) * 100}% - 8px)` }}
        />

        {/* Detent buttons */}
        <div className="relative flex justify-between w-full px-2">
          {levels.map((level) => {
            const config = TRUST_LEVEL_CONFIG[level];
            const Icon = ICONS[config.icon as keyof typeof ICONS];
            const isActive = trustLevel === level;
            const isPast = trustLevel > level;

            return (
              <Tooltip
                key={level}
                content={`${config.label}: ${config.description}`}
                side="bottom"
              >
                <button
                  type="button"
                  onClick={() => setTrustLevel(level)}
                  className={cn(
                    'relative z-10 flex items-center justify-center',
                    'w-6 h-6 rounded-full border-2 transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive && 'scale-110 shadow-lg',
                    isActive && config.color,
                    isActive && 'bg-background border-current',
                    isPast && !isActive && 'bg-muted-foreground/20 border-muted-foreground/40',
                    !isActive &&
                      !isPast &&
                      'bg-background border-muted-foreground/30 hover:border-muted-foreground/60'
                  )}
                  aria-label={`Set trust level to ${config.label}`}
                >
                  <Icon
                    className={cn(
                      'w-3 h-3 transition-colors',
                      isActive ? 'opacity-100' : 'opacity-40'
                    )}
                  />
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Labels (hide in compact mode) */}
      {!compact && (
        <div className="flex justify-between px-2 text-[10px] text-muted-foreground">
          {levels.map((level) => {
            const config = TRUST_LEVEL_CONFIG[level];
            const isActive = trustLevel === level;

            return (
              <span
                key={level}
                className={cn(
                  'transition-colors text-center w-12',
                  isActive && 'text-foreground font-medium',
                  isActive && config.color
                )}
              >
                {config.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Current mode description (hide in compact mode) */}
      {!compact && (
        <p className="text-xs text-muted-foreground text-center">
          {TRUST_LEVEL_CONFIG[trustLevel].description}
        </p>
      )}
    </div>
  );
}
