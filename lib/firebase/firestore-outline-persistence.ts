// ---------------------------------------------------------------------------
// Firestore Outline Persistence -- single document per project
// ---------------------------------------------------------------------------

import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './config';
import type { Outline } from '@/lib/store/outline-types';

// ---------------------------------------------------------------------------
// Document helpers
// ---------------------------------------------------------------------------

function outlineDoc(userId: string, projectId: string) {
  return doc(db, 'users', userId, 'projects', projectId, 'outline', 'main');
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

export async function loadOutline(
  userId: string,
  projectId: string,
): Promise<Outline | null> {
  try {
    const snap = await getDoc(outlineDoc(userId, projectId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      projectId,
      scenes: data.scenes ?? [],
      acts: data.acts ?? [],
      sequences: data.sequences ?? [],
      updatedAt: data.updatedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export async function saveOutline(
  userId: string,
  projectId: string,
  outline: Outline,
): Promise<void> {
  try {
    await setDoc(outlineDoc(userId, projectId), {
      scenes: outline.scenes,
      acts: outline.acts,
      sequences: outline.sequences,
      updatedAt: outline.updatedAt,
    });
  } catch {
    // Silently fail.
  }
}

export async function deleteOutline(
  userId: string,
  projectId: string,
): Promise<void> {
  try {
    await deleteDoc(outlineDoc(userId, projectId));
  } catch {
    // Silently fail.
  }
}
