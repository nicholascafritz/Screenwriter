// ---------------------------------------------------------------------------
// Training Feedback Store
// ---------------------------------------------------------------------------
//
// Manages user-contributed training examples and feedback on AI outputs.
// This data can be used to:
// 1. Improve AI quality by including user-bookmarked examples in prompts
// 2. Allow users to add custom voice samples
// 3. Track feedback for potential future analysis
//
// Usage:
//   import { useTrainingFeedbackStore } from '@/lib/store/training-feedback';
//   const { addExample, userVoiceSamples } = useTrainingFeedbackStore();
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A training example bookmarked by the user.
 */
export interface TrainingExample {
  /** Unique identifier. */
  id: string;
  /** Type of example. */
  type: 'voice-sample' | 'good-edit' | 'good-analysis' | 'preferred-response';
  /** Project this example came from. */
  projectId: string;
  /** When this example was saved. */
  createdAt: string;

  // Context
  /** Operating mode when example was created. */
  mode: 'inline' | 'diff' | 'agent' | 'writers-room';
  /** Voice profile active when example was created. */
  voiceId: string;
  /** The user's original request. */
  userRequest: string;

  // Content
  /** The example content (Fountain for voice samples, full response for others). */
  content: string;

  // Metadata
  /** User-defined tags for organization. */
  tags: string[];
  /** Optional notes from the user. */
  notes?: string;
}

/**
 * A voice sample contributed by the user.
 */
export interface UserVoiceSample {
  /** Unique identifier. */
  id: string;
  /** Which voice this sample is for (preset voice id or 'custom'). */
  voiceId: string;
  /** Which craft aspect this sample demonstrates. */
  aspect: 'dialogue' | 'action' | 'scene-description';
  /** User-provided label for the sample. */
  label: string;
  /** The Fountain-formatted excerpt. */
  fountain: string;
  /** When this sample was added. */
  createdAt: string;
}

/**
 * Feedback on an AI response.
 */
export interface ResponseFeedback {
  /** Unique identifier. */
  id: string;
  /** ID of the AI response being rated. */
  responseId: string;
  /** User rating. */
  rating: 'good' | 'bad';
  /** Optional reason for the rating. */
  reason?: string;
  /** When the feedback was given. */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

export interface TrainingFeedbackState {
  // Bookmarked good outputs
  examples: TrainingExample[];
  addExample: (example: Omit<TrainingExample, 'id' | 'createdAt'>) => string;
  removeExample: (id: string) => void;
  getExamplesByProject: (projectId: string) => TrainingExample[];
  getExamplesByType: (type: TrainingExample['type']) => TrainingExample[];

  // User-contributed voice samples
  userVoiceSamples: UserVoiceSample[];
  addVoiceSample: (sample: Omit<UserVoiceSample, 'id' | 'createdAt'>) => string;
  removeVoiceSample: (id: string) => void;
  getVoiceSamplesByVoice: (voiceId: string) => UserVoiceSample[];

  // Feedback on AI outputs
  feedback: ResponseFeedback[];
  addFeedback: (responseId: string, rating: 'good' | 'bad', reason?: string) => string;
  getFeedbackByResponse: (responseId: string) => ResponseFeedback | undefined;

  // Utility
  clearAll: () => void;
  exportData: () => {
    examples: TrainingExample[];
    userVoiceSamples: UserVoiceSample[];
    feedback: ResponseFeedback[];
  };
}

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const useTrainingFeedbackStore = create<TrainingFeedbackState>()(
  persist(
    (set, get) => ({
      // ---------------------
      // Training Examples
      // ---------------------
      examples: [],

      addExample: (example) => {
        const id = crypto.randomUUID();
        set((state) => ({
          examples: [
            ...state.examples,
            {
              ...example,
              id,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },

      removeExample: (id) =>
        set((state) => ({
          examples: state.examples.filter((e) => e.id !== id),
        })),

      getExamplesByProject: (projectId) =>
        get().examples.filter((e) => e.projectId === projectId),

      getExamplesByType: (type) =>
        get().examples.filter((e) => e.type === type),

      // ---------------------
      // User Voice Samples
      // ---------------------
      userVoiceSamples: [],

      addVoiceSample: (sample) => {
        const id = crypto.randomUUID();
        set((state) => ({
          userVoiceSamples: [
            ...state.userVoiceSamples,
            {
              ...sample,
              id,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },

      removeVoiceSample: (id) =>
        set((state) => ({
          userVoiceSamples: state.userVoiceSamples.filter((s) => s.id !== id),
        })),

      getVoiceSamplesByVoice: (voiceId) =>
        get().userVoiceSamples.filter((s) => s.voiceId === voiceId),

      // ---------------------
      // Response Feedback
      // ---------------------
      feedback: [],

      addFeedback: (responseId, rating, reason) => {
        const id = crypto.randomUUID();
        set((state) => ({
          feedback: [
            ...state.feedback,
            {
              id,
              responseId,
              rating,
              reason,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
        return id;
      },

      getFeedbackByResponse: (responseId) =>
        get().feedback.find((f) => f.responseId === responseId),

      // ---------------------
      // Utility
      // ---------------------
      clearAll: () =>
        set({
          examples: [],
          userVoiceSamples: [],
          feedback: [],
        }),

      exportData: () => ({
        examples: get().examples,
        userVoiceSamples: get().userVoiceSamples,
        feedback: get().feedback,
      }),
    }),
    {
      name: 'training-feedback-storage',
      version: 1,
    }
  )
);

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/**
 * Get user voice samples for a specific voice, limited to a maximum count.
 * Sorted by most recent first.
 */
export function getUserVoiceSamplesForPrompt(
  voiceId: string,
  maxSamples: number = 3
): UserVoiceSample[] {
  const samples = useTrainingFeedbackStore.getState().getVoiceSamplesByVoice(voiceId);
  return samples
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxSamples);
}

/**
 * Get recent good examples for a specific mode, limited to a maximum count.
 */
export function getGoodExamplesForMode(
  mode: TrainingExample['mode'],
  maxExamples: number = 2
): TrainingExample[] {
  const examples = useTrainingFeedbackStore
    .getState()
    .examples.filter((e) => e.mode === mode && e.type === 'good-edit');
  return examples
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxExamples);
}

/**
 * Calculate feedback statistics.
 */
export function getFeedbackStats(): {
  total: number;
  good: number;
  bad: number;
  goodPercentage: number;
} {
  const feedback = useTrainingFeedbackStore.getState().feedback;
  const good = feedback.filter((f) => f.rating === 'good').length;
  const bad = feedback.filter((f) => f.rating === 'bad').length;
  const total = feedback.length;
  return {
    total,
    good,
    bad,
    goodPercentage: total > 0 ? Math.round((good / total) * 100) : 0,
  };
}
