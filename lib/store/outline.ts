// ---------------------------------------------------------------------------
// Outline Store -- Zustand state management for the structural spine
// ---------------------------------------------------------------------------
//
// The Outline is the persistent scene identity layer.  After every Fountain
// parse, `reconcileFromParse()` matches ephemeral parsed scenes to stable
// OutlineEntry records.  All features (comments, beats, characters, timeline,
// AI tools) reference scenes through SceneIds stored here.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { Scene, Screenplay } from '@/lib/fountain/types';
import type {
  SceneId,
  Outline,
  OutlineEntry,
  OutlineAct,
  OutlineSequence,
} from './outline-types';
import { reconcile } from '@/lib/outline/reconcile';
import { generateSceneId } from '@/lib/outline/id';
import { detectStructure } from '@/lib/fountain/structure';
import {
  loadOutline,
  saveOutline,
  deleteOutline,
} from '@/lib/firebase/firestore-outline-persistence';
import { useProjectStore } from './project';
import { generateId } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface OutlineState {
  /** The persisted Outline for the current project. */
  outline: Outline | null;

  /** The project this outline belongs to. */
  projectId: string | null;

  /** Whether the outline has been loaded from persistence. */
  isLoaded: boolean;

  // --- Lifecycle -----------------------------------------------------------

  /** Load outline from Firestore for a project. */
  loadForProject: (projectId: string) => Promise<void>;

  /** Persist current outline to Firestore. */
  persist: () => void;

  /** Delete outline for a project. */
  deleteForProject: (projectId: string) => Promise<void>;

  /** Clear in-memory state. */
  clear: () => void;

  // --- Reconciliation ------------------------------------------------------

  /**
   * Reconcile the outline against a fresh Fountain parse.
   * This is the core method — called after every parseContent() in the editor.
   */
  reconcileFromParse: (screenplay: Screenplay) => void;

  // --- Scene operations ----------------------------------------------------

  /** Add a planned scene (not yet in Fountain text). */
  addPlannedScene: (
    after: SceneId | null,
    partial?: Partial<Pick<OutlineEntry, 'heading' | 'summary' | 'beatId'>>,
  ) => SceneId;

  /** Update fields on an outline entry. */
  updateScene: (
    id: SceneId,
    updates: Partial<Pick<OutlineEntry, 'summary' | 'status' | 'beatId'>>,
  ) => void;

  /** Remove an outline entry entirely. */
  removeScene: (id: SceneId) => void;

  // --- Beat operations -----------------------------------------------------

  /** Assign a beat to a scene. */
  assignBeat: (sceneId: SceneId, beatId: string) => void;

  /** Unassign a beat from a scene. */
  unassignBeat: (sceneId: SceneId) => void;

  // --- Queries -------------------------------------------------------------

  /** Get an outline entry by SceneId. */
  getScene: (id: SceneId) => OutlineEntry | undefined;

  /** Get all scenes assigned to a particular beat. */
  getScenesForBeat: (beatId: string) => OutlineEntry[];

  /** Get all scenes whose location matches. */
  getScenesForLocation: (location: string) => OutlineEntry[];

  /** Find which SceneId a line number falls within. */
  getSceneIdForLine: (line: number) => SceneId | null;
}

// ---------------------------------------------------------------------------
// Persistence helper
// ---------------------------------------------------------------------------

let _persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    useOutlineStore.getState().persist();
  }, 500);
}

function updateOutline(
  set: (fn: (state: OutlineState) => Partial<OutlineState>) => void,
  updater: (outline: Outline) => Outline,
) {
  set((state) => {
    if (!state.outline) return {};
    return { outline: updater({ ...state.outline, updatedAt: Date.now() }) };
  });
  schedulePersist();
}

// ---------------------------------------------------------------------------
// Act / Sequence derivation from structure detection
// ---------------------------------------------------------------------------

/**
 * Convert the ephemeral structure detection output (which uses scene indices)
 * into SceneId-based OutlineAct[] and OutlineSequence[].
 */
