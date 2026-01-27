// ---------------------------------------------------------------------------
// Patch Transport -- Compact patch payloads for streaming tool results
// ---------------------------------------------------------------------------
//
// Wraps the diff engine to produce compact patch payloads that can be sent
// over the streaming API instead of the full screenplay text.  The client
// applies patches incrementally, dramatically reducing payload sizes.
//
// Usage:
//   import { computePatch } from '@/lib/diff/patch-transport';
//   const patch = computePatch(oldText, newText);
// ---------------------------------------------------------------------------

import { calculateDiff, generateSummary } from './engine';
import type { DiffHunk } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PatchPayload {
  /** Compact list of changed regions. */
  hunks: DiffHunk[];

  /** Human-readable summary of what changed. */
  summary: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a compact patch between the old and new screenplay text.
 * Returns null if the texts are identical (no change).
 *
 * @param oldText - The original screenplay text.
 * @param newText - The updated screenplay text.
 * @returns A {@link PatchPayload} with hunks and summary, or null if unchanged.
 */
export function computePatch(
  oldText: string,
  newText: string,
): PatchPayload | null {
  if (oldText === newText) {
    return null;
  }

  const diff = calculateDiff(oldText, newText);

  return {
    hunks: diff.hunks,
    summary: diff.summary || generateSummary(diff),
  };
}
