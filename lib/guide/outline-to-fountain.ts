// ---------------------------------------------------------------------------
// Outline to Fountain Converter
// ---------------------------------------------------------------------------
//
// Converts a SceneOutlineEntry[] into a Fountain screenplay skeleton with
// scene headings, brief action lines, and beat reference notes.
// ---------------------------------------------------------------------------

import type { SceneOutlineEntry } from '@/lib/store/story-bible-types';

/**
 * Convert a scene outline into Fountain-formatted screenplay skeleton text.
 *
 * Each scene becomes:
 *   - A scene heading (e.g., INT. OFFICE - DAY)
 *   - The summary as an action line
 *   - A Fountain note with the beat reference (if provided)
 *
 * @param title    - The project title for the title page.
 * @param entries  - The scene outline entries from the guide.
 * @returns Fountain-formatted text ready for the editor.
 */
export function outlineToFountain(
  title: string,
  entries: SceneOutlineEntry[],
): string {
  const lines: string[] = [];

  // Title page.
  lines.push(`Title: ${title}`);
  lines.push(`Draft date: ${new Date().toLocaleDateString()}`);
  lines.push('');

  // Scenes.
  for (const entry of entries) {
    lines.push(entry.heading);
    lines.push('');
    lines.push(entry.summary);
    lines.push('');
    if (entry.beat) {
      lines.push(`[[Beat: ${entry.beat}]]`);
      lines.push('');
    }
  }

  return lines.join('\n');
}
