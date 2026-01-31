'use client';

import { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutItem[];
}

// ---------------------------------------------------------------------------
// Shortcut data
// ---------------------------------------------------------------------------

const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const cmdKey = isMac ? '\u2318' : 'Ctrl';
const shiftKey = isMac ? '\u21E7' : 'Shift';

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: [cmdKey, 'B'], description: 'Toggle Outline panel' },
      { keys: [cmdKey, 'J'], description: 'Toggle Chat panel' },
      { keys: [cmdKey, '\\'], description: 'Cycle view mode (Editor / Preview / Split)' },
    ],
  },
  {
    title: 'Editing',
    shortcuts: [
      { keys: [cmdKey, 'S'], description: 'Save project' },
      { keys: [cmdKey, 'Z'], description: 'Undo' },
      { keys: [cmdKey, shiftKey, 'Z'], description: 'Redo' },
    ],
  },
  {
    title: 'AI Modes',
    shortcuts: [
      { keys: [cmdKey, shiftKey, 'M'], description: 'Cycle AI trust level' },
      { keys: [cmdKey, shiftKey, '1'], description: 'Set Brainstorm mode (suggestions only)' },
      { keys: [cmdKey, shiftKey, '2'], description: 'Set Ask mode (ask before editing)' },
      { keys: [cmdKey, shiftKey, '3'], description: 'Set Write mode (direct editing)' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modal / Cancel' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative z-50 w-full max-w-lg rounded-lg border border-border bg-background p-6 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Sections */}
        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <span key={keyIdx}>
                          <kbd
                            className={cn(
                              'inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 text-xs font-medium text-foreground',
                              key.length === 1 && 'w-6'
                            )}
                          >
                            {key}
                          </kbd>
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground mx-0.5">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 text-[10px] font-medium mx-1">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}
