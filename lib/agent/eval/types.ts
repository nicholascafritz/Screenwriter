// ---------------------------------------------------------------------------
// AI Agent -- Evaluation Framework Types
// ---------------------------------------------------------------------------
//
// Type definitions for the evaluation dataset used to test and measure
// the quality of system prompt behavior.  These types are used exclusively
// by the eval dataset and test harnesses — they are never imported by
// runtime code.
//
// Usage:
//   import type { EvalCase, EvalSuite } from '@/lib/agent/eval/types';
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

/**
 * The seven evaluation categories, each testing a distinct dimension
 * of system prompt effectiveness.
 */
export type EvalCategory =
  | 'mode_behavior'
  | 'tool_selection'
  | 'tool_sequencing'
  | 'voice_adherence'
  | 'fountain_format'
  | 'edit_precision'
  | 'negative_case';

// ---------------------------------------------------------------------------
// Criteria
// ---------------------------------------------------------------------------

/**
 * A single quality criterion used to evaluate an AI response.
 *
 * Criteria are scored on a 0-1 scale and weighted so that more
 * important aspects contribute more to the final score.
 */
export interface EvalCriterion {
  /** Human-readable name (e.g. "tool_order_correct"). */
  name: string;

  /** What this criterion measures. */
  description: string;

  /**
   * Relative weight of this criterion within its eval case.
   * Weights across all criteria in a case should sum to 1.0.
   */
  weight: number;
}

// ---------------------------------------------------------------------------
// Eval Case
// ---------------------------------------------------------------------------

/**
 * A single evaluation test case that defines inputs, expected behavior,
 * and quality criteria for scoring AI responses.
 */
export interface EvalCase {
  /** Unique identifier (e.g. "mode_inline_dialogue_polish"). */
  id: string;

  /** Human-readable name. */
  name: string;

  /** Which evaluation category this case belongs to. */
  category: EvalCategory;

  /** Difficulty level for categorization and reporting. */
  difficulty: 'easy' | 'medium' | 'hard';

  // -- Inputs --

  /** The operating mode for this test. */
  mode: 'inline' | 'diff' | 'agent';

  /** The voice profile ID to activate. */
  voiceId: string;

  /** The user message that triggers the AI response. */
  userMessage: string;

  /** The screenplay Fountain text to use as context. */
  screenplay: string;

  /** Optional: the scene the cursor is in. */
  cursorScene?: string;

  /** Optional: selected text in the editor. */
  selection?: string;

  // -- Expected behavior --

  /** Tool names that should be called (in expected order). */
  expectedTools: string[];

  /** Quality criteria with weights (should sum to 1.0). */
  criteria: EvalCriterion[];

  /** Prose description of the ideal outcome. */
  idealOutcome: string;

  /** Specific anti-patterns the AI should avoid. */
  antiPatterns: string[];
}

// ---------------------------------------------------------------------------
// Eval Suite
// ---------------------------------------------------------------------------

/**
 * A collection of eval cases, optionally filtered by category or mode.
 */
export interface EvalSuite {
  /** Human-readable suite name. */
  name: string;

  /** Suite description. */
  description: string;

  /** The test cases in this suite. */
  cases: EvalCase[];
}
