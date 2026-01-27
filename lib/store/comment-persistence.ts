// ---------------------------------------------------------------------------
// Comment Persistence -- localStorage wrapper for comment data
// ---------------------------------------------------------------------------

import type { Comment } from './comment-types';

const COMMENT_PREFIX = 'sw_comments_';

function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function loadComments(projectId: string): Comment[] {
  if (!hasStorage()) return [];
  try {
    const raw = localStorage.getItem(COMMENT_PREFIX + projectId);
    if (!raw) return [];
    return JSON.parse(raw) as Comment[];
  } catch {
    return [];
  }
}

export function saveComments(projectId: string, comments: Comment[]): void {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(COMMENT_PREFIX + projectId, JSON.stringify(comments));
  } catch {
    // localStorage may be full.
  }
}

export function deleteCommentsForProject(projectId: string): void {
  if (!hasStorage()) return;
  localStorage.removeItem(COMMENT_PREFIX + projectId);
}
