// ---------------------------------------------------------------------------
// Firestore Changelog Persistence -- CRUD for timeline entries
// ---------------------------------------------------------------------------

import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import type { TimelineEntry } from '@/lib/diff/types';

const MAX_ENTRIES_PER_PROJECT = 200;

// ---------------------------------------------------------------------------
// Collection helpers
// ---------------------------------------------------------------------------

function timelineCol(userId: string, projectId: string) {
  return collection(db, 'users', userId, 'projects', projectId, 'timeline');
}

function timelineDoc(userId: string, projectId: string, entryId: string) {
  return doc(db, 'users', userId, 'projects', projectId, 'timeline', entryId);
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export async function loadTimelineEntries(
  userId: string,
  projectId: string,
): Promise<TimelineEntry[]> {
  try {
    const q = query(
      timelineCol(userId, projectId),
      orderBy('timestamp', 'asc'),
      limit(MAX_ENTRIES_PER_PROJECT),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        timestamp: data.timestamp,
        source: data.source,
        description: data.description,
        diff: data.diff,
        sceneName: data.sceneName,
        affectedSceneIds: data.affectedSceneIds ?? undefined,
        undoable: data.undoable,
        projectId,
      } as TimelineEntry;
    });
  } catch {
    return [];
  }
}

export async function saveTimelineEntries(
  userId: string,
  projectId: string,
  entries: TimelineEntry[],
): Promise<void> {
  try {
    // Keep only the most recent entries.
    const trimmed = entries.length > MAX_ENTRIES_PER_PROJECT
      ? entries.slice(entries.length - MAX_ENTRIES_PER_PROJECT)
      : entries;

    const batch = writeBatch(db);

    // Delete existing entries first to avoid duplicates.
    const existing = await getDocs(timelineCol(userId, projectId));
    existing.docs.forEach((d) => batch.delete(d.ref));

    // Write new entries.
    for (const entry of trimmed) {
      const ref = timelineDoc(userId, projectId, entry.id);
      batch.set(ref, {
        timestamp: entry.timestamp,
        source: entry.source,
        description: entry.description,
        diff: entry.diff,
        sceneName: entry.sceneName ?? null,
        affectedSceneIds: entry.affectedSceneIds ?? null,
        undoable: entry.undoable,
      });
    }

    await batch.commit();
  } catch {
    // Silently fail.
  }
}

export async function deleteTimelineEntries(
  userId: string,
  projectId: string,
): Promise<void> {
  try {
    const snapshot = await getDocs(timelineCol(userId, projectId));
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch {
    // Silently fail.
  }
}
