// ---------------------------------------------------------------------------
// Scene ID Generator
// ---------------------------------------------------------------------------

import type { SceneId } from '@/lib/store/outline-types';

/**
 * Generate a new stable SceneId.
 *
 * Format: "sc_<13-char random>" — prefixed so SceneIds are instantly
 * recognisable in logs, Firestore documents, and debug output.
 */
export function generateSceneId(): SceneId {
  return `sc_${Math.random().toString(36).substring(2, 15)}`;
}
