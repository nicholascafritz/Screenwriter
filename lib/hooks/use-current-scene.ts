'use client';

// ---------------------------------------------------------------------------
// useCurrentScene -- Get the scene at the current cursor position
// ---------------------------------------------------------------------------
//
// Provides the OutlineEntry (and related data) for the scene that contains
// the current cursor line. Replaces repeated pattern in OutlinePanel,
// StatusBar, CommentsPanel, etc.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { useEditorStore } from '@/lib/store/editor';
import { useOutlineStore } from '@/lib/store/outline';
import type { OutlineEntry } from '@/lib/store/outline-types';

export interface CurrentSceneInfo {
  /** The outline entry for the current scene, or null. */
  entry: OutlineEntry | null;
  /** The scene ID, or null. */
  sceneId: string | null;
  /** Index of the scene in the outline (0-based), or -1. */
  sceneIndex: number;
}

/**
 * Returns information about the scene at the current cursor position.
 */
export function useCurrentScene(): CurrentSceneInfo {
  const cursorLine = useEditorStore((s) => s.cursorLine);
  const entries = useOutlineStore((s) => s.outline?.scenes ?? []);

  return useMemo(() => {
    if (entries.length === 0) {
      return { entry: null, sceneId: null, sceneIndex: -1 };
    }

    // Find the scene that contains the cursor line.
    // Walk backwards to find the most recent scene heading before cursor.
    for (let i = entries.length - 1; i >= 0; i--) {
      const range = entries[i].fountainRange;
      if (range && cursorLine >= range.startLine) {
        return {
          entry: entries[i],
          sceneId: entries[i].id,
          sceneIndex: i,
        };
      }
    }

    // Fall back to first drafted scene if cursor is before any scene.
    const firstDrafted = entries.find((e) => e.fountainRange !== null);
    if (firstDrafted) {
      const idx = entries.indexOf(firstDrafted);
      return {
        entry: firstDrafted,
        sceneId: firstDrafted.id,
        sceneIndex: idx,
      };
    }

    return { entry: null, sceneId: null, sceneIndex: -1 };
  }, [entries, cursorLine]);
}

/**
 * Returns just the scene ID at the current cursor position.
 * Lighter-weight version when you don't need the full entry.
 */
export function useCurrentSceneId(): string | null {
  const { sceneId } = useCurrentScene();
  return sceneId;
}
