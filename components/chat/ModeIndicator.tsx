'use client';

// ---------------------------------------------------------------------------
// ModeIndicator -- Minimal mode display with dropdown override
// ---------------------------------------------------------------------------
//
// Shows the current AI mode (Brainstorm/Ask/Write) as a subtle indicator.
// Click to reveal a dropdown for manual mode switching.
// Designed to be unobtrusive while still giving users control.
// ---------------------------------------------------------------------------

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useChatStore, type AIMode } from '@/lib/store/chat';
import {
  Lightbulb,
  MessageCircleQuestion,
  Pencil,
  ChevronDown,
  Check,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Mode Configuration
// ---------------------------------------------------------------------------

interface ModeConfig {
  id: AIMode;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const MODES: ModeConfig[] = [
  {
    id: 'writers-room',
    label: 'Brainstorm',
    shortLabel: 'Brainstorm',
    description: 'Discuss and plan ideas (read-only)',
    icon: Lightbulb,
    color: 'text-amber-500',
  },
  {
    id: 'diff',
    label: 'Ask',
    shortLabel: 'Ask',
    description: 'Propose changes for your review',
    icon: MessageCircleQuestion,
    color: 'text-blue-500',
  },
  {
    id: 'inline',
    label: 'Write',
    shortLabel: 'Write',
    description: 'Make changes directly',
    icon: Pencil,
    color: 'text-green-500',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ModeIndicatorProps {
  className?: string;
}

export default function ModeIndicator({ className }: ModeIndicatorProps) {
  const mode = useChatStore((s) => s.mode);
  const setMode = useChatStore((s) => s.setMode);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMode = MODES.find((m) => m.id === mode) ?? MODES[0];
  const Icon = currentMode.icon;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleModeSelect = (newMode: AIMode) => {
    setMode(newMode);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
          'transition-colors duration-150',
          'hover:bg-muted/80',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          isOpen && 'bg-muted'
        )}
        aria-label={`Current mode: ${currentMode.label}. Click to change.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Icon className={cn('h-3.5 w-3.5', currentMode.color)} />
        <span className="font-medium text-foreground">{currentMode.shortLabel}</span>
        <ChevronDown
          className={cn(
            'h-3 w-3 text-muted-foreground transition-transform duration-150',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select AI mode"
          className={cn(
            'absolute left-0 top-full mt-1 z-50',
            'w-56 rounded-lg border border-border bg-popover p-1 shadow-lg',
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
        >
          {MODES.map((modeOption) => {
            const ModeIcon = modeOption.icon;
            const isSelected = modeOption.id === mode;

            return (
              <button
                key={modeOption.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleModeSelect(modeOption.id)}
                className={cn(
                  'flex items-start gap-2.5 w-full px-2.5 py-2 rounded-md text-left',
                  'transition-colors duration-100',
                  'hover:bg-muted',
                  'focus-visible:outline-none focus-visible:bg-muted',
                  isSelected && 'bg-muted/50'
                )}
              >
                <ModeIcon className={cn('h-4 w-4 mt-0.5 shrink-0', modeOption.color)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground">
                      {modeOption.label}
                    </span>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {modeOption.description}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Hint */}
          <div className="border-t border-border mt-1 pt-1.5 px-2.5 pb-1">
            <p className="text-[10px] text-muted-foreground">
              Tip: Type /brainstorm, /ask, or /write to switch
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