function deriveActsAndSequences(
  screenplay: Screenplay,
  scenes: OutlineEntry[],
): { acts: OutlineAct[]; sequences: OutlineSequence[] } {
  if (screenplay.scenes.length === 0) {
    return { acts: [], sequences: [] };
  }

  const structure = detectStructure(screenplay);

  // Build a mapping from scene index (in Screenplay.scenes) to SceneId.
  // We match by startLine since reconciliation preserves fountain ranges.
  const indexToSceneId = new Map<number, SceneId>();
  for (let i = 0; i < screenplay.scenes.length; i++) {
    const parsedScene = screenplay.scenes[i];
    const outlineEntry = scenes.find(
      (e) =>
        e.fountainRange !== null &&
        e.fountainRange.startLine === parsedScene.startLine,
    );
    if (outlineEntry) {
      indexToSceneId.set(i, outlineEntry.id);
    }
  }

  const acts: OutlineAct[] = structure.acts.map((act) => ({
    id: generateId(),
    label: act.label,
    sceneIds: act.sceneIndices
      .map((idx) => indexToSceneId.get(idx))
      .filter((id): id is SceneId => id !== undefined),
    source: act.source === 'section' ? 'explicit' : 'heuristic',
  }));

  const sequences: OutlineSequence[] = structure.sequences.map((seq) => {
    // Find the parent act.
    const parentAct = acts.find((a) =>
      a.label.toLowerCase().includes(
        seq.actNumber === 1 ? 'one' : seq.actNumber === 2 ? 'two' : 'three',
      ),
    );
    return {
      id: generateId(),
      label: seq.label,
      sceneIds: seq.sceneIndices
        .map((idx) => indexToSceneId.get(idx))
        .filter((id): id is SceneId => id !== undefined),
      actId: parentAct?.id ?? '',
      source: 'auto' as const,
    };
  });

  return { acts, sequences };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useOutlineStore = create<OutlineState>((set, get) => ({
  outline: null,
  projectId: null,
  isLoaded: false,

  // --- Lifecycle -----------------------------------------------------------

  loadForProject: async (projectId) => {
    const userId = useProjectStore.getState().userId;
    if (!userId) return;
    const outline = await loadOutline(userId, projectId);
    set({ outline, projectId, isLoaded: true });
  },

  persist: () => {
    const { outline, projectId } = get();
    if (!outline || !projectId) return;
    const userId = useProjectStore.getState().userId;
    if (!userId) return;
    saveOutline(userId, projectId, outline);
  },

  deleteForProject: async (projectId) => {
    const userId = useProjectStore.getState().userId;
    if (!userId) return;
    await deleteOutline(userId, projectId);
  },

  clear: () => {
    set({ outline: null, projectId: null, isLoaded: false });
  },

  // --- Reconciliation ------------------------------------------------------

  reconcileFromParse: (screenplay) => {
    const { outline, projectId } = get();
    if (!projectId) return;

    const existingScenes = outline?.scenes ?? [];
    const reconciledScenes = reconcile(screenplay.scenes, existingScenes);

    // Derive acts and sequences from structure detection.
    const { acts, sequences } = deriveActsAndSequences(
      screenplay,
      reconciledScenes,
    );

    const newOutline: Outline = {
      projectId,
      scenes: reconciledScenes,
      acts,
      sequences,
      updatedAt: Date.now(),
    };

    set({ outline: newOutline });
    schedulePersist();
  },

  // --- Scene operations ----------------------------------------------------

  addPlannedScene: (after, partial) => {
    const id = generateSceneId();

    updateOutline(set, (outline) => {
      const scenes = [...outline.scenes];
      const newEntry: OutlineEntry = {
        id,
        heading: partial?.heading ?? '',
        intExt: '',
        location: '',
        timeOfDay: '',
        summary: partial?.summary ?? '',
        beatId: partial?.beatId ?? null,
        characterIds: [],
        sortIndex: 0, // Will be re-indexed below.
        fountainRange: null,
        sceneNumber: null,
        status: 'planned',
      };

      if (after) {
        const afterIdx = scenes.findIndex((s) => s.id === after);
        scenes.splice(afterIdx + 1, 0, newEntry);
      } else {
        scenes.unshift(newEntry);
      }

      // Re-index.
      for (let i = 0; i < scenes.length; i++) {
        scenes[i] = { ...scenes[i], sortIndex: i };
      }

      return { ...outline, scenes };
    });

    return id;
  },

  updateScene: (id, updates) => {
    updateOutline(set, (outline) => ({
      ...outline,
      scenes: outline.scenes.map((s) =>
        s.id === id ? { ...s, ...updates } : s,
      ),
    }));
  },

  removeScene: (id) => {
    updateOutline(set, (outline) => {
      const scenes = outline.scenes
        .filter((s) => s.id !== id)
        .map((s, i) => ({ ...s, sortIndex: i }));
      return { ...outline, scenes };
    });
  },

  // --- Beat operations -----------------------------------------------------

  assignBeat: (sceneId, beatId) => {
    updateOutline(set, (outline) => ({
      ...outline,
      scenes: outline.scenes.map((s) =>
        s.id === sceneId ? { ...s, beatId } : s,
      ),
    }));
  },

  unassignBeat: (sceneId) => {
    updateOutline(set, (outline) => ({
      ...outline,
      scenes: outline.scenes.map((s) =>
        s.id === sceneId ? { ...s, beatId: null } : s,
      ),
    }));
  },

  // --- Queries -------------------------------------------------------------

  getScene: (id) => {
    return get().outline?.scenes.find((s) => s.id === id);
  },

  getScenesForBeat: (beatId) => {
    return get().outline?.scenes.filter((s) => s.beatId === beatId) ?? [];
  },

  getScenesForLocation: (location) => {
    const loc = location.toLowerCase().trim();
    return (
      get().outline?.scenes.filter(
        (s) => s.location.toLowerCase().trim() === loc,
      ) ?? []
    );
  },

  getSceneIdForLine: (line) => {
    const scenes = get().outline?.scenes ?? [];
    for (const scene of scenes) {
      if (
        scene.fountainRange &&
        line >= scene.fountainRange.startLine &&
        line <= scene.fountainRange.endLine
      ) {
        return scene.id;
      }
    }
    return null;
  },
}));
