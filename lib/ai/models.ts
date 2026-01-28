// ---------------------------------------------------------------------------
// AI Model Configuration
// ---------------------------------------------------------------------------
//
// Defines the three-tier model system for the Screenwriter application:
//
//   Tier 1 - Opus 4.5:   Strategic reasoning, complex planning, high-level
//                         creative direction, writers-room brainstorming.
//   Tier 2 - Sonnet 4.5: Screenplay writing, scene editing, dialogue craft,
//                         tool-driven execution.  Uses extended thinking for
//                         creative output that benefits from deliberation.
//   Tier 3 - Haiku 3.5:  Utility tasks — summarization, simple analysis,
//                         format validation, and lightweight read-only queries.
//
// Each model can run with or without extended thinking.  Thinking adds a
// private chain-of-thought budget that improves output quality for complex
// creative and analytical tasks at the cost of latency.
//
// Usage:
//   import { MODELS, type ModelConfig } from '@/lib/ai/models';
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Model identifiers (pinned versions for reproducibility)
// ---------------------------------------------------------------------------

export const MODELS = {
  /** Claude Opus 4.5 — deepest reasoning, highest quality. */
  opus: 'claude-opus-4-5-20251101',

  /** Claude Sonnet 4.5 — strong creative writing, fast tool use. */
  sonnet: 'claude-sonnet-4-5-20250929',

  /** Claude Haiku 3.5 — fastest, best for utility/mechanical tasks. */
  haiku: 'claude-haiku-3-5-20241022',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];
export type ModelTier = keyof typeof MODELS;

// ---------------------------------------------------------------------------
// Extended thinking configuration
// ---------------------------------------------------------------------------

export interface ThinkingConfig {
  type: 'enabled';
  budget_tokens: number;
}

// ---------------------------------------------------------------------------
// Model configuration (passed to Anthropic API calls)
// ---------------------------------------------------------------------------

/**
 * Complete configuration for an API call to a specific model.
 *
 * When {@link thinking} is set, the API call uses extended thinking mode.
 * The `budget_tokens` field controls how many tokens the model can use for
 * its private chain-of-thought.  The `maxTokens` field controls the
 * maximum output tokens for the visible response (text + tool calls).
 *
 * Important constraints when thinking is enabled:
 *   - Temperature is fixed at 1 (cannot be overridden).
 *   - Thinking blocks in assistant messages must be preserved across turns.
 */
export interface ModelConfig {
  /** The full model identifier string. */
  model: ModelId;

  /** Human-readable label for logging and UI metadata. */
  label: string;

  /** Maximum output tokens for the visible response (text + tool use). */
  maxTokens: number;

  /** Extended thinking configuration.  Omit for standard (non-thinking) mode. */
  thinking?: ThinkingConfig;
}

// ---------------------------------------------------------------------------
// Pre-built model configurations for each task type
// ---------------------------------------------------------------------------

/**
 * Opus 4.5 with extended thinking — for complex strategic planning.
 *
 * Used when the model needs to reason deeply about screenplay structure,
 * multi-step task decomposition, or architectural creative decisions.
 * The large thinking budget (16 000 tokens) allows thorough exploration
 * of alternatives before committing to a plan.
 */
export const OPUS_THINKING: ModelConfig = {
  model: MODELS.opus,
  label: 'Opus 4.5 (thinking)',
  maxTokens: 8192,
  thinking: { type: 'enabled', budget_tokens: 16_000 },
};

/**
 * Opus 4.5 standard — for high-quality conversational analysis.
 *
 * Used in writers-room mode where the model needs the deepest creative
 * understanding but must stream responses conversationally without the
 * latency overhead of extended thinking.
 */
export const OPUS_STANDARD: ModelConfig = {
  model: MODELS.opus,
  label: 'Opus 4.5',
  maxTokens: 8192,
};

/**
 * Sonnet 4.5 with extended thinking — the primary writing model.
 *
 * Used for all creative screenplay output: writing scenes, editing
 * dialogue, proposing diff changes, and executing agent plan steps.
 * The thinking budget (10 000 tokens) lets the model plan prose
 * structure, consider voice consistency, and reason about narrative
 * impact before producing Fountain output.
 */
export const SONNET_THINKING: ModelConfig = {
  model: MODELS.sonnet,
  label: 'Sonnet 4.5 (thinking)',
  maxTokens: 8192,
  thinking: { type: 'enabled', budget_tokens: 10_000 },
};

/**
 * Sonnet 4.5 standard — for fast tool-driven interactions.
 *
 * Used when the model needs good creative quality but without the
 * latency of thinking.  Suitable for inline edits where speed matters
 * and the changes are relatively contained.
 */
export const SONNET_STANDARD: ModelConfig = {
  model: MODELS.sonnet,
  label: 'Sonnet 4.5',
  maxTokens: 4096,
};

/**
 * Haiku 3.5 — fast utility model for mechanical tasks.
 *
 * Used for conversation summarization, simple read-only analysis,
 * and format validation where deep creative reasoning is unnecessary.
 */
export const HAIKU_STANDARD: ModelConfig = {
  model: MODELS.haiku,
  label: 'Haiku 3.5',
  maxTokens: 2048,
};

// ---------------------------------------------------------------------------
// Anthropic API parameter builder
// ---------------------------------------------------------------------------

/**
 * Build the model-specific parameters for an Anthropic API call.
 *
 * Returns an object that can be spread into `client.messages.create()`
 * or `client.messages.stream()`.  Handles the conditional inclusion of
 * the `thinking` parameter (only present when thinking is enabled).
 */
export function buildModelParams(config: ModelConfig): {
  model: string;
  max_tokens: number;
  thinking?: ThinkingConfig;
} {
  return {
    model: config.model,
    max_tokens: config.maxTokens,
    ...(config.thinking ? { thinking: config.thinking } : {}),
  };
}
