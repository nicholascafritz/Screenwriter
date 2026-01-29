// ---------------------------------------------------------------------------
// Question Tools - AI clarifying questions for ambiguous tasks
// ---------------------------------------------------------------------------
//
// Provides an ask_question tool that allows the AI to present clarifying
// questions with selectable options before proceeding. This enables Claude
// Code-like interaction where the AI pauses to gather user input.
// ---------------------------------------------------------------------------

import type { ToolDefinition, ToolResult } from './tools';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestionOption {
  /** Unique identifier for this option */
  id: string;
  /** Short label displayed on the chip (e.g., "Thriller", "Romance") */
  label: string;
  /** Optional longer description explaining this option */
  description?: string;
}

export interface AgentQuestion {
  /** Unique identifier for this question */
  id: string;
  /** Short header/category label (e.g., "Genre", "Tone", "Character Focus") */
  header: string;
  /** The full question text */
  question: string;
  /** Available options to choose from */
  options: QuestionOption[];
  /** Whether user can select multiple options */
  multiSelect?: boolean;
  /** Whether to show a freeform text input for custom answers */
  allowCustom?: boolean;
  /** Placeholder text for custom input field */
  customPlaceholder?: string;
}

export interface QuestionResponse {
  /** The question ID being responded to */
  questionId: string;
  /** Selected option IDs */
  selectedIds: string[];
  /** Selected option labels (for display in conversation) */
  selectedLabels: string[];
  /** Custom text input if provided */
  customText?: string;
}

// ---------------------------------------------------------------------------
// Tool Definition
// ---------------------------------------------------------------------------

export const QUESTION_TOOLS: ToolDefinition[] = [
  {
    name: 'ask_question',
    description: `Ask the user a clarifying question with selectable options before proceeding with a task.

Use this tool when:
- The request is ambiguous and has multiple valid interpretations
- You need to know the user's preference between distinct creative approaches
- The task has significant implications (e.g., major rewrites) and you want to confirm direction
- Understanding the user's vision would lead to better results

Do NOT use this tool when:
- The intent is clear from context or previous conversation
- Only one reasonable approach exists
- The question is trivial and won't meaningfully affect the outcome
- You're already in the middle of executing a plan

Keep questions focused and options distinct. 2-4 options is ideal.`,
    input_schema: {
      type: 'object',
      properties: {
        header: {
          type: 'string',
          description: 'Short category label (2-4 words, e.g., "Scene Tone", "Character Arc", "Dialogue Style")',
        },
        question: {
          type: 'string',
          description: 'The full question to ask the user. Be specific about why this matters for the task.',
        },
        options: {
          type: 'array',
          description: 'Selectable options (2-4 recommended). Put the recommended option first.',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Unique identifier (lowercase, no spaces)',
              },
              label: {
                type: 'string',
                description: 'Short label for the chip (1-4 words)',
              },
              description: {
                type: 'string',
                description: 'Brief explanation of what this option means for the screenplay',
              },
            },
            required: ['id', 'label'],
          },
        },
        multiSelect: {
          type: 'boolean',
          description: 'Allow selecting multiple options. Defaults to false.',
        },
        allowCustom: {
          type: 'boolean',
          description: 'Show a text input for custom answers. Defaults to true.',
        },
        customPlaceholder: {
          type: 'string',
          description: 'Placeholder for custom input (default: "Or describe something else...")',
        },
      },
      required: ['header', 'question', 'options'],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool Execution
// ---------------------------------------------------------------------------

/**
 * Check if a tool name is a question tool.
 */
export function isQuestionToolName(name: string): boolean {
  return name === 'ask_question';
}

/**
 * Execute a question tool call.
 * This is a pass-through - the actual UI display and response handling
 * happens client-side.
 */
export function executeQuestionToolCall(
  name: string,
  input: Record<string, unknown>
): ToolResult {
  if (name !== 'ask_question') {
    return { result: `Unknown question tool: ${name}` };
  }

  const header = input.header as string | undefined;
  const question = input.question as string | undefined;
  const options = input.options as QuestionOption[] | undefined;

  if (!header || !question || !options || !Array.isArray(options) || options.length === 0) {
    return { result: 'Error: header, question, and non-empty options array are required' };
  }

  // Return a placeholder - the real response comes from user interaction
  return {
    result: `[Waiting for user response to: "${question}"]`,
  };
}

/**
 * Format a question response for inclusion in the conversation.
 */
export function formatQuestionResponse(response: QuestionResponse): string {
  const parts: string[] = [];

  if (response.selectedLabels.length > 0) {
    parts.push(`Selected: ${response.selectedLabels.join(', ')}`);
  }

  if (response.customText) {
    parts.push(`Custom input: "${response.customText}"`);
  }

  return parts.join('. ') || 'No selection made';
}
