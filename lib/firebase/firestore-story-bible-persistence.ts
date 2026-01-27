// ---------------------------------------------------------------------------
// Firestore Story Bible Persistence -- single document per project
// ---------------------------------------------------------------------------

import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './config';
import type { StoryBible } from '@/lib/store/story-bible-types';

// ---------------------------------------------------------------------------
// Document helpers
// ---------------------------------------------------------------------------

function bibleDoc(userId: string, projectId: string) {
  return doc(db, 'users', userId, 'projects', projectId, 'storyBible', 'main');
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export async function loadStoryBible(
  userId: string,
  projectId: string,
): Promise<StoryBible | null> {
  try {
    const snap = await getDoc(bibleDoc(userId, projectId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      projectId,
      genre: data.genre ?? '',
      tone: data.tone ?? '',
      themes: data.themes ?? [],
      logline: data.logline ?? '',
      synopsis: data.synopsis ?? '',
      characters: data.characters ?? [],
      locations: data.locations ?? [],
      beatSheet: data.beatSheet ?? [],
      customNotes: data.customNotes ?? '',
      updatedAt: data.updatedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export async function saveStoryBible(
  userId: string,
  projectId: string,
  bible: StoryBible,
): Promise<void> {
  try {
    await setDoc(bibleDoc(userId, projectId), {
      genre: bible.genre,
      tone: bible.tone,
      themes: bible.themes,
      logline: bible.logline,
      synopsis: bible.synopsis,
      characters: bible.characters,
      locations: bible.locations,
      beatSheet: bible.beatSheet,
      customNotes: bible.customNotes,
      updatedAt: bible.updatedAt,
    });
  } catch {
    // Silently fail.
  }
}

export async function deleteStoryBible(
  userId: string,
  projectId: string,
): Promise<void> {
  try {
    await deleteDoc(bibleDoc(userId, projectId));
  } catch {
    // Silently fail.
  }
}
