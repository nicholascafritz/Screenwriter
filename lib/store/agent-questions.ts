// ---------------------------------------------------------------------------
// Agent Questions Store - State management for AI clarifying questions
// ---------------------------------------------------------------------------
//
// Zustand store that manages the state for AI-initiated clarifying questions.
// When the AI uses the ask_question tool, this store holds the question
// and handles user responses.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { AgentQuestion, QuestionOption, QuestionResponse } from '../agent/question-tools';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentQuestionState {
  /** The current pending question, if any */
  pendingQuestion: AgentQuestion | null;

  /** Whether we're waiting for user to respond */
  isAwaitingResponse: boolean;

  /** Currently selected option IDs (before submission) */
  selectedOptionIds: string[];

  /** Current custom text (before submission) */
  currentCustomText: string;

  /** Callback to invoke when user submits their answer */
  onResponseCallback: ((response: QuestionResponse) => void) | null;

  /** Set a new pending question */
  setPendingQuestion: (
    question: AgentQuestion,
    onResponse: (response: QuestionResponse) => void
  ) => void;

  /** Toggle an option selection */
  toggleOption: (optionId: string) => void;

  /** Set custom text input */
  setCustomText: (text: string) => void;

  /** Submit the user's response */
  submitResponse: () => void;

  /** Clear/dismiss the question without responding */
  clearQuestion: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAgentQuestionStore = create<AgentQuestionState>((set, get) => ({
  pendingQuestion: null,
  isAwaitingResponse: false,
  selectedOptionIds: [],
  currentCustomText: '',
  onResponseCallback: null,

  setPendingQuestion: (question, onResponse) => {
    set({
      pendingQuestion: question,
      isAwaitingResponse: true,
      selectedOptionIds: [],
      currentCustomText: '',
      onResponseCallback: onResponse,
    });
  },

  toggleOption: (optionId) => {
    const { pendingQuestion, selectedOptionIds } = get();
    if (!pendingQuestion) return;

    if (pendingQuestion.multiSelect) {
      // Multi-select: toggle the option
      const isSelected = selectedOptionIds.includes(optionId);
      set({
        selectedOptionIds: isSelected
          ? selectedOptionIds.filter((id) => id !== optionId)
          : [...selectedOptionIds, optionId],
      });
    } else {
      // Single-select: replace selection
      set({
        selectedOptionIds: [optionId],
      });
    }
  },

  setCustomText: (text) => {
    set({ currentCustomText: text });
  },

  submitResponse: () => {
    const { pendingQuestion, selectedOptionIds, currentCustomText, onResponseCallback } = get();
    if (!pendingQuestion) return;

    // Build the response
    const selectedLabels = pendingQuestion.options
      .filter((opt) => selectedOptionIds.includes(opt.id))
      .map((opt) => opt.label);

    const response: QuestionResponse = {
      questionId: pendingQuestion.id,
      selectedIds: selectedOptionIds,
      selectedLabels,
      customText: currentCustomText.trim() || undefined,
    };

    // Clear state
    set({
      pendingQuestion: null,
      isAwaitingResponse: false,
      selectedOptionIds: [],
      currentCustomText: '',
      onResponseCallback: null,
    });

    // Invoke callback
    if (onResponseCallback) {
      onResponseCallback(response);
    }
  },

  clearQuestion: () => {
    const { onResponseCallback, pendingQuestion } = get();

    // If dismissing, send an empty response so the AI knows to proceed
    if (onResponseCallback && pendingQuestion) {
      onResponseCallback({
        questionId: pendingQuestion.id,
        selectedIds: [],
        selectedLabels: [],
        customText: undefined,
      });
    }

    set({
      pendingQuestion: null,
      isAwaitingResponse: false,
      selectedOptionIds: [],
      currentCustomText: '',
      onResponseCallback: null,
    });
  },
}));

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Check if an option is currently selected */
export function selectIsOptionSelected(
  state: AgentQuestionState,
  optionId: string
): boolean {
  return state.selectedOptionIds.includes(optionId);
}

/** Check if the user can submit (has selection or custom text) */
export function selectCanSubmit(state: AgentQuestionState): boolean {
  const { selectedOptionIds, currentCustomText, pendingQuestion } = state;

  if (selectedOptionIds.length > 0) return true;
  if (pendingQuestion?.allowCustom !== false && currentCustomText.trim().length > 0) return true;

  return false;
}
