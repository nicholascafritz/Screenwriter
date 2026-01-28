// ---------------------------------------------------------------------------
// Stable Selector Utilities
// ---------------------------------------------------------------------------
//
// These constants provide stable references for Zustand selectors to avoid
// infinite render loops. When using fallback values like `?? []` in selectors,
// a new array is created on every render, causing React to re-render infinitely.
//
// Instead of: const scenes = useStore((s) => s.outline?.scenes ?? []);
// Use:        const scenes = useStore((s) => s.outline?.scenes ?? EMPTY_SCENES);
// ---------------------------------------------------------------------------

import type { OutlineEntry } from './outline-types';

/** Stable empty array for scene selectors. Never mutate this. */
export const EMPTY_SCENES: readonly OutlineEntry[] = Object.freeze([]);

/** Stable empty array for generic selectors. Never mutate this. */
export const EMPTY_ARRAY: readonly never[] = Object.freeze([]);
