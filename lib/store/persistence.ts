// ---------------------------------------------------------------------------
// Persistence -- localStorage CRUD wrapper for project data
// ---------------------------------------------------------------------------
//
// All reads/writes are guarded against SSR (no `window` on the server).
// Each project is stored as a separate key: `sw_project_<id>`.
// The project index is stored at `sw_project_index` as a JSON array of
// ProjectSummary objects, and the active project ID at `sw_active_project`.
// ---------------------------------------------------------------------------

import type { ProjectData, ProjectSummary } from './types';
import { parseFountain } from '@/lib/fountain/parser';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INDEX_KEY = 'sw_project_index';
const ACTIVE_KEY = 'sw_active_project';
const PROJECT_PREFIX = 'sw_project_';

// ---------------------------------------------------------------------------
// SSR guard
// ---------------------------------------------------------------------------

function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

// ---------------------------------------------------------------------------
// Active project ID
// ---------------------------------------------------------------------------

/** Get the ID of the currently active project, or `null` if none is set. */
export function getActiveProjectId(): string | null {
  if (!hasStorage()) return null;
  return localStorage.getItem(ACTIVE_KEY);
}

/** Set (or clear) the active project ID. */
export function setActiveProjectId(id: string | null): void {
  if (!hasStorage()) return;
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

// ---------------------------------------------------------------------------
// Project index (lightweight summaries)
// ---------------------------------------------------------------------------

/** Load all project summaries from the index. */
export function loadProjectIndex(): ProjectSummary[] {
  if (!hasStorage()) return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProjectSummary[];
  } catch {
    return [];
  }
}

/** Persist the full project index. */
function saveProjectIndex(index: ProjectSummary[]): void {
  if (!hasStorage()) return;
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

// ---------------------------------------------------------------------------
// Build a summary from full project data
// ---------------------------------------------------------------------------

function buildSummary(data: ProjectData): ProjectSummary {
  let pageCount = 0;
  let sceneCount = 0;
  try {
    const screenplay = parseFountain(data.content);
    pageCount = screenplay.pageCount ?? 0;
    sceneCount = screenplay.scenes?.length ?? 0;
  } catch {
    // Parsing may fail for empty or malformed content.
  }
  return {
    id: data.id,
    name: data.name,
    updatedAt: data.updatedAt,
    createdAt: data.createdAt,
    pageCount,
    sceneCount,
    status: data.status ?? 'outline',
    genre: data.genre ?? null,
    isFavorite: data.isFavorite ?? false,
    isArchived: data.isArchived ?? false,
  };
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/** Load a single project by ID. Returns `null` if not found. */
export function loadProject(id: string): ProjectData | null {
  if (!hasStorage()) return null;
  try {
    const raw = localStorage.getItem(PROJECT_PREFIX + id);
    if (!raw) return null;
    return JSON.parse(raw) as ProjectData;
  } catch {
    return null;
  }
}

/** Save (create or update) a project and refresh the index. */
export function saveProject(data: ProjectData): void {
  if (!hasStorage()) return;
  // Persist the full project data.
  localStorage.setItem(PROJECT_PREFIX + data.id, JSON.stringify(data));

  // Update the index.
  const index = loadProjectIndex();
  const summary = buildSummary(data);
  const existing = index.findIndex((p) => p.id === data.id);
  if (existing >= 0) {
    index[existing] = summary;
  } else {
    index.push(summary);
  }
  saveProjectIndex(index);
}

/** Delete a project by ID and remove it from the index. */
export function deleteProject(id: string): void {
  if (!hasStorage()) return;
  localStorage.removeItem(PROJECT_PREFIX + id);

  const index = loadProjectIndex().filter((p) => p.id !== id);
  saveProjectIndex(index);

  // If this was the active project, clear the active pointer.
  if (getActiveProjectId() === id) {
    setActiveProjectId(null);
  }
}

/**
 * Load all projects as full ProjectData objects.
 * Prefer `loadProjectIndex()` for the home-page grid; this is heavier.
 */
export function loadAllProjects(): ProjectData[] {
  const index = loadProjectIndex();
  const projects: ProjectData[] = [];
  for (const summary of index) {
    const data = loadProject(summary.id);
    if (data) projects.push(data);
  }
  return projects;
}
