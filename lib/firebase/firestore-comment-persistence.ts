// ---------------------------------------------------------------------------
// Firestore Comment Persistence -- CRUD for inline comments
// ---------------------------------------------------------------------------

import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './config';
import type { Comment } from '@/lib/store/comment-types';

// ---------------------------------------------------------------------------
// Collection helpers
// ---------------------------------------------------------------------------

function commentsCol(userId: string, projectId: string) {
  return collection(db, 'users', userId, 'projects', projectId, 'comments');
}

function commentDoc(userId: string, projectId: string, commentId: string) {
  return doc(db, 'users', userId, 'projects', projectId, 'comments', commentId);
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export async function loadComments(
  userId: string,
  projectId: string,
): Promise<Comment[]> {
  try {
    const q = query(commentsCol(userId, projectId), orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        projectId,
        startLine: data.startLine,
        endLine: data.endLine,
        anchorText: data.anchorText,
        content: data.content,
        author: data.author,
        resolved: data.resolved,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        sceneId: data.sceneId ?? null,
      } as Comment;
    });
  } catch {
    return [];
  }
}

export async function saveComments(
  userId: string,
  projectId: string,
  comments: Comment[],
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Delete existing comments first.
    const existing = await getDocs(commentsCol(userId, projectId));
    existing.docs.forEach((d) => batch.delete(d.ref));

    // Write current comments.
    for (const comment of comments) {
      const ref = commentDoc(userId, projectId, comment.id);
      batch.set(ref, {
        startLine: comment.startLine,
        endLine: comment.endLine,
        anchorText: comment.anchorText,
        content: comment.content,
        author: comment.author,
        resolved: comment.resolved,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        sceneId: comment.sceneId ?? null,
      });
    }

    await batch.commit();
  } catch {
    // Silently fail.
  }
}

export async function deleteCommentsForProject(
  userId: string,
  projectId: string,
): Promise<void> {
  try {
    const snapshot = await getDocs(commentsCol(userId, projectId));
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch {
    // Silently fail.
  }
}
