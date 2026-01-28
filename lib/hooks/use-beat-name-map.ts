'use client';

// ---------------------------------------------------------------------------
// useBeatNameMap -- Memoized beat ID to name lookup
// ---------------------------------------------------------------------------
//
// Provides a Map<beatId, beatName> from the Story Bible beat sheet.
// Replaces the repeated useMemo pattern found in multiple components.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { useStoryBibleStore } from '@/lib/store/story-bible';

/**
 * Returns a memoized Map from beat ID to beat name.
 * Returns an empty Map if no beat sheet is loaded.
 */
export function useBeatNameMap(): Map<string, string> {
  const beatSheet = useStoryBibleStore((s) => s.bible?.beatSheet);

  return useMemo(() => {
    const map = new Map<string, string>();
    if (!beatSheet) return map;
    for (const beat of beatSheet) {
      map.set(beat.id, beat.beat);
    }
    return map;
  }, [beatSheet]);
}

/**
 * Returns the name for a specific beat ID, or undefined if not found.
 */
export function useBeatName(beatId: string | null | undefined): string | undefined {
  const beatNameMap = useBeatNameMap();
  return beatId ? beatNameMap.get(beatId) : undefined;
}
