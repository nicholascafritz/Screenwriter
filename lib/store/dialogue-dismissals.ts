// ---------------------------------------------------------------------------
// Dialogue Dismissals Store -- Zustand state for pattern dismissals
// ---------------------------------------------------------------------------
//
// Persists user decisions about which dialogue patterns to dismiss (mark as
// intentional) so they don't appear in future analyses.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateId } from '@/lib/utils';
import type {
  DialoguePatternType,
  DialoguePatternDismissal,
} from '@/lib/agent/dialogue-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DialogueDismissalsState {
  /** All dismissals across projects. */
  dismissals: DialoguePatternDismissal[];

  // -- Actions --------------------------------------------------------------

  /**
   * Check if a pattern is dismissed for a character pair.
   */
  isDismissed: (
    projectId: string,
    characterA: string,
    characterB: string,
    patternType: DialoguePatternType
  ) => boolean;

  /**
   * Dismiss a pattern for a character pair.
   * Returns the dismissal ID.
   */
  dismiss: (
    projectId: string,
    characterA: string,
    characterB: string,
    patternType: DialoguePatternType,
    reason?: string
  ) => string;

  /**
   * Remove a dismissal by ID.
   */
  undismiss: (dismissalId: string) => void;

  /**
   * Dismiss all patterns for a character pair.
   */
  dismissAllForPair: (
    projectId: string,
    characterA: string,
    characterB: string,
    reason?: string
  ) => void;

  /**
   * Get all dismissals for a project.
   */
  getForProject: (projectId: string) => DialoguePatternDismissal[];

  /**
   * Get dismissals for a specific character pair.
   */
  getForPair: (
    projectId: string,
    characterA: string,
    characterB: string
  ) => DialoguePatternDismissal[];

  /**
   * Clear all dismissals for a project.
   */
  clearForProject: (projectId: string) => void;

  /**
   * Clear all dismissals.
   */
  clearAll: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize character pair for consistent lookup (alphabetical order).
 */
function normalizePair(charA: string, charB: string): [string, string] {
  return charA.localeCompare(charB) <= 0 ? [charA, charB] : [charB, charA];
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useDialogueDismissalsStore = create<DialogueDismissalsState>()(
  persist(
    (set, get) => ({
      dismissals: [],

      isDismissed: (projectId, characterA, characterB, patternType) => {
        const [normA, normB] = normalizePair(characterA, characterB);
        return get().dismissals.some(
          (d) =>
            d.projectId === projectId &&
            d.characterA === normA &&
            d.characterB === normB &&
            d.patternType === patternType
        );
      },

      dismiss: (projectId, characterA, characterB, patternType, reason) => {
        const [normA, normB] = normalizePair(characterA, characterB);

        // Check if already dismissed
        if (get().isDismissed(projectId, normA, normB, patternType)) {
          const existing = get().dismissals.find(
            (d) =>
              d.projectId === projectId &&
              d.characterA === normA &&
              d.characterB === normB &&
              d.patternType === patternType
          );
          return existing?.id ?? '';
        }

        const id = generateId();
        const dismissal: DialoguePatternDismissal = {
          id,
          projectId,
          characterA: normA,
          characterB: normB,
          patternType,
          reason,
          dismissedAt: Date.now(),
        };

        set((state) => ({
          dismissals: [...state.dismissals, dismissal],
        }));

        return id;
      },

      undismiss: (dismissalId) => {
        set((state) => ({
          dismissals: state.dismissals.filter((d) => d.id !== dismissalId),
        }));
      },

      dismissAllForPair: (projectId, characterA, characterB, reason) => {
        const [normA, normB] = normalizePair(characterA, characterB);
        const allPatternTypes: DialoguePatternType[] = [
          'vocabulary_overlap',
          'rhythm_similarity',
          'sentence_structure',
          'formality_match',
          'word_choice_pattern',
          'punctuation_style',
        ];

        const newDismissals: DialoguePatternDismissal[] = [];
        for (const patternType of allPatternTypes) {
          if (!get().isDismissed(projectId, normA, normB, patternType)) {
            newDismissals.push({
              id: generateId(),
              projectId,
              characterA: normA,
              characterB: normB,
              patternType,
              reason,
              dismissedAt: Date.now(),
            });
          }
        }

        if (newDismissals.length > 0) {
          set((state) => ({
            dismissals: [...state.dismissals, ...newDismissals],
          }));
        }
      },

      getForProject: (projectId) => {
        return get().dismissals.filter((d) => d.projectId === projectId);
      },

      getForPair: (projectId, characterA, characterB) => {
        const [normA, normB] = normalizePair(characterA, characterB);
        return get().dismissals.filter(
          (d) =>
            d.projectId === projectId &&
            d.characterA === normA &&
            d.characterB === normB
        );
      },

      clearForProject: (projectId) => {
        set((state) => ({
          dismissals: state.dismissals.filter((d) => d.projectId !== projectId),
        }));
      },

      clearAll: () => {
        set({ dismissals: [] });
      },
    }),
    {
      name: 'screenwriter:dialogue-dismissals',
      version: 1,
    }
  )
);
