// ---------------------------------------------------------------------------
// Todo Tools - Task tracking for multi-step agent work
// ---------------------------------------------------------------------------
//
// Provides a todo_write tool that allows the AI to create and update a task
// list visible to the user. This enables Claude Code-like progress tracking
// for complex multi-step operations.
// ---------------------------------------------------------------------------

import type { ToolDefinition, ToolResult } from './tools';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentTodo {
  /** Task description in imperative form (e.g., "Fix dialogue in scene 3") */
  content: string;
  /** Current status of the task */
  status: 'pending' | 'in_progress' | 'completed';
  /** Present progressive form shown during execution (e.g., "Fixing dialogue in scene 3...") */
  activeForm: string;
}

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

export const TODO_TOOLS: ToolDefinition[] = [
  {
    name: 'todo_write',
    description: `Create or update the task list for tracking progress on multi-step work. Use this tool when:
- The task requires 3 or more distinct steps
- You want to give the user visibility into your progress
- You're working on a complex operation that will take multiple tool calls

Do NOT use this tool for simple single-step tasks. Just execute those directly.

When using this tool:
- Create all todos upfront with 'pending' status
- Mark exactly ONE todo as 'in_progress' at a time (the one you're about to work on)
- Mark todos as 'completed' immediately after finishing each step
- Update the entire todo list each time (include all items, not just changes)`,
    input_schema: {
      type: 'object',
      properties: {
        todos: {
          type: 'array',
          description: 'The complete todo list (replaces any existing todos)',
          items: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'Task description in imperative form (e.g., "Add transition to scene 5")',
              },
              status: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed'],
                description: 'Current status: pending (not started), in_progress (working on it now), completed (done)',
              },
              activeForm: {
                type: 'string',
                description: 'Present progressive form shown during execution (e.g., "Adding transition to scene 5...")',
              },
            },
            required: ['content', 'status', 'activeForm'],
          },
        },
      },
      required: ['todos'],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool Execution
// ---------------------------------------------------------------------------

/**
 * Check if a tool name is a todo tool.
 */
export function isTodoToolName(name: string): boolean {
  return name === 'todo_write';
}

/**
 * Execute a todo tool call.
 * This is a pass-through - the actual state update happens client-side
 * when the tool call is received in the stream.
 */
export function executeTodoToolCall(
  name: string,
  input: Record<string, unknown>
): ToolResult {
  if (name !== 'todo_write') {
    return { result: `Unknown todo tool: ${name}` };
  }

  const todos = input.todos as AgentTodo[] | undefined;
  if (!todos || !Array.isArray(todos)) {
    return { result: 'Error: todos array is required' };
  }

  const completed = todos.filter((t) => t.status === 'completed').length;
  const inProgress = todos.find((t) => t.status === 'in_progress');
  const total = todos.length;

  let message = `Todo list updated: ${completed}/${total} complete.`;
  if (inProgress) {
    message += ` Currently: ${inProgress.activeForm}`;
  }

  return { result: message };
}
