'use client';

// ---------------------------------------------------------------------------
// ModeSelector -- Toggle between Inline, Diff, Agent, and Writers Room modes
// ---------------------------------------------------------------------------

import React from 'react';
import { cn } from '@/lib/utils';
import { useChatStore, type AIMode } from '@/lib/store/chat';
import { Pencil, SplitSquareHorizontal, Bot, Lightbulb } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModeSelectorProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Mode configuration with design system colors
// ---------------------------------------------------------------------------

interface ModeConfig {
  id: AIMode;
  label: string;
  icon: React.ElementType;
  tooltip: string;
  colorVar: string;
}

const MODES: ModeConfig[] = [
  {
    id: 'inline',
    label: 'Inline Edit',
    icon: Pencil,
    tooltip: 'Apply changes directly to the screenplay as you chat',
    colorVar: '--color-mode-inline',
  },
  {
    id: 'diff',
    label: 'Diff Review',
    icon: SplitSquareHorizontal,
    tooltip: 'Review proposed changes in a side-by-side diff view before accepting',
    colorVar: '--color-mode-diff',
  },
  {
    id: 'agent',
    label: 'Agent Mode',
    icon: Bot,
    tooltip: 'Autonomous agent that plans and executes multi-step screenplay edits',
    colorVar: '--color-mode-agent',
  },
  {
    id: 'writers-room',
    label: 'Writers Room',
    icon: Lightbulb,
    tooltip: 'Brainstorm and develop ideas with an opinionated writing partner — no changes made to the script',
    colorVar: '--color-mode-writers-room',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ModeSelector({ className }: ModeSelectorProps) {
  const mode = useChatStore((s) => s.mode);
  const setMode = useChatStore((s) => s.setMode);

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg bg-surface p-1 gap-0.5',
        className,
      )}
      role="tablist"
      aria-label="AI interaction mode"
    >
      {MODES.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.id;

        return (
          <Tooltip key={m.id} content={m.tooltip} side="bottom">
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setMode(m.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-normal',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive
                  ? 'shadow-sm'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
              )}
              style={
                isActive
                  ? {
                      color: `var(${m.colorVar})`,
                      backgroundColor: `color-mix(in srgb, var(${m.colorVar}) 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, var(${m.colorVar}) 25%, transparent)`,
                    }
                  : undefined
              }
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
