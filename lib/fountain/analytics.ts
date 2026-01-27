// ---------------------------------------------------------------------------
// Fountain Screenplay Format -- Analytics
// ---------------------------------------------------------------------------
//
// Extracts quantitative metrics from a parsed Screenplay AST: page count,
// character lists, location lists, dialogue-to-action ratio, per-character
// dialogue counts, and more.
//
// Usage:
//   import { analyzeScreenplay } from '@/lib/fountain/analytics';
//   const stats = analyzeScreenplay(screenplay);
// ---------------------------------------------------------------------------

import type { Screenplay, ScriptElement, ScreenplayAnalytics } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Industry-standard lines per page for screenplay formatting. */
const LINES_PER_PAGE = 56;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyse a parsed {@link Screenplay} and return a comprehensive set of
 * quantitative metrics.
 */
export function analyzeScreenplay(
  screenplay: Screenplay,
): ScreenplayAnalytics {
  const { elements, scenes } = screenplay;

  const dialogueCount = countByType(elements, 'dialogue');
  const actionCount = countByType(elements, 'action');
  const lineCount = estimateLineCount(elements);
  const pageCount = Math.max(1, Math.ceil(lineCount / LINES_PER_PAGE));

  const characters = extractUniqueCharacters(elements);
  const locations = extractUniqueLocations(screenplay);
  const characterDialogueCounts = buildCharacterDialogueCounts(elements);

  return {
    pageCount,
    sceneCount: scenes.length,
    characters,
    locations,
    elementCount: elements.length,
    dialogueCount,
    actionCount,
    dialogueToActionRatio:
      actionCount > 0 ? dialogueCount / actionCount : 0,
    lineCount,
    characterDialogueCounts,
  };
}

// ---------------------------------------------------------------------------
// Convenience accessors
// ---------------------------------------------------------------------------

/**
 * Estimate the page count from raw elements.
 *
 * Uses the standard approximation of {@link LINES_PER_PAGE} formatted
 * lines per page.
 */
export function getPageCount(elements: ScriptElement[]): number {
  return Math.max(1, Math.ceil(estimateLineCount(elements) / LINES_PER_PAGE));
}

/**
 * Return a sorted list of unique character names.
 */
export function getCharacters(elements: ScriptElement[]): string[] {
  return extractUniqueCharacters(elements);
}

/**
 * Return a sorted list of unique locations from a screenplay.
 */
export function getLocations(screenplay: Screenplay): string[] {
  return extractUniqueLocations(screenplay);
}

/**
 * Return the total number of scenes.
 */
export function getSceneCount(screenplay: Screenplay): number {
  return screenplay.scenes.length;
}

/**
 * Return the dialogue-to-action ratio.
 *
 * A ratio > 1 means more dialogue than action; < 1 means more action.
 * Returns 0 when there are no action elements.
 */
export function getDialogueToActionRatio(
  elements: ScriptElement[],
): number {
  const d = countByType(elements, 'dialogue');
  const a = countByType(elements, 'action');
  return a > 0 ? d / a : 0;
}

/**
 * Return per-character dialogue counts, sorted descending by count.
 */
export function getCharacterDialogueCounts(
  elements: ScriptElement[],
): { name: string; count: number }[] {
  return buildCharacterDialogueCounts(elements);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function countByType(
  elements: ScriptElement[],
  type: ScriptElement['type'],
): number {
  let count = 0;
  for (const el of elements) {
    if (el.type === type) count++;
  }
  return count;
}

/**
 * Estimate the number of formatted lines the script would produce.
 *
 * Different element types contribute different numbers of output lines.
 * This uses the same logic as the parser's `estimatePageCount` for
 * consistency but exposes the raw line count.
 */
function estimateLineCount(elements: ScriptElement[]): number {
  let lines = 0;

  for (const el of elements) {
    switch (el.type) {
      case 'scene_heading':
        // Heading line + blank line after.
        lines += 2;
        break;

      case 'action':
        // One line per text line + trailing blank.
        lines += el.text.split('\n').length + 1;
        break;

      case 'character':
        // Character cue line + preceding blank.
        lines += 2;
        break;

      case 'dialogue':
        // Each dialogue line on its own line.
        lines += el.text.split('\n').length;
        break;

      case 'parenthetical':
        lines += 1;
        break;

      case 'transition':
        // Transition line + preceding blank.
        lines += 2;
        break;

      case 'page_break':
        // Force to next page boundary.
        lines = Math.ceil(lines / LINES_PER_PAGE) * LINES_PER_PAGE;
        break;

      case 'centered':
      case 'lyric':
      case 'section':
      case 'synopsis':
      case 'note':
        lines += 1;
        break;

      case 'boneyard':
        // Boneyarded text is hidden; contributes no visible lines.
        break;

      case 'dual_dialogue_begin':
      case 'dual_dialogue_end':
        // Structural markers, no visible output.
        break;

      default:
        lines += 1;
        break;
    }
  }

  return lines;
}

function extractUniqueCharacters(elements: ScriptElement[]): string[] {
  const set = new Set<string>();
  for (const el of elements) {
    if (el.type === 'character' && el.characterName) {
      set.add(el.characterName);
    }
  }
  return Array.from(set).sort();
}

function extractUniqueLocations(screenplay: Screenplay): string[] {
  const set = new Set<string>();
  for (const scene of screenplay.scenes) {
    if (scene.location) {
      set.add(scene.location.toUpperCase());
    }
  }
  return Array.from(set).sort();
}

function buildCharacterDialogueCounts(
  elements: ScriptElement[],
): { name: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const el of elements) {
    if (el.type === 'dialogue' && el.characterName) {
      counts.set(
        el.characterName,
        (counts.get(el.characterName) ?? 0) + 1,
      );
    }
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
