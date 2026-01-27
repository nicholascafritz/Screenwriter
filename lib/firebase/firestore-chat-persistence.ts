// ---------------------------------------------------------------------------
// Firestore Chat Persistence -- CRUD for chat sessions (replaces IndexedDB)
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
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { SerializedChatMessage } from '@/lib/store/types';

// ---------------------------------------------------------------------------
// Types (mirroring chat-persistence.ts)
// ---------------------------------------------------------------------------

export interface ChatSession {
  id: string;
  projectId: string;
  name: string;
  messages: SerializedChatMessage[];
  parentChatId: string | null;
  parentMessageIndex: number | null;
  branchSummary: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ChatSessionSummary {
  id: string;
  name: string;
  messageCount: number;
  parentChatId: string | null;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Collection helpers
// ---------------------------------------------------------------------------

function sessionsCol(userId: string, projectId: string) {
  return collection(db, 'users', userId, 'projects', projectId, 'chatSessions');
}

function sessionDoc(userId: string, projectId: string, sessionId: string) {
  return doc(db, 'users', userId, 'projects', projectId, 'chatSessions', sessionId);
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export async function loadSessionsForProject(
  userId: string,
  projectId: string,
): Promise<ChatSession[]> {
  try {
    const q = query(sessionsCol(userId, projectId), orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        projectId,
        name: data.name,
        messages: data.messages ?? [],
        parentChatId: data.parentChatId ?? null,
        parentMessageIndex: data.parentMessageIndex ?? null,
        branchSummary: data.branchSummary ?? null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
  } catch {
    return [];
  }
}

export async function loadSessionSummaries(
  userId: string,
  projectId: string,
): Promise<ChatSessionSummary[]> {
  const sessions = await loadSessionsForProject(userId, projectId);
  return sessions.map((s) => ({
    id: s.id,
    name: s.name,
    messageCount: s.messages.length,
    parentChatId: s.parentChatId,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

export async function loadSession(
  userId: string,
  projectId: string,
  sessionId: string,
): Promise<ChatSession | null> {
  try {
    const snap = await getDoc(sessionDoc(userId, projectId, sessionId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      projectId,
      name: data.name,
      messages: data.messages ?? [],
      parentChatId: data.parentChatId ?? null,
      parentMessageIndex: data.parentMessageIndex ?? null,
      branchSummary: data.branchSummary ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function saveSession(
  userId: string,
  projectId: string,
  session: ChatSession,
): Promise<void> {
  try {
    await setDoc(sessionDoc(userId, projectId, session.id), {
      name: session.name,
      messages: session.messages,
      parentChatId: session.parentChatId,
      parentMessageIndex: session.parentMessageIndex,
      branchSummary: session.branchSummary,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  } catch {
    // Silently fail -- chat data is not critical path.
  }
}

export async function deleteSessionById(
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

export async function deleteSessionsForProject(
  userId: string,
  projectId: string,
): Promise<void> {
  try {
    const snapshot = await getDocs(sessionsCol(userId, projectId));
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch {
    // Silently fail.
  }
}
