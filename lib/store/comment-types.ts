// ---------------------------------------------------------------------------
// Comment Types -- Type definitions for the inline comment system
// ---------------------------------------------------------------------------

/**
 * An inline comment anchored to a line range in the screenplay.
 */
export interface Comment {
  /** Unique identifier. */
  id: string;

  /** Project this comment belongs to. */
  projectId: string;

  /** 1-based start line in the screenplay. */
  startLine: number;

  /** 1-based end line in the screenplay. */
  endLine: number;

  /** Snippet of text at the anchor point (for re-anchoring after edits). */
  anchorText: string;

  /** The comment text written by the user or AI. */
  content: string;

  /** Who created the comment. */
  author: 'user' | 'ai';

  /** Whether this comment has been resolved / addressed. */
  resolved: boolean;

  /** Unix timestamp (ms) when the comment was created. */
  createdAt: number;

  /** Unix timestamp (ms) of the last update. */
  updatedAt: number;

  /** Stable SceneId of the scene this comment is anchored within, or null. */
  sceneId: string | null;
}
