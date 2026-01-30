// ---------------------------------------------------------------------------
// Timeline Store -- Zustand state management for edit history (undo/redo)
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { TimelineEntry } from '@/lib/diff/types';
import {
  loadTimelineEntries,
  saveTimelineEntries,
  deleteTimelineEntries,
} from '@/lib/firebase/firestore-changelog-persistence';
import { useProjectStore } from './project';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Timeline state and actions for tracking edit history.
 *
 * The timeline operates as a linear undo/redo stack.  When the user makes a
 * new edit while in the middle of the timeline (after undoing), all entries
 * after the current index are discarded (standard undo/redo behaviour).
 */
export interface TimelineState {
  /** Ordered list of all timeline entries (oldest first). */
  entries: TimelineEntry[];

  /**
   * Index of the current position in the timeline.
   * -1 means we are before any entries (empty or fully undone).
   * When equal to entries.length - 1, we are at the most recent entry.
   */
  currentIndex: number;

  /** The project ID that these entries belong to (set on project open). */
  projectId: string | null;

  // -- Actions --------------------------------------------------------------

  /**
   * Add a new entry to the timeline.  If we are not at the end of the
   * timeline (i.e., the user has undone some edits), all entries after the
   * current index are discarded before the new entry is appended.
   *
   * ID and timestamp are auto-generated.
   */
  addEntry: (entry: Omit<TimelineEntry, 'id' | 'timestamp'>) => void;

  /**
   * Undo the most recent edit.  Returns the entry that was undone, or null
   * if there is nothing to undo.
   */
  undo: () => TimelineEntry | null;

  /**
   * Redo the next edit.  Returns the entry that was redone, or null if
   * there is nothing to redo.
   */
  redo: () => TimelineEntry | null;

  /** Whether there is an entry available to undo. */
  canUndo: () => boolean;

  /** Whether there is an entry available to redo. */
  canRedo: () => boolean;

  /** Clear the entire timeline history. */
  clear: () => void;

  /** Load timeline entries for a project from persistent storage. */
  loadForProject: (projectId: string) => Promise<void>;

  /** Persist current timeline entries to storage. */
  persist: () => void;

  /** Delete all persisted timeline entries for a project. */
  deleteForProject: (projectId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _entryIdCounter = 0;

function nextEntryId(): string {
  _entryIdCounter += 1;
  return `timeline-${_entryIdCounter}`;
}

// Debounce timer for auto-persisting after addEntry.
let _persistTimer: ReturnType<typeof setTimeout> | null = null;
const PERSIST_DEBOUNCE_MS = 2000; // Increased from 1000ms to reduce Firestore pressure
const PERSIST_DEBOUNCE_DURING_AI_MS = 5000; // Much longer during AI editing

function schedulePersist() {
  if (_persistTimer) clearTimeout(_persistTimer);

  // Check if AI is currently editing - use longer debounce to batch writes
  let debounceMs = PERSIST_DEBOUNCE_MS;
  try {
    // Dynamic import to avoid circular dependency
    const { useEditorStore } = require('./editor');
    const { useLiveEditStore } = require('./live-edit');
    const isAIEditing = useEditorStore.getState()._isAIEditing;
    const isAnimating = useLiveEditStore.getState().isAnimating;
    if (isAIEditing || isAnimating) {
      debounceMs = PERSIST_DEBOUNCE_DURING_AI_MS;
    }
  } catch {
    // If stores aren't available, use default debounce
  }

  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    useTimelineStore.getState().persist();
  }, debounceMs);
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useTimelineStore = create<TimelineState>((set, get) => ({
  // -- Initial state --------------------------------------------------------
  entries: [],
  currentIndex: -1,
  projectId: null,

  // -- Actions --------------------------------------------------------------

  addEntry: (entry) => {
    const { projectId } = get();
    const fullEntry: TimelineEntry = {
      ...entry,
      id: nextEntryId(),
      timestamp: Date.now(),
      projectId: projectId ?? undefined,
    };

    set((state) => {
      // Discard any entries after the current position (fork the timeline).
      const entries = state.entries.slice(0, state.currentIndex + 1);
      entries.push(fullEntry);

      return {
        entries,
        currentIndex: entries.length - 1,
      };
    });

    // Auto-persist after a debounce.
    schedulePersist();
  },

  undo: () => {
    const { entries, currentIndex } = get();

    if (currentIndex < 0) {
      return null;
    }

    const entry = entries[currentIndex];
    set({ currentIndex: currentIndex - 1 });
    return entry;
  },

  redo: () => {
    const { entries, currentIndex } = get();

    if (currentIndex >= entries.length - 1) {
      return null;
    }

    const nextIndex = currentIndex + 1;
    const entry = entries[nextIndex];
    set({ currentIndex: nextIndex });
    return entry;
  },

  canUndo: () => {
    return get().currentIndex >= 0;
  },

  canRedo: () => {
    const { entries, currentIndex } = get();
    return currentIndex < entries.length - 1;
  },

  clear: () => {
    set({ entries: [], currentIndex: -1, projectId: null });
  },

  loadForProject: async (projectId: string) => {
    const userId = useProjectStore.getState().userId;
    if (!userId) return;
    const entries = await loadTimelineEntries(userId, projectId);
    set({
      projectId,
      entries,
      currentIndex: entries.length - 1,
    });
  },

  persist: () => {
    const { projectId, entries } = get();
    if (!projectId) return;
    const userId = useProjectStore.getState().userId;
    if (!userId) return;
    // Fire-and-forget async write.
    saveTimelineEntries(userId, projectId, entries);
  },

  deleteForProject: async (projectId: string) => {
    const userId = useProjectStore.getState().userId;
    if (!userId) return;
    await deleteTimelineEntries(userId, projectId);
  },
}));
