// ---------------------------------------------------------------------------
// Live Edit Store -- Animation queue and state for live AI edit visualization
// ---------------------------------------------------------------------------
//
// Manages the queue of pending AI edits and animation state for showing
// edits happening character-by-character in the Monaco editor.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { DiffHunk } from '@/lib/diff/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnimationSpeed = 'slow' | 'normal' | 'fast' | 'instant';

/** An edit queued for animated application to the editor. */
export interface AnimatedEdit {
  /** Unique identifier for this edit. */
  id: string;
  /** Name of the tool that generated this edit. */
  toolName: string;
  /** Name of the scene being edited, if applicable. */
  sceneName?: string;
  /** The diff hunks to animate. */
  hunks: DiffHunk[];
  /** The full content after all hunks are applied (for skip/fallback). */
  fullContent: string;
  /** The content before the edit (for timeline recording). */
  beforeContent: string;
  /** First line affected by this edit (1-based). */
  startLine: number;
  /** Last line affected by this edit (1-based). */
  endLine: number;
}

interface LiveEditState {
  /** Queue of edits waiting to be animated. */
  pendingEdits: AnimatedEdit[];
  /** The edit currently being animated. */
  currentEdit: AnimatedEdit | null;
  /** Whether animation is in progress. */
  isAnimating: boolean;
  /** Animation speed setting. */
  animationSpeed: AnimationSpeed;
  /** Whether animation is paused. */
  isPaused: boolean;
  /** Whether a skip was requested. */
  skipRequested: boolean;
  /** Callback for when all animations complete. */
  onComplete: (() => void) | null;

  // Actions
  queueEdit: (edit: AnimatedEdit) => void;
  startAnimation: () => void;
  skipToEnd: () => void;
  setSpeed: (speed: AnimationSpeed) => void;
  togglePause: () => void;
  setCurrentEdit: (edit: AnimatedEdit | null) => void;
  completeCurrentEdit: () => void;
  clearQueue: () => void;
  setOnComplete: (callback: (() => void) | null) => void;
  requestSkip: () => void;
  clearSkipRequest: () => void;
}

// ---------------------------------------------------------------------------
// Speed Presets (characters per frame at 60fps)
// ---------------------------------------------------------------------------

export const SPEED_CHARS_PER_FRAME: Record<AnimationSpeed, number> = {
  slow: 2,
  normal: 8,
  fast: 25,
  instant: Infinity,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useLiveEditStore = create<LiveEditState>((set, get) => ({
  pendingEdits: [],
  currentEdit: null,
  isAnimating: false,
  animationSpeed: 'normal',
  isPaused: false,
  skipRequested: false,
  onComplete: null,

  queueEdit: (edit) => {
    set((state) => ({
      pendingEdits: [...state.pendingEdits, edit],
    }));
  },

  startAnimation: () => {
    set({ isAnimating: true, skipRequested: false });
  },

  skipToEnd: () => {
    set({ skipRequested: true });
  },

  setSpeed: (speed) => {
    set({ animationSpeed: speed });
  },

  togglePause: () => {
    set((state) => ({ isPaused: !state.isPaused }));
  },

  setCurrentEdit: (edit) => {
    set({ currentEdit: edit });
  },

  completeCurrentEdit: () => {
    const state = get();
    // Remove the current edit from queue if it matches
    const newPending = state.pendingEdits.filter(
      (e) => e.id !== state.currentEdit?.id
    );
    set({
      currentEdit: null,
      pendingEdits: newPending,
    });

    // If no more edits, mark animation as complete
    if (newPending.length === 0) {
      set({ isAnimating: false });
      state.onComplete?.();
    }
  },

  clearQueue: () => {
    set({
      pendingEdits: [],
      currentEdit: null,
      isAnimating: false,
      skipRequested: false,
    });
  },

  setOnComplete: (callback) => {
    set({ onComplete: callback });
  },

  requestSkip: () => {
    set({ skipRequested: true });
  },

  clearSkipRequest: () => {
    set({ skipRequested: false });
  },
}));

// ---------------------------------------------------------------------------
// Utility: Generate unique edit ID
// ---------------------------------------------------------------------------

let editCounter = 0;

export function generateEditId(): string {
  return `edit-${Date.now()}-${++editCounter}`;
}

// ---------------------------------------------------------------------------
// Utility: Calculate affected line range from hunks
// ---------------------------------------------------------------------------

export function calculateAffectedLines(hunks: DiffHunk[]): {
  startLine: number;
  endLine: number;
} {
  if (hunks.length === 0) {
    return { startLine: 1, endLine: 1 };
  }

  let minLine = Infinity;
  let maxLine = 0;

  for (const hunk of hunks) {
    // For adds, use modifiedStart; for removes/modifies, use originalStart
    const start =
      hunk.type === 'add'
        ? hunk.modifiedStart
        : Math.min(hunk.originalStart, hunk.modifiedStart || hunk.originalStart);
    const end =
      hunk.type === 'remove'
        ? hunk.originalEnd
        : Math.max(hunk.originalEnd || hunk.modifiedEnd, hunk.modifiedEnd);

    if (start > 0 && start < minLine) minLine = start;
    if (end > maxLine) maxLine = end;
  }

  return {
    startLine: minLine === Infinity ? 1 : minLine,
    endLine: maxLine || 1,
  };
}
