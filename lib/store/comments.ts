// ---------------------------------------------------------------------------
// Comments Store -- Zustand state management for inline comments
// ---------------------------------------------------------------------------
//
// PRIMITIVES ARCHITECTURE:
// The store exposes atomic primitives that can be composed by an orchestration
// layer. Direct cross-store calls are minimized. The key primitives are:
//
// - addCommentRaw(comment) — Add comment with explicit sceneId (no outline lookup)
// - addComment(comment) — Composed: requires orchestration to pass sceneId
// - reanchorCommentsRaw(oldContent, newContent, sceneIdLookup) — Reanchor with callback
// - reanchorComments(oldContent, newContent) — Backward compat (no sceneId update)
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { generateId } from '@/lib/utils';
import type { Comment } from './comment-types';
import { loadComments, saveComments, deleteCommentsForProject } from '@/lib/firebase/firestore-comment-persistence';
import { useProjectStore } from './project';

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

  // -- Primitive Actions (atomic, no cross-store calls) ---------------------

  /**
   * Add a comment with explicit sceneId. No outline store lookup.
   * Use this when the orchestration layer has already determined the sceneId.
   */
  addCommentRaw: (comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>) => void;

  /**
   * Reanchor comments with an optional sceneId lookup function.
   * This is the primitive that doesn't call outline store directly.
   * @param sceneIdLookup - Optional function to get sceneId for a line number
   */
  reanchorCommentsRaw: (
    oldContent: string,
    newContent: string,
    sceneIdLookup?: (line: number) => string | null,
  ) => void;

  // -- Composed Actions (may use primitives internally) ---------------------

  /** Add a new comment. SceneId should be provided by caller. */
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
  loadForProject: (projectId: string) => Promise<void>;

  /** Persist comments to storage. */
  persist: () => void;

  /** Delete all comments for a project. */
  deleteForProject: (projectId: string) => Promise<void>;

  /** Clear all in-memory state. */
  clear: () => void;

  /**
   * Re-anchor comments after the screenplay content changes.
   * Attempts to find the anchorText near the original line numbers
   * and update line positions accordingly.
   * NOTE: This is a backward-compat wrapper. Orchestration layer should
   * use reanchorCommentsRaw with a sceneIdLookup for full functionality.
   */
  reanchorComments: (oldContent: string, newContent: string) => void;

  /** Get all comments for a particular scene. */
  getCommentsForScene: (sceneId: string) => Comment[];
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

  // -- Primitive Actions ----------------------------------------------------

  addCommentRaw: (comment) => {
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

  reanchorCommentsRaw: (oldContent, newContent, sceneIdLookup) => {
    const { comments } = get();
    if (comments.length === 0) return;

    const newLines = newContent.split('\n');
    let changed = false;

    const updated = comments.map((comment) => {
      const newStart = findAnchorLine(newLines, comment.anchorText, comment.startLine);
      if (newStart !== null && newStart !== comment.startLine) {
        const delta = newStart - comment.startLine;
        const newStartLine = newStart;
        changed = true;
        return {
          ...comment,
          startLine: newStartLine,
          endLine: comment.endLine + delta,
          sceneId: sceneIdLookup ? sceneIdLookup(newStartLine) : comment.sceneId,
        };
      }
      return comment;
    });

    if (changed) {
      set({ comments: updated });
      schedulePersist();
    }
  },

  // -- Composed Actions -----------------------------------------------------

  addComment: (comment) => {
    // NOTE: sceneId should be provided by the caller (orchestration layer).
    // If not provided, it remains null/undefined.
    get().addCommentRaw(comment);
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

  loadForProject: async (projectId) => {
    const userId = useProjectStore.getState().userId;
    if (!userId) return;
    const comments = await loadComments(userId, projectId);
    set({ comments, projectId, activeCommentId: null });
  },

  persist: () => {
    const { projectId, comments } = get();
    if (!projectId) return;
    const userId = useProjectStore.getState().userId;
    if (!userId) return;
    // Fire-and-forget async write.
    saveComments(userId, projectId, comments);
  },

  deleteForProject: async (projectId) => {
    const userId = useProjectStore.getState().userId;
    if (!userId) return;
    await deleteCommentsForProject(userId, projectId);
  },

  clear: () => {
    set({ comments: [], activeCommentId: null, projectId: null });
  },

  reanchorComments: (oldContent, newContent) => {
    // NOTE: This backward-compat method doesn't update sceneIds.
    // The orchestration layer should use reanchorCommentsRaw with a
    // sceneIdLookup callback for full functionality.
    get().reanchorCommentsRaw(oldContent, newContent);
  },

  getCommentsForScene: (sceneId) => {
    return get().comments.filter((c) => c.sceneId === sceneId);
  },
}));
