// ---------------------------------------------------------------------------
// AI Model Router
// ---------------------------------------------------------------------------
//
// Intelligent routing layer that selects the optimal model configuration
// for each task based on its cognitive demands.  The router implements a
// three-tier strategy:
//
//   Opus   — Strategic: planning, high-level creative direction, brainstorming
//   Sonnet — Creative:  screenplay writing, scene editing, dialogue, execution
//   Haiku  — Utility:   summarization, compression, simple analysis
//
// Within each tier, extended thinking is enabled when the task benefits
// from deliberation (e.g., writing new scenes, planning multi-step edits)
// and disabled when conversational speed matters (e.g., brainstorming,
// quick inline changes, summarization).
//
// Usage:
//   import { getModelForTask } from '@/lib/ai/model-router';
//   const config = getModelForTask('agent-plan');
//   const params = buildModelParams(config);
// ---------------------------------------------------------------------------

import {
  type ModelConfig,
  OPUS_THINKING,
  OPUS_STANDARD,
  SONNET_THINKING,
  SONNET_STANDARD,
  HAIKU_STANDARD,
} from './models';

// ---------------------------------------------------------------------------
// Task taxonomy
// ---------------------------------------------------------------------------

/**
 * Every distinct task context the router understands.
 *
 * Each value maps to a specific model + thinking configuration based on
 * the cognitive profile of the task:
 *
 *  Strategic tasks (Opus):
 *    - `agent-plan`         Complex multi-step planning with reasoning
 *    - `writers-room`       Opinionated creative analysis and brainstorming
 *
 *  Creative tasks (Sonnet + thinking):
 *    - `screenplay-write`   Writing or heavily editing scene content
 *    - `diff-review`        Proposing changes with creative rationale
 *    - `agent-execute`      Executing planned steps (writing + tool use)
 *
 *  Fast creative tasks (Sonnet standard):
 *    - `inline-edit`        Quick, contained inline edits
 *
 *  Utility tasks (Haiku):
 *    - `summarize`          Conversation summarization / compaction
 */
export type TaskType =
  | 'agent-plan'
  | 'agent-execute'
  | 'writers-room'
  | 'story-guide'
  | 'screenplay-write'
  | 'diff-review'
  | 'inline-edit'
  | 'summarize'
  | 'generate-title';

// ---------------------------------------------------------------------------
// Routing table
// ---------------------------------------------------------------------------

/**
 * The core routing table.  Maps each task type to a model configuration.
 *
 * Design rationale for each assignment:
 *
 * | Task              | Model             | Thinking | Why                                    |
 * |-------------------|-------------------|----------|----------------------------------------|
 * | agent-plan        | Opus 4.5          | Yes      | Deep strategic reasoning needed         |
 * | writers-room      | Opus 4.5          | No       | Conversational speed, top-tier quality  |
 * | story-guide       | Opus 4.5          | No       | Conversational guide, top-tier quality  |
 * | screenplay-write  | Sonnet 4.5        | Yes      | Creative writing benefits from thought  |
 * | diff-review       | Sonnet 4.5        | Yes      | Needs reasoning about change rationale  |
 * | agent-execute     | Sonnet 4.5        | Yes      | Writing + tool use in execution steps   |
 * | inline-edit       | Sonnet 4.5        | No       | Speed-sensitive, contained changes      |
 * | summarize         | Haiku 3.5         | No       | Mechanical compression, cost-efficient  |
 * | generate-title    | Haiku 3.5         | No       | Short title generation, fast + cheap    |
 */
const ROUTING_TABLE: Record<TaskType, ModelConfig> = {
  'agent-plan':       OPUS_STANDARD,      // Temporarily disabled thinking due to API errors
  'writers-room':     OPUS_STANDARD,
  'story-guide':      OPUS_STANDARD,
  'screenplay-write': SONNET_STANDARD,    // Temporarily disabled thinking due to API errors
  'diff-review':      SONNET_STANDARD,    // Temporarily disabled thinking due to API errors
  'agent-execute':    SONNET_STANDARD,    // Temporarily disabled thinking due to API errors
  'inline-edit':      SONNET_STANDARD,
  'summarize':        HAIKU_STANDARD,
  'generate-title':   HAIKU_STANDARD,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Select the optimal model configuration for a given task.
 *
 * @param task - The task type from the {@link TaskType} taxonomy.
 * @returns The {@link ModelConfig} to use for this task.
 */
export function getModelForTask(task: TaskType): ModelConfig {
  return ROUTING_TABLE[task];
}

/**
 * Map a chat mode to the corresponding task type.
 *
 * Chat modes are user-facing concepts (inline, diff, writers-room).
 * This function translates them into the internal task taxonomy used
 * by the model router.
 *
 * @param mode - The chat mode from the UI.
 * @returns The task type to use for model selection.
 */
export function chatModeToTask(
  mode: 'inline' | 'diff' | 'writers-room' | 'story-guide',
): TaskType {
  switch (mode) {
    case 'inline':
      return 'inline-edit';
    case 'diff':
      return 'diff-review';
    case 'writers-room':
      return 'writers-room';
    case 'story-guide':
      return 'story-guide';
  }
}

/**
 * Return a human-readable description of why a particular model was
 * selected for a task.  Useful for logging and debugging.
 *
 * @param task - The task type.
 * @returns A short explanation string.
 */
export function explainRouting(task: TaskType): string {
  const config = ROUTING_TABLE[task];
  const thinking = config.thinking ? ' with extended thinking' : '';

  switch (task) {
    case 'agent-plan':
      return `Using ${config.label}${thinking} for complex multi-step planning — ` +
        `deepest reasoning ensures high-quality task decomposition.`;
    case 'writers-room':
      return `Using ${config.label} for creative brainstorming — ` +
        `top-tier analytical quality at conversational speed.`;
    case 'story-guide':
      return `Using ${config.label} for story development guide — ` +
        `top-tier conversational quality for guided story building.`;
    case 'screenplay-write':
      return `Using ${config.label}${thinking} for screenplay writing — ` +
        `deliberate creative process produces better prose and dialogue.`;
    case 'diff-review':
      return `Using ${config.label}${thinking} for diff review — ` +
        `reasoning through change rationale before proposing edits.`;
    case 'agent-execute':
      return `Using ${config.label}${thinking} for plan execution — ` +
        `creative writing with tool coordination benefits from deliberation.`;
    case 'inline-edit':
      return `Using ${config.label} for inline editing — ` +
        `fast, responsive edits for contained changes.`;
    case 'summarize':
      return `Using ${config.label} for summarization — ` +
        `efficient text compression at minimal cost.`;
    case 'generate-title':
      return `Using ${config.label} for title generation — ` +
        `fast, cheap short-text generation.`;
  }
}
