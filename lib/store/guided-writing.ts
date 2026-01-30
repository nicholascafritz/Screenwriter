// ---------------------------------------------------------------------------
// Guided Writing Store -- State management for AI-guided scene writing mode
// ---------------------------------------------------------------------------
//
// This store manages the "guided writing" mode where the AI proactively
// prompts the user through each scene of their screenplay. It coordinates
// with the outline store for scene data and progress tracking.
//
// Flow:
// 1. User completes Guide → generates outline → clicks "Generate Skeleton"
// 2. GuideSummary activates guided writing mode
// 3. Editor initializes with guided mode active
// 4. AI prompts user about Scene 1, user provides direction, AI writes
// 5. Progress tracked via outline scene status ('planned' → 'drafted')
// 6. User can exit to free-form editing at any time
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { useOutlineStore } from './outline';
import { useStoryBibleStore } from './story-bible';
import type { OutlineEntry } from './outline-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuidedWritingState {
  /** Whether guided writing mode is currently active. */
  isActive: boolean;

  /** Index of the current scene being worked on (0-based). */
  currentSceneIndex: number;

  /** Whether the initial prompt has been injected into chat. */
  hasInjectedInitialPrompt: boolean;

  // --- Actions -------------------------------------------------------------

  /** Activate guided writing mode, starting from the first unwritten scene. */
  startGuidedWriting: () => void;

  /** Deactivate guided writing mode. */
  stopGuidedWriting: () => void;

  /** Move to the next scene in the outline. */
  advanceToNextScene: () => void;

  /** Jump to a specific scene by index. */
  goToScene: (index: number) => void;

  /** Mark that the initial prompt has been injected. */
  markInitialPromptInjected: () => void;

  /** Reset the initial prompt flag (for new sessions). */
  resetInitialPromptFlag: () => void;

  // --- Queries -------------------------------------------------------------

  /** Get the current scene being worked on. */
  getCurrentScene: () => OutlineEntry | null;

  /** Get the next scene (for preview/prompting). */
  getNextScene: () => OutlineEntry | null;

  /** Get progress statistics. */
  getProgress: () => { completed: number; total: number; percentage: number };

  /** Get the first unwritten (planned) scene. */
  getFirstUnwrittenScene: () => { scene: OutlineEntry; index: number } | null;

  /** Build context for the AI prompt about the current scene. */
  buildSceneContext: () => SceneContext | null;
}

export interface SceneContext {
  sceneNumber: number;
  heading: string;
  summary: string;
  beatName: string | null;
  beatDescription: string | null;
  characters: string[];
  previousSceneSummary: string | null;
  nextSceneHeading: string | null;
  totalScenes: number;
  completedScenes: number;
}

// ---------------------------------------------------------------------------
// Session storage key for persistence across page navigations
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'screenwriter:guidedWriting';

function loadFromSession(): Partial<GuidedWritingState> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        isActive: data.isActive ?? false,
        currentSceneIndex: data.currentSceneIndex ?? 0,
        hasInjectedInitialPrompt: data.hasInjectedInitialPrompt ?? false,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

function saveToSession(state: Partial<GuidedWritingState>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        isActive: state.isActive,
        currentSceneIndex: state.currentSceneIndex,
        hasInjectedInitialPrompt: state.hasInjectedInitialPrompt,
      })
    );
  } catch {
    // Ignore storage errors
  }
}

