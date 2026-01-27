// ---------------------------------------------------------------------------
// Editor Store -- Zustand state management for the screenplay editor
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { Screenplay } from '@/lib/fountain/types';
import type { DiffHunk } from '@/lib/diff/types';
import { parseFountain } from '@/lib/fountain/parser';
import { calculateDiff } from '@/lib/diff/engine';
import { useTimelineStore } from './timeline';

// ---------------------------------------------------------------------------
// Sample Fountain screenplay
// ---------------------------------------------------------------------------

export const SAMPLE_SCRIPT = `Title: The Last Draft
Credit: Written by
Author: Jordan Ellis
Draft date: 2026-01-15

INT. WRITER'S APARTMENT - NIGHT

A small, cluttered studio apartment. Stacks of screenplay printouts tower on every surface. A laptop glows on a desk beside a cold cup of coffee.

ALEX CHEN (30s, rumpled, determined) stares at the screen. The cursor blinks on a blank page.

ALEX
(muttering)
Okay. One more pass. Just one more.

Alex's phone buzzes. The screen reads "MOM." Alex silences it.

ALEX (CONT'D)
Not now.

Alex begins to type. The keys clatter with increasing speed.

EXT. CITY ROOFTOP - DAWN

The sky burns orange and pink over a sprawling cityscape. MAYA SANTOS (30s, sharp-eyed, leather jacket) leans against the railing, looking out over the city. She holds a folded screenplay.

MAYA
You actually finished it?

ALEX (O.S.)
Forty-seven drafts. But yeah.

Maya unfolds the script and flips through the pages. A slow smile crosses her face.

MAYA
(reading aloud)
"The sun rises whether or not we are ready for it."
(beat)
That is actually good, Alex.

She turns to face him as Alex steps through the rooftop door, two coffees in hand.

ALEX
Don't sound so surprised.

MAYA
I'm not surprised. I'm impressed. There's a difference.

Alex hands her a coffee. They both look out at the sunrise.

CUT TO:

INT. PRODUCTION OFFICE - DAY

A sleek, modern office. Glass walls, whiteboards covered in scheduling grids. DAVID PARK (50s, silver hair, reading glasses) sits behind a wide desk, the screenplay open in front of him.

DAVID
It's raw. Some of the dialogue in act two needs tightening.

Alex sits across from him, hands clasped, trying to look calm.

ALEX
I can do another pass--

DAVID
I didn't say I don't like it.

David removes his glasses and sets them on the desk.

DAVID (CONT'D)
I said it's raw. Raw is honest. Honest is rare in this town.
(beat)
We'd like to option it.

Alex exhales. It is the breath of someone who has been holding on for a very long time.

ALEX
Thank you. Really.

DAVID
Don't thank me yet. The rewrites will make you want to quit.

ALEX
(smiling)
I've had practice.

> FADE OUT.
`;

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

export interface EditorState {
  /** Current Fountain source text in the editor. */
  content: string;

  /** Snapshot of the content before the latest AI edit, used for diff comparison. */
  originalContent: string;

  /** File path if the screenplay was loaded from disk (null for new documents). */
  filePath: string | null;

  /** Whether the content has unsaved changes. */
  isDirty: boolean;

  // -- Cursor / selection ---------------------------------------------------

  /** Current cursor line (1-based). */
  cursorLine: number;

  /** Current cursor column (1-based). */
  cursorColumn: number;

  /** Currently selected text, or null when nothing is selected. */
  selection: string | null;

  /** The scene heading text at the current cursor position, or null. */
  currentScene: string | null;

  // -- Parsed result --------------------------------------------------------

  /** Cached parse result of the current content. */
  screenplay: Screenplay | null;

  // -- Undo/redo internal state ---------------------------------------------

  /** When true, content changes are from undo/redo replay and should NOT record timeline entries. */
  _isUndoRedoReplay: boolean;

  /** When true, content changes are from AI edits (suppresses human-edit timeline recording). */
  _isAIEditing: boolean;

  /** The last "committed" content snapshot used as the baseline for the next timeline diff. */
  _lastCommittedContent: string;

  // -- Actions --------------------------------------------------------------

  /** Replace the editor content and mark the document as dirty. */
  setContent: (content: string) => void;

  /** Update the cursor position. */
  setCursor: (line: number, column: number) => void;

  /** Update the current text selection. */
  setSelection: (text: string | null) => void;

  /** Update the detected current scene heading. */
  setCurrentScene: (scene: string | null) => void;

  /** Re-parse the current Fountain content and cache the result. */
  parseContent: () => void;

  /** Apply a patch (array of diff hunks) incrementally without full replacement. */
  applyPatch: (hunks: DiffHunk[]) => void;

  /** Load the built-in sample screenplay into the editor. */
  loadSampleScript: () => void;

  /** Undo the most recent edit by restoring the timeline entry's original content. */
  undoEdit: () => void;

  /** Redo the next edit by re-applying the timeline entry's modified content. */
  redoEdit: () => void;

  /** Flush any pending human-edit diff to the timeline (call before AI edits). */
  flushPendingDiff: () => void;

