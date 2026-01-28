// ---------------------------------------------------------------------------
// Outline to Fountain Converter
// ---------------------------------------------------------------------------
//
// PRIMITIVES ARCHITECTURE:
// Provides composable building blocks for Fountain export:
// - sceneToFountain(entry, options) — Convert single scene to Fountain
// - titlePageToFountain(metadata) — Generate title page block
// - outlineToFountain(title, entries, beatNameMap) — Composed full export
// ---------------------------------------------------------------------------

import type { OutlineEntry } from '@/lib/store/outline-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SceneExportOptions {
  /** Map from beat ID → beat display name. */
  beatNameMap?: Map<string, string>;
  /** Whether to include beat notes. Default: true */
  includeBeatNotes?: boolean;
  /** Whether to include summary as action. Default: true */
  includeSummary?: boolean;
}

export interface TitlePageMetadata {
  title: string;
  credit?: string;
  author?: string;
  draftDate?: string;
  contact?: string;
  source?: string;
}

// ---------------------------------------------------------------------------
// Primitives (Building Blocks)
// ---------------------------------------------------------------------------

/**
 * Convert a single outline entry to Fountain format.
 * This is the atomic building block for export.
 */
export function sceneToFountain(
  entry: OutlineEntry,
  options: SceneExportOptions = {},
): string {
  const {
    beatNameMap,
    includeBeatNotes = true,
    includeSummary = true,
  } = options;

  const lines: string[] = [];

  // Scene heading
  lines.push(entry.heading || 'INT. UNTITLED - DAY');
  lines.push('');

  // Summary as action line
  if (includeSummary && entry.summary) {
    lines.push(entry.summary);
    lines.push('');
  }

  // Beat reference note
  if (includeBeatNotes) {
    const beatName = entry.beatId ? beatNameMap?.get(entry.beatId) : undefined;
    if (beatName) {
      lines.push(`[[Beat: ${beatName}]]`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Generate a Fountain title page block.
 */
export function titlePageToFountain(metadata: TitlePageMetadata): string {
  const lines: string[] = [];

  lines.push(`Title: ${metadata.title}`);
  if (metadata.credit) lines.push(`Credit: ${metadata.credit}`);
  if (metadata.author) lines.push(`Author: ${metadata.author}`);
  lines.push(`Draft date: ${metadata.draftDate || new Date().toLocaleDateString()}`);
  if (metadata.contact) lines.push(`Contact: ${metadata.contact}`);
  if (metadata.source) lines.push(`Source: ${metadata.source}`);
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Composed Export
// ---------------------------------------------------------------------------

/**
 * Convert a scene outline into Fountain-formatted screenplay skeleton text.
 *
 * Each scene becomes:
 *   - A scene heading (e.g., INT. OFFICE - DAY)
 *   - The summary as an action line
 *   - A Fountain note with the beat reference (if provided)
 *
 * @param title        - The project title for the title page.
 * @param entries      - The outline entries from the persistent Outline store.
 * @param beatNameMap  - Optional map from beat ID → beat display name.
 * @returns Fountain-formatted text ready for the editor.
 */
export function outlineToFountain(
  title: string,
  entries: OutlineEntry[],
  beatNameMap?: Map<string, string>,
): string {
  const parts: string[] = [];

  // Title page using primitive
  parts.push(titlePageToFountain({ title }));

  // Scenes using primitive
  for (const entry of entries) {
    parts.push(sceneToFountain(entry, { beatNameMap }));
  }

  return parts.join('');
}

/**
 * Export selected scenes (by SceneId) to Fountain format.
 * Useful for partial exports.
 */
export function selectedScenesToFountain(
  entries: OutlineEntry[],
  selectedIds: Set<string>,
  options: SceneExportOptions = {},
): string {
  const parts: string[] = [];

  for (const entry of entries) {
    if (selectedIds.has(entry.id)) {
      parts.push(sceneToFountain(entry, options));
    }
  }

  return parts.join('');
}