function clearSession() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useGuidedWritingStore = create<GuidedWritingState>((set, get) => {
  // Load initial state from session storage
  const initial = loadFromSession();

  return {
    isActive: initial.isActive ?? false,
    currentSceneIndex: initial.currentSceneIndex ?? 0,
    hasInjectedInitialPrompt: initial.hasInjectedInitialPrompt ?? false,

    // --- Actions -----------------------------------------------------------

    startGuidedWriting: () => {
      // Find the first unwritten scene to start from
      const firstUnwritten = get().getFirstUnwrittenScene();
      const startIndex = firstUnwritten?.index ?? 0;

      set({
        isActive: true,
        currentSceneIndex: startIndex,
        hasInjectedInitialPrompt: false,
      });
      saveToSession({
        isActive: true,
        currentSceneIndex: startIndex,
        hasInjectedInitialPrompt: false,
      });
    },

    stopGuidedWriting: () => {
      set({
        isActive: false,
        hasInjectedInitialPrompt: false,
      });
      clearSession();
    },

    advanceToNextScene: () => {
      const scenes = useOutlineStore.getState().outline?.scenes ?? [];
      const currentIndex = get().currentSceneIndex;
      const nextIndex = currentIndex + 1;

      if (nextIndex < scenes.length) {
        set({ currentSceneIndex: nextIndex });
        saveToSession({
          isActive: get().isActive,
          currentSceneIndex: nextIndex,
          hasInjectedInitialPrompt: get().hasInjectedInitialPrompt,
        });
      }
    },

    goToScene: (index) => {
      const scenes = useOutlineStore.getState().outline?.scenes ?? [];
      if (index >= 0 && index < scenes.length) {
        set({ currentSceneIndex: index });
        saveToSession({
          isActive: get().isActive,
          currentSceneIndex: index,
          hasInjectedInitialPrompt: get().hasInjectedInitialPrompt,
        });
      }
    },

    markInitialPromptInjected: () => {
      set({ hasInjectedInitialPrompt: true });
      saveToSession({
        isActive: get().isActive,
        currentSceneIndex: get().currentSceneIndex,
        hasInjectedInitialPrompt: true,
      });
    },

    resetInitialPromptFlag: () => {
      set({ hasInjectedInitialPrompt: false });
      saveToSession({
        isActive: get().isActive,
        currentSceneIndex: get().currentSceneIndex,
        hasInjectedInitialPrompt: false,
      });
    },

    // --- Queries -----------------------------------------------------------

    getCurrentScene: () => {
      const scenes = useOutlineStore.getState().outline?.scenes ?? [];
      const index = get().currentSceneIndex;
      return scenes[index] ?? null;
    },

    getNextScene: () => {
      const scenes = useOutlineStore.getState().outline?.scenes ?? [];
      const index = get().currentSceneIndex + 1;
      return scenes[index] ?? null;
    },

    getProgress: () => {
      const scenes = useOutlineStore.getState().outline?.scenes ?? [];
      const total = scenes.length;
      const completed = scenes.filter(
        (s) => s.status === 'drafted' || s.status === 'revised' || s.status === 'locked'
      ).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { completed, total, percentage };
    },

    getFirstUnwrittenScene: () => {
      const scenes = useOutlineStore.getState().outline?.scenes ?? [];
      for (let i = 0; i < scenes.length; i++) {
        if (scenes[i].status === 'planned') {
          return { scene: scenes[i], index: i };
        }
      }
      return null;
    },

    buildSceneContext: () => {
      const currentScene = get().getCurrentScene();
      if (!currentScene) return null;

      const scenes = useOutlineStore.getState().outline?.scenes ?? [];
      const bible = useStoryBibleStore.getState().bible;
      const currentIndex = get().currentSceneIndex;

      // Get beat info
      let beatName: string | null = null;
      let beatDescription: string | null = null;
      if (currentScene.beatId && bible) {
        const beat = bible.beatSheet.find((b) => b.id === currentScene.beatId);
        if (beat) {
          beatName = beat.beat;
          beatDescription = beat.description ?? null;
        }
      }

      // Get character names from IDs
      const characters: string[] = [];
      if (bible) {
        for (const charId of currentScene.characterIds) {
          const char = bible.characters.find((c) => c.id === charId);
          if (char) {
            characters.push(char.name);
          }
        }
      }

      // Get previous scene summary
      let previousSceneSummary: string | null = null;
      if (currentIndex > 0 && scenes[currentIndex - 1]) {
        previousSceneSummary = scenes[currentIndex - 1].summary || null;
      }

      // Get next scene heading
      let nextSceneHeading: string | null = null;
      if (currentIndex < scenes.length - 1 && scenes[currentIndex + 1]) {
        nextSceneHeading = scenes[currentIndex + 1].heading || null;
      }

      // Get progress
      const { completed, total } = get().getProgress();

      return {
        sceneNumber: currentIndex + 1,
        heading: currentScene.heading || 'Untitled Scene',
        summary: currentScene.summary || '',
        beatName,
        beatDescription,
        characters,
        previousSceneSummary,
        nextSceneHeading,
        totalScenes: total,
        completedScenes: completed,
      };
    },
  };
});