  /**
   * Record an AI edit to the timeline.
   * Call this with the content *before* the AI edit and a description.
   * The diff is computed from beforeContent → current content.
   */
  recordAIEdit: (beforeContent: string, description: string, sceneName?: string) => void;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Debounced human-edit timeline recording
// ---------------------------------------------------------------------------

let _humanEditTimer: ReturnType<typeof setTimeout> | null = null;
const HUMAN_EDIT_DEBOUNCE_MS = 1000;

function scheduleHumanEditCommit() {
  if (_humanEditTimer) clearTimeout(_humanEditTimer);
  _humanEditTimer = setTimeout(() => {
    _humanEditTimer = null;
    useEditorStore.getState().flushPendingDiff();
  }, HUMAN_EDIT_DEBOUNCE_MS);
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useEditorStore = create<EditorState>((set, get) => ({
  // -- Initial state --------------------------------------------------------
  content: '',
  originalContent: '',
  filePath: null,
  isDirty: false,

  cursorLine: 1,
  cursorColumn: 1,
  selection: null,
  currentScene: null,

  screenplay: null,

  _isUndoRedoReplay: false,
  _isAIEditing: false,
  _lastCommittedContent: '',

  // -- Actions --------------------------------------------------------------

  setContent: (content: string) => {
    const state = get();
    set({
      content,
      isDirty: true,
    });
    // Re-parse whenever content changes.
    get().parseContent();

    // Schedule a debounced human-edit timeline entry (skip during replay / AI edits).
    if (!state._isUndoRedoReplay && !state._isAIEditing) {
      scheduleHumanEditCommit();
    }
  },

  setCursor: (line: number, column: number) => {
    set({ cursorLine: line, cursorColumn: column });
  },

  setSelection: (text: string | null) => {
    set({ selection: text });
  },

  setCurrentScene: (scene: string | null) => {
    set({ currentScene: scene });
  },

  parseContent: () => {
    const { content } = get();
    try {
      const screenplay = parseFountain(content);
      set({ screenplay });
    } catch {
      // If parsing fails, keep the previous parse result.
      // This prevents the UI from breaking on transient syntax errors
      // while the user is typing.
    }
  },

  applyPatch: (hunks: DiffHunk[]) => {
    const { content } = get();
    const lines = content.split('\n');

    // Apply hunks back-to-front (sorted by position descending) so that
    // earlier line numbers remain valid as we splice.
    const sorted = [...hunks].sort((a, b) => {
      const aPos = a.originalStart || a.modifiedStart;
      const bPos = b.originalStart || b.modifiedStart;
      return bPos - aPos;
    });

    for (const hunk of sorted) {
      if (hunk.type === 'add') {
        const insertAt = Math.min(hunk.modifiedStart - 1, lines.length);
        const addedLines = hunk.modifiedText.replace(/\n$/, '').split('\n');
        lines.splice(insertAt, 0, ...addedLines);
      } else if (hunk.type === 'remove') {
        const start = hunk.originalStart - 1;
        const count = hunk.originalEnd - hunk.originalStart + 1;
        lines.splice(start, count);
      } else {
        // modify: replace original lines with modified lines
        const start = hunk.originalStart - 1;
        const count = hunk.originalEnd - hunk.originalStart + 1;
        const replacementLines = hunk.modifiedText.replace(/\n$/, '').split('\n');
        lines.splice(start, count, ...replacementLines);
      }
    }

    const newContent = lines.join('\n');
    set({ content: newContent, isDirty: true });
    get().parseContent();
  },

  loadSampleScript: () => {
    const content = SAMPLE_SCRIPT;
    set({
      content,
      originalContent: content,
      isDirty: false,
      filePath: null,
      _lastCommittedContent: content,
    });
    // Parse the sample immediately.
    const screenplay = parseFountain(content);
    set({ screenplay });
  },

  // -- Undo/redo actions ----------------------------------------------------

  flushPendingDiff: () => {
    if (_humanEditTimer) {
      clearTimeout(_humanEditTimer);
      _humanEditTimer = null;
    }

    const { content, _lastCommittedContent, _isUndoRedoReplay, _isAIEditing } = get();

    // Skip if replaying or if content hasn't actually changed.
    if (_isUndoRedoReplay || _isAIEditing) return;
    if (content === _lastCommittedContent) return;

    const diff = calculateDiff(_lastCommittedContent, content);
    if (diff.hunks.length === 0) return;

    useTimelineStore.getState().addEntry({
      source: 'human',
      description: `Manual edit: ${diff.summary}`,
      diff,
      undoable: true,
    });

    set({ _lastCommittedContent: content });
  },

  recordAIEdit: (beforeContent: string, description: string, sceneName?: string) => {
    const { content } = get();
    if (content === beforeContent) return;

    const diff = calculateDiff(beforeContent, content);
    if (diff.hunks.length === 0) return;

    useTimelineStore.getState().addEntry({
      source: 'ai',
      description,
      diff,
      sceneName,
      undoable: true,
    });

    set({ _lastCommittedContent: content });
  },

  undoEdit: () => {
    // Flush any pending human edit first so it's on the stack.
    get().flushPendingDiff();

    const entry = useTimelineStore.getState().undo();
    if (!entry) return;

    // Restore the original content from before this edit.
    set({ _isUndoRedoReplay: true });
    const restoredContent = entry.diff.originalText;
    set({
      content: restoredContent,
      isDirty: true,
      _lastCommittedContent: restoredContent,
    });
    get().parseContent();
    set({ _isUndoRedoReplay: false });
  },

  redoEdit: () => {
    const entry = useTimelineStore.getState().redo();
    if (!entry) return;

    // Re-apply the modified content.
    set({ _isUndoRedoReplay: true });
    const restoredContent = entry.diff.modifiedText;
    set({
      content: restoredContent,
      isDirty: true,
      _lastCommittedContent: restoredContent,
    });
    get().parseContent();
    set({ _isUndoRedoReplay: false });
  },
}));
