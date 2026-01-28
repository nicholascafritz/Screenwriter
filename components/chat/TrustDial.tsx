'use client';

// ---------------------------------------------------------------------------
// TrustDial -- Simplified 3-level AI autonomy control (Claude Code style)
// ---------------------------------------------------------------------------
//
// Level 0: Brainstorm — read-only discussion, no script changes
// Level 1: Ask — AI proposes changes, shows diff for approval
// Level 2: Write — AI makes changes directly (undo available)
// ---------------------------------------------------------------------------

import React from 'react';
import { cn } from '@/lib/utils';
import { useChatStore, TRUST_LEVEL_CONFIG, type TrustLevel } from '@/lib/store/chat';
import { MessageCircle, HelpCircle, Pencil } from 'lucide-react';

// Icon mapping
const ICONS = {
  MessageCircle,
  HelpCircle,
  Pencil,
} as const;

interface TrustDialProps {
  className?: string;
  /** Compact mode for tight spaces */
  compact?: boolean;
}

export default function TrustDial({ className, compact = false }: TrustDialProps) {
  const trustLevel = useChatStore((s) => s.trustLevel);
  const setTrustLevel = useChatStore((s) => s.setTrustLevel);

  const levels: TrustLevel[] = [0, 1, 2];

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* Segmented button container */}
      <div
        className="flex items-center bg-muted/50 rounded-lg p-0.5"
        role="radiogroup"
        aria-label="AI mode"
      >
        {levels.map((level) => {
          const config = TRUST_LEVEL_CONFIG[level];
          const Icon = ICONS[config.icon as keyof typeof ICONS];
          const isActive = trustLevel === level;

          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setTrustLevel(level)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md',
                'text-xs font-medium transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              )}
              title={config.description}
            >
              <Icon
                className={cn(
                  'w-3.5 h-3.5 shrink-0',
                  isActive && config.color
                )}
              />
              <span className={cn(isActive && config.color)}>
                {config.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Current mode description (hide in compact mode) */}
      {!compact && (
        <p className="text-[10px] text-muted-foreground text-center px-1">
          {TRUST_LEVEL_CONFIG[trustLevel].description}
        </p>
      )}
    </div>
  );
}
