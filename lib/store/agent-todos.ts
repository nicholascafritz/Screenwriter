// ---------------------------------------------------------------------------
// Agent Todos Store - State management for AI task tracking
// ---------------------------------------------------------------------------
//
// Zustand store that holds the current todo list from the AI agent.
// Used to display progress during multi-step operations.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import type { AgentTodo } from '../agent/todo-tools';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentTodoState {
  /** Current list of todos from the AI agent */
  todos: AgentTodo[];

  /** Whether the todo panel should be visible */
  isVisible: boolean;

  /** Whether we're waiting for user approval before execution starts */
  awaitingApproval: boolean;

  /** Whether the user is currently editing the plan */
  isEditing: boolean;

  /** Set the entire todo list (replaces existing) */
  setTodos: (todos: AgentTodo[]) => void;

  /** Clear all todos and hide the panel */
  clearTodos: () => void;

  /** Set visibility of the todo panel */
  setVisible: (visible: boolean) => void;

  /** Set whether we're awaiting user approval */
  setAwaitingApproval: (awaiting: boolean) => void;

  /** Approve the plan and start execution */
  approvePlan: () => void;

  /** Toggle edit mode for the plan */
  setEditing: (editing: boolean) => void;

  /** Update a single todo's content */
  updateTodo: (index: number, content: string) => void;

  /** Remove a todo from the list */
  removeTodo: (index: number) => void;

  /** Add a new todo to the list */
  addTodo: (content: string) => void;

  /** Move a todo up or down in the list */
  moveTodo: (index: number, direction: 'up' | 'down') => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAgentTodoStore = create<AgentTodoState>((set, get) => ({
  todos: [],
  isVisible: false,
  awaitingApproval: false,
  isEditing: false,

  setTodos: (todos) => {
    // Check if this is an initial plan (all todos are pending)
    const allPending = todos.length > 0 && todos.every((t) => t.status === 'pending');

    set({
      todos,
      isVisible: todos.length > 0,
      // If all todos are pending, this is a new plan - await approval
      awaitingApproval: allPending,
      isEditing: false,
    });
  },

  clearTodos: () => {
    set({
      todos: [],
      isVisible: false,
      awaitingApproval: false,
      isEditing: false,
    });
  },

  setVisible: (visible) => {
    set({ isVisible: visible });
  },

  setAwaitingApproval: (awaiting) => {
    set({ awaitingApproval: awaiting });
  },

  approvePlan: () => {
    set({ awaitingApproval: false, isEditing: false });
  },

  setEditing: (editing) => {
    set({ isEditing: editing });
  },

  updateTodo: (index, content) => {
    const { todos } = get();
    if (index < 0 || index >= todos.length) return;

    const newTodos = [...todos];
    newTodos[index] = {
      ...newTodos[index],
      content,
      // Auto-generate activeForm from content
      activeForm: content.replace(/^(\w)/, (_, c) => c.toLowerCase()) + '...',
    };
    set({ todos: newTodos });
  },

  removeTodo: (index) => {
    const { todos } = get();
    if (index < 0 || index >= todos.length) return;
    if (todos.length <= 1) return; // Keep at least one todo

    const newTodos = todos.filter((_, i) => i !== index);
    set({ todos: newTodos });
  },

  addTodo: (content) => {
    const { todos } = get();
    const newTodo: AgentTodo = {
      content,
      status: 'pending',
      activeForm: content.replace(/^(\w)/, (_, c) => c.toLowerCase()) + '...',
    };
    set({ todos: [...todos, newTodo] });
  },

  moveTodo: (index, direction) => {
    const { todos } = get();
    if (index < 0 || index >= todos.length) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= todos.length) return;

    const newTodos = [...todos];
    [newTodos[index], newTodos[newIndex]] = [newTodos[newIndex], newTodos[index]];
    set({ todos: newTodos });
  },
}));

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Get the currently in-progress todo, if any */
export function selectInProgressTodo(state: AgentTodoState): AgentTodo | undefined {
  return state.todos.find((t) => t.status === 'in_progress');
}

/** Get completion stats */
export function selectTodoStats(state: AgentTodoState): {
  completed: number;
  total: number;
  percent: number;
} {
  const { todos } = state;
  const completed = todos.filter((t) => t.status === 'completed').length;
  const total = todos.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { completed, total, percent };
}
