// ---------------------------------------------------------------------------
// Firestore Persistence -- CRUD for project data (replaces localStorage)
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
import type { ProjectData, ProjectSummary } from '@/lib/store/types';
import { parseFountain } from '@/lib/fountain/parser';

// ---------------------------------------------------------------------------
// Collection helpers
// ---------------------------------------------------------------------------

function projectsCol(userId: string) {
  return collection(db, 'users', userId, 'projects');
}

function projectDoc(userId: string, projectId: string) {
  return doc(db, 'users', userId, 'projects', projectId);
}

// ---------------------------------------------------------------------------
// Build summary from full project data
// ---------------------------------------------------------------------------

function buildSummary(id: string, data: Record<string, unknown>): ProjectSummary {
  return {
    id,
    name: (data.name as string) ?? 'Untitled',
    updatedAt: (data.updatedAt as number) ?? Date.now(),
    createdAt: (data.createdAt as number) ?? Date.now(),
    pageCount: (data.pageCount as number) ?? 0,
    sceneCount: (data.sceneCount as number) ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Project index (list)
// ---------------------------------------------------------------------------

export async function loadProjectIndex(userId: string): Promise<ProjectSummary[]> {
  try {
    const q = query(projectsCol(userId), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => buildSummary(d.id, d.data()));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export async function loadProject(
  userId: string,
  projectId: string,
): Promise<ProjectData | null> {
  try {
    const snap = await getDoc(projectDoc(userId, projectId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      name: data.name,
      content: data.content,
      voiceId: data.voiceId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function saveProject(
  userId: string,
  data: ProjectData,
): Promise<void> {
  let pageCount = 0;
  let sceneCount = 0;
  try {
    const screenplay = parseFountain(data.content);
    pageCount = screenplay.pageCount ?? 0;
    sceneCount = screenplay.scenes?.length ?? 0;
  } catch {
    // Parsing may fail for empty or malformed content.
  }

  await setDoc(projectDoc(userId, data.id), {
    name: data.name,
    content: data.content,
    voiceId: data.voiceId,
    pageCount,
    sceneCount,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
}

export async function deleteProject(
  userId: string,
  projectId: string,
): Promise<void> {
  await deleteDoc(projectDoc(userId, projectId));
  // Note: subcollections (chatSessions, timeline, comments, storyBible)
  // must be deleted separately -- Firestore does not cascade deletes.
}
