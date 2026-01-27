// ---------------------------------------------------------------------------
// Story Bible Persistence -- localStorage wrapper
// ---------------------------------------------------------------------------

import type { StoryBible } from './story-bible-types';

const BIBLE_PREFIX = 'sw_storybible_';

function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function loadStoryBible(projectId: string): StoryBible | null {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(BIBLE_PREFIX + projectId);
    if (!raw) return null;
    return JSON.parse(raw) as StoryBible;
  } catch {
    return null;
  }
}

export function saveStoryBible(bible: StoryBible): void {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(BIBLE_PREFIX + bible.projectId, JSON.stringify(bible));
  } catch {
    // localStorage may be full.
  }
}

export function deleteStoryBible(projectId: string): void {
  if (!hasStorage()) return;
  localStorage.removeItem(BIBLE_PREFIX + projectId);
}
