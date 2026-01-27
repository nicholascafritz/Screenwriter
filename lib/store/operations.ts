// ---------------------------------------------------------------------------
// Operations Store -- Tracks AI tool operations in progress
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { generateId } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OperationStatus = 'running' | 'completed' | 'error';

export interface Operation {
  id: string;
  toolName: string;
  description: string;
  status: OperationStatus;
  affectedLines?: { start: number; end: number };
  sceneName?: string;
  createdAt: number;
  completedAt?: number;
}

export interface OperationsState {
  operations: Operation[];
  isAIActive: boolean;

  /** Start a new operation. Returns the operation ID. */
  startOperation: (toolName: string, description: string, sceneName?: string) => string;

  /** Mark an operation as completed with optional affected line range. */
  completeOperation: (id: string, affectedLines?: { start: number; end: number }) => void;

  /** Mark an operation as errored. */
  failOperation: (id: string) => void;

  /** Set whether AI is actively processing. */
  setAIActive: (active: boolean) => void;

  /** Clear all operations (call when AI finishes a full response). */
  clearOperations: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useOperationsStore = create<OperationsState>((set, get) => ({
  operations: [],
  isAIActive: false,

  startOperation: (toolName, description, sceneName) => {
    const id = generateId();
    const op: Operation = {
      id,
      toolName,
      description,
      status: 'running',
      sceneName,
      createdAt: Date.now(),
    };
    set((state) => ({ operations: [...state.operations, op] }));
    return id;
  },

  completeOperation: (id, affectedLines) => {
    set((state) => ({
      operations: state.operations.map((op) =>
        op.id === id
          ? { ...op, status: 'completed' as OperationStatus, completedAt: Date.now(), affectedLines }
          : op
      ),
    }));
  },

  failOperation: (id) => {
    set((state) => ({
      operations: state.operations.map((op) =>
        op.id === id
          ? { ...op, status: 'error' as OperationStatus, completedAt: Date.now() }
          : op
      ),
    }));
  },

  setAIActive: (active) => {
    set({ isAIActive: active });
    if (!active) {
      // Auto-clear completed operations after a delay.
      setTimeout(() => {
        const { operations, isAIActive } = get();
        if (!isAIActive) {
          set({ operations: operations.filter((op) => op.status === 'running') });
        }
      }, 3000);
    }
  },

  clearOperations: () => {
    set({ operations: [], isAIActive: false });
  },
}));
