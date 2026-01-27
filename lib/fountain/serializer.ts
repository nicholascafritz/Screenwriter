// ---------------------------------------------------------------------------
// Fountain Screenplay Format -- Serializer
// ---------------------------------------------------------------------------
//
// Converts a parsed AST (Screenplay or ScriptElement[]) back into valid
// Fountain plain-text.  The output is designed to be idempotent: parsing
// the serialized text should produce an equivalent AST.
//
// Usage:
//   import { serializeFountain } from '@/lib/fountain/serializer';
//   const text = serializeFountain(screenplay);
// ---------------------------------------------------------------------------

import type { ScriptElement, Screenplay } from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Serialise a full {@link Screenplay} (including title page) to Fountain text.
 */
export function serializeFountain(screenplay: Screenplay): string {
  const parts: string[] = [];

  // Title page.
  const titleText = serializeTitlePage(screenplay.titlePage);
  if (titleText) {
    parts.push(titleText);
    parts.push(''); // blank line separating title page from body
  }

  // Body elements.
  parts.push(serializeElements(screenplay.elements));

  return parts.join('\n');
}

/**
 * Serialise only the title page key/value pairs.
 */
export function serializeTitlePage(
  titlePage: Record<string, string>,
): string {
  const entries = Object.entries(titlePage);
  if (entries.length === 0) return '';

  return entries
    .map(([key, value]) => {
      // Capitalise the key for conventional formatting.
      const formattedKey = formatTitleKey(key);

      // Multi-line values: indent continuation lines.
      const lines = value.split('\n');
      if (lines.length === 1) {
        return `${formattedKey}: ${value}`;
      }
      return [
        `${formattedKey}:`,
        ...lines.map((l) => `   ${l}`),
      ].join('\n');
    })
    .join('\n');
}

/**
 * Serialise an array of {@link ScriptElement} nodes to Fountain text.
 */
export function serializeElements(elements: ScriptElement[]): string {
  const output: string[] = [];
  let prevType: string | null = null;
  let inDialogueBlock = false;

  for (let idx = 0; idx < elements.length; idx++) {
    const el = elements[idx];

    // Determine if we need a blank line before this element.
    const needsBlank = shouldInsertBlankLine(el.type, prevType, inDialogueBlock);
    if (needsBlank && output.length > 0) {
      output.push('');
    }

    output.push(serializeElement(el));

    // Track dialogue block state.
    if (el.type === 'character') {
      inDialogueBlock = true;
    } else if (
      el.type !== 'dialogue' &&
      el.type !== 'parenthetical'
    ) {
      inDialogueBlock = false;
    }

    prevType = el.type;
  }

  return output.join('\n');
}

// ---------------------------------------------------------------------------
// Single-element serializer
// ---------------------------------------------------------------------------

function serializeElement(el: ScriptElement): string {
  switch (el.type) {
    case 'scene_heading': {
      let line = el.text;
      if (el.sceneNumber) {
        line += ` #${el.sceneNumber}#`;
      }
      return line;
    }

    case 'action':
      return el.text;

    case 'character': {
      let line = el.text;
      // If the original text already has the correct formatting we use it
      // directly; otherwise rebuild from components.
      if (!line) {
        line = el.characterName ?? '';
        if (el.extension) {
          line += ` (${el.extension})`;
        }
        if (el.dual === 'right') {
          line += ' ^';
        }
      }
      return line;
    }

    case 'dialogue':
      return el.text;

    case 'parenthetical':
      return el.text;

    case 'transition':
      return el.text;

    case 'centered':
      return `>${el.text}<`;

    case 'section':
      return `${'#'.repeat(el.depth ?? 1)} ${el.text}`;

    case 'synopsis':
      return `= ${el.text}`;

    case 'note':
      return `[[${el.text}]]`;

    case 'boneyard':
      return `/*${el.text}*/`;

    case 'page_break':
      return '===';

    case 'lyric':
      return `~${el.text}`;

    case 'dual_dialogue_begin':
    case 'dual_dialogue_end':
      // These are structural markers; they do not produce visible text.
      // The dual dialogue is expressed through the ^ marker on the
      // character element instead.
      return '';

    case 'title_page':
      return el.text;

    default:
      return el.text;
  }
}

// ---------------------------------------------------------------------------
// Blank-line logic
// ---------------------------------------------------------------------------

/**
 * Determines whether a blank line should be inserted before the current
 * element based on Fountain formatting conventions.
 */
function shouldInsertBlankLine(
  currentType: string,
  prevType: string | null,
  inDialogueBlock: boolean,
): boolean {
  if (prevType === null) return false;

  // Never insert blank lines before structural markers.
  if (
    currentType === 'dual_dialogue_begin' ||
    currentType === 'dual_dialogue_end'
  ) {
    return false;
  }

  // Inside a dialogue block, parentheticals and dialogue lines are
  // contiguous with the character cue.
  if (
    inDialogueBlock &&
    (currentType === 'dialogue' || currentType === 'parenthetical')
  ) {
    return false;
  }

  // Scene headings, characters, and transitions are always preceded by a
  // blank line.
  if (
    currentType === 'scene_heading' ||
    currentType === 'character' ||
    currentType === 'transition'
  ) {
    return true;
  }

  // Action blocks following other action blocks need a blank line.
  if (currentType === 'action' && prevType === 'action') {
    return true;
  }

  // After a dialogue block ends, the next element needs a blank line.
  if (
    prevType === 'dialogue' ||
    prevType === 'parenthetical'
  ) {
    if (
      currentType !== 'dialogue' &&
      currentType !== 'parenthetical' &&
      currentType !== 'character'
    ) {
      return true;
    }
  }

  // Default: insert blank line between different element types.
  if (prevType !== currentType) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Capitalise a title-page key for conventional display.
 * Examples: "title" -> "Title", "draft date" -> "Draft date"
 */
function formatTitleKey(key: string): string {
  if (key.length === 0) return key;
  return key.charAt(0).toUpperCase() + key.slice(1);
}
