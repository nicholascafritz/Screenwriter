// ---------------------------------------------------------------------------
// Firestore Changelog Persistence -- CRUD for timeline entries
// ---------------------------------------------------------------------------
//
// Uses an append-only approach for efficiency:
// - New entries are appended with setDoc (single write)
// - Old entries are trimmed lazily in the background
// - No full-rewrite pattern that caused Firestore queue exhaustion
// ---------------------------------------------------------------------------

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from './config';
import type { TimelineEntry } from '@/lib/diff/types';

const MAX_ENTRIES_PER_PROJECT = 200;
const TRIM_THRESHOLD = 250; // Trigger trim when exceeding this count
const TRIM_TARGET = 180; // Trim down to this count (keeps some buffer)

// Track pending trims to avoid concurrent trim operations
let trimInProgress = false;

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

/**
 * Append a single timeline entry (efficient for incremental adds).
 * This is the preferred method during editing sessions.
 */
export async function appendTimelineEntry(
  userId: string,
  projectId: string,
  entry: TimelineEntry,
): Promise<void> {
  try {
    const ref = timelineDoc(userId, projectId, entry.id);
    await setDoc(ref, {
      timestamp: entry.timestamp,
      source: entry.source,
      description: entry.description,
      diff: entry.diff,
      sceneName: entry.sceneName ?? null,
      affectedSceneIds: entry.affectedSceneIds ?? null,
      undoable: entry.undoable,
    });

    // Check if we need to trim (lazy, non-blocking)
    scheduleTimelineTrim(userId, projectId);
  } catch (err) {
    console.warn('[Timeline] Failed to append entry:', err);
  }
}

/**
 * Schedule a background trim operation if the collection is too large.
 * Uses debouncing to avoid multiple concurrent trims.
 */
let trimDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleTimelineTrim(userId: string, projectId: string): void {
  // Debounce trim checks to avoid excessive count queries
  if (trimDebounceTimer) clearTimeout(trimDebounceTimer);

  trimDebounceTimer = setTimeout(async () => {
    trimDebounceTimer = null;
    if (trimInProgress) return;

    try {
      const countSnap = await getCountFromServer(timelineCol(userId, projectId));
      const count = countSnap.data().count;

      if (count > TRIM_THRESHOLD) {
        trimInProgress = true;
        await trimOldEntries(userId, projectId, count);
        trimInProgress = false;
      }
    } catch {
      // Ignore count/trim errors - not critical
      trimInProgress = false;
    }
  }, 5000); // Wait 5 seconds before checking/trimming
}

/**
 * Trim old entries to keep the collection under the limit.
 */
async function trimOldEntries(
  userId: string,
  projectId: string,
  currentCount: number,
): Promise<void> {
  const toDelete = currentCount - TRIM_TARGET;
  if (toDelete <= 0) return;

  try {
    // Get oldest entries to delete
    const q = query(
      timelineCol(userId, projectId),
      orderBy('timestamp', 'asc'),
      limit(toDelete),
    );
    const snapshot = await getDocs(q);

    // Delete in batches of 500 (Firestore limit)
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    console.debug(`[Timeline] Trimmed ${snapshot.docs.length} old entries`);
  } catch (err) {
    console.warn('[Timeline] Failed to trim old entries:', err);
  }
}

/**
 * Save multiple timeline entries at once (used for initial sync or bulk operations).
 * Uses batched writes but doesn't delete existing entries - just upserts.
 */
export async function saveTimelineEntries(
  userId: string,
  projectId: string,
  entries: TimelineEntry[],
): Promise<void> {
  if (entries.length === 0) return;

  try {
    // Keep only the most recent entries.
    const trimmed = entries.length > MAX_ENTRIES_PER_PROJECT
      ? entries.slice(entries.length - MAX_ENTRIES_PER_PROJECT)
      : entries;

    // Batch upsert entries (no deletion of existing)
    const batch = writeBatch(db);
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

    // Schedule trim check
    scheduleTimelineTrim(userId, projectId);
  } catch (err) {
    console.warn('[Timeline] Failed to save entries:', err);
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
