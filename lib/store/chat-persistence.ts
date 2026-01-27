// ---------------------------------------------------------------------------
// Chat Persistence -- IndexedDB abstraction for multi-session chat storage
// ---------------------------------------------------------------------------

import type { SerializedChatMessage } from './types';

// ---------------------------------------------------------------------------
// Types
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
// Constants
// ---------------------------------------------------------------------------

const DB_NAME = 'screenwriter_db';
const DB_VERSION = 1;
const STORE_NAME = 'chatSessions';

// ---------------------------------------------------------------------------
// SSR guard
// ---------------------------------------------------------------------------

function hasIndexedDB(): boolean {
  return typeof window !== 'undefined' && !!window.indexedDB;
}

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------

let _dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!hasIndexedDB()) {
    return Promise.reject(new Error('IndexedDB not available'));
  }

  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('projectId', 'projectId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      _dbPromise = null;
      reject(request.error);
    };
  });

  return _dbPromise;
}

// ---------------------------------------------------------------------------
// Helper: wrap IDBRequest in a Promise
// ---------------------------------------------------------------------------

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/** Load all sessions for a project (full data). */
export async function loadSessionsForProject(projectId: string): Promise<ChatSession[]> {
  if (!hasIndexedDB()) return [];
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('projectId');
    const sessions = await requestToPromise(index.getAll(projectId));
    return (sessions as ChatSession[]).sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

/** Load lightweight summaries for a project's sessions. */
export async function loadSessionSummaries(projectId: string): Promise<ChatSessionSummary[]> {
  const sessions = await loadSessionsForProject(projectId);
  return sessions.map((s) => ({
    id: s.id,
    name: s.name,
    messageCount: s.messages.length,
    parentChatId: s.parentChatId,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

/** Load a single session by ID. */
export async function loadSession(sessionId: string): Promise<ChatSession | null> {
  if (!hasIndexedDB()) return null;
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const result = await requestToPromise(store.get(sessionId));
    return (result as ChatSession) ?? null;
  } catch {
    return null;
  }
}

/** Save (create or update) a session. */
export async function saveSession(session: ChatSession): Promise<void> {
  if (!hasIndexedDB()) return;
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(session);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silently fail -- chat data is not critical path.
  }
}

/** Delete a single session by ID. */
export async function deleteSessionById(sessionId: string): Promise<void> {
  if (!hasIndexedDB()) return;
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(sessionId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silently fail.
  }
}

/** Delete all sessions for a project. */
export async function deleteSessionsForProject(projectId: string): Promise<void> {
  if (!hasIndexedDB()) return;
  try {
    const sessions = await loadSessionsForProject(projectId);
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const session of sessions) {
      store.delete(session.id);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silently fail.
  }
}
