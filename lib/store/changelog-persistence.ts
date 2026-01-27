// ---------------------------------------------------------------------------
// Changelog Persistence -- localStorage wrapper for timeline entries
// ---------------------------------------------------------------------------
//
// Stores timeline entries per-project in localStorage using the key pattern
// `sw_timeline_<projectId>`.  Entries are serialized as JSON arrays.
//
// We intentionally use localStorage (matching the project persistence pattern)
// rather than IndexedDB to avoid schema version conflicts with the chat
// persistence layer.  Timeline data is bounded (max 200 entries per project)
// so storage size is manageable.
// ---------------------------------------------------------------------------

import type { TimelineEntry } from '@/lib/diff/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIMELINE_PREFIX = 'sw_timeline_';
const MAX_ENTRIES_PER_PROJECT = 200;

// ---------------------------------------------------------------------------
// SSR guard
// ---------------------------------------------------------------------------

function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Load all timeline entries for a project, oldest first.
 */
export function loadTimelineEntries(projectId: string): TimelineEntry[] {
  if (!hasStorage()) return [];
  try {
    const raw = localStorage.getItem(TIMELINE_PREFIX + projectId);
    if (!raw) return [];
    return JSON.parse(raw) as TimelineEntry[];
  } catch {
    return [];
  }
}

/**
 * Save timeline entries for a project.
 * Automatically trims to the most recent MAX_ENTRIES_PER_PROJECT entries.
 */
export function saveTimelineEntries(projectId: string, entries: TimelineEntry[]): void {
  if (!hasStorage()) return;
  // Keep only the most recent entries to prevent localStorage bloat.
  const trimmed = entries.length > MAX_ENTRIES_PER_PROJECT
    ? entries.slice(entries.length - MAX_ENTRIES_PER_PROJECT)
    : entries;
  try {
    localStorage.setItem(TIMELINE_PREFIX + projectId, JSON.stringify(trimmed));
  } catch {
    // localStorage may be full -- silently fail.
  }
}

/**
 * Delete all timeline entries for a project.
 */
export function deleteTimelineEntries(projectId: string): void {
  if (!hasStorage()) return;
  localStorage.removeItem(TIMELINE_PREFIX + projectId);
}
