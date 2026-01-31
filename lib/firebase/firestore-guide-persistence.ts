// ---------------------------------------------------------------------------
// Firestore Guide Session Persistence -- CRUD for AI Story Guide sessions
// ---------------------------------------------------------------------------

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuideMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface GuideSession {
  id: string;
  projectId: string;
  messages: GuideMessage[];
  guideContext?: {
    projectTitle?: string;
    genre?: string;
    logline?: string;
    notes?: string;
  };
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Collection helpers
// ---------------------------------------------------------------------------

function sessionsCol(userId: string, projectId: string) {
  return collection(db, 'users', userId, 'projects', projectId, 'guideSessions');
}

function sessionDoc(userId: string, projectId: string, sessionId: string) {
  return doc(db, 'users', userId, 'projects', projectId, 'guideSessions', sessionId);
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Load all guide sessions for a project, ordered by most recent first.
 */
export async function loadGuideSessions(
  userId: string,
  projectId: string,
): Promise<GuideSession[]> {
  try {
    const q = query(sessionsCol(userId, projectId), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        projectId,
        messages: data.messages ?? [],
        guideContext: data.guideContext ?? undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Load a specific guide session by ID.
 */
export async function loadGuideSession(
  userId: string,
  projectId: string,
  sessionId: string,
): Promise<GuideSession | null> {
  try {
    const snap = await getDoc(sessionDoc(userId, projectId, sessionId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      projectId,
      messages: data.messages ?? [],
      guideContext: data.guideContext ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Save (create or update) a guide session.
 */
export async function saveGuideSession(
  userId: string,
  projectId: string,
  session: GuideSession,
): Promise<void> {
  try {
    await setDoc(sessionDoc(userId, projectId, session.id), {
      messages: session.messages,
      guideContext: session.guideContext ?? null,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  } catch {
    // Silently fail -- guide data is not critical path.
  }
}

/**
 * Delete a guide session by ID.
 */
export async function deleteGuideSession(
  userId: string,
  projectId: string,
  sessionId: string,
): Promise<void> {
  try {
    await deleteDoc(sessionDoc(userId, projectId, sessionId));
  } catch {
    // Silently fail.
  }
}
