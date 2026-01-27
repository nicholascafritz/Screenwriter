// ---------------------------------------------------------------------------
// Comments Store -- Zustand state management for inline comments
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { generateId } from '@/lib/utils';
import type { Comment } from './comment-types';
import { loadComments, saveComments, deleteCommentsForProject } from './comment-persistence';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommentState {
  /** All comments for the current project. */
  comments: Comment[];

  /** The currently active (focused) comment ID, or null. */
  activeCommentId: string | null;

  /** The project these comments belong to. */
  projectId: string | null;

  // -- Actions --------------------------------------------------------------

  /** Add a new comment. */
  addComment: (comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>) => void;

  /** Update an existing comment's content. */
  updateComment: (id: string, content: string) => void;

  /** Mark a comment as resolved. */
  resolveComment: (id: string) => void;

  /** Unresolve a comment. */
  unresolveComment: (id: string) => void;

  /** Delete a comment. */
  deleteComment: (id: string) => void;

  /** Set the active (focused) comment. */
  setActiveComment: (id: string | null) => void;

  /** Load comments for a project from storage. */
  loadForProject: (projectId: string) => void;

  /** Persist comments to storage. */
  persist: () => void;

  /** Delete all comments for a project. */
  deleteForProject: (projectId: string) => void;

  /** Clear all in-memory state. */
  clear: () => void;

  /**
   * Re-anchor comments after the screenplay content changes.
   * Attempts to find the anchorText near the original line numbers
   * and update line positions accordingly.
   */
  reanchorComments: (oldContent: string, newContent: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Try to find `anchorText` near `hintLine` in `lines`.
 * Returns the new start line (1-based) or null if not found.
 */
function findAnchorLine(
  lines: string[],
  anchorText: string,
  hintLine: number,
  searchRadius: number = 20,
): number | null {
  const trimmedAnchor = anchorText.trim();
  if (!trimmedAnchor) return null;

  // Search near the hint line first, expanding outward.
  const start = Math.max(0, hintLine - 1 - searchRadius);
  const end = Math.min(lines.length, hintLine - 1 + searchRadius);

  for (let i = start; i < end; i++) {
    if (lines[i].includes(trimmedAnchor)) {
      return i + 1; // 1-based
    }
  }
  return null;
}

let _persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    useCommentStore.getState().persist();
  }, 500);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  activeCommentId: null,
  projectId: null,

  addComment: (comment) => {
    const now = Date.now();
    const newComment: Comment = {
      ...comment,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      comments: [...state.comments, newComment],
    }));
    schedulePersist();
  },

  updateComment: (id, content) => {
    set((state) => ({
      comments: state.comments.map((c) =>
        c.id === id ? { ...c, content, updatedAt: Date.now() } : c
      ),
    }));
    schedulePersist();
  },

  resolveComment: (id) => {
    set((state) => ({
      comments: state.comments.map((c) =>
        c.id === id ? { ...c, resolved: true, updatedAt: Date.now() } : c
      ),
    }));
    schedulePersist();
  },

  unresolveComment: (id) => {
    set((state) => ({
      comments: state.comments.map((c) =>
        c.id === id ? { ...c, resolved: false, updatedAt: Date.now() } : c
      ),
    }));
    schedulePersist();
  },

  deleteComment: (id) => {
    set((state) => ({
      comments: state.comments.filter((c) => c.id !== id),
      activeCommentId: state.activeCommentId === id ? null : state.activeCommentId,
    }));
    schedulePersist();
  },

  setActiveComment: (id) => {
    set({ activeCommentId: id });
  },

  loadForProject: (projectId) => {
    const comments = loadComments(projectId);
    set({ comments, projectId, activeCommentId: null });
  },

  persist: () => {
    const { projectId, comments } = get();
    if (!projectId) return;
    saveComments(projectId, comments);
  },

  deleteForProject: (projectId) => {
    deleteCommentsForProject(projectId);
  },

  clear: () => {
    set({ comments: [], activeCommentId: null, projectId: null });
  },

  reanchorComments: (oldContent, newContent) => {
    const { comments } = get();
    if (comments.length === 0) return;

    const newLines = newContent.split('\n');
    let changed = false;

    const updated = comments.map((comment) => {
      const newStart = findAnchorLine(newLines, comment.anchorText, comment.startLine);
      if (newStart !== null && newStart !== comment.startLine) {
        const delta = newStart - comment.startLine;
        changed = true;
        return {
          ...comment,
          startLine: newStart,
          endLine: comment.endLine + delta,
        };
      }
      return comment;
    });

    if (changed) {
      set({ comments: updated });
      schedulePersist();
    }
  },
}));
