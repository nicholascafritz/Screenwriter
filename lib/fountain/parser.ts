// ---------------------------------------------------------------------------
// Fountain Screenplay Format -- Parser
// ---------------------------------------------------------------------------
//
// A complete, zero-dependency Fountain parser that produces a typed AST.
// Implements the full Fountain syntax specification:
//   https://fountain.io/syntax
//
// Usage:
//   import { parseFountain } from '@/lib/fountain/parser';
//   const screenplay = parseFountain(fountainText);
// ---------------------------------------------------------------------------

import type {
  ElementType,
  IntExt,
  Scene,
  ScriptElement,
  Screenplay,
} from './types';

// ---------------------------------------------------------------------------
// Constants & regular expressions
// ---------------------------------------------------------------------------

/**
 * Scene heading prefixes recognised by the Fountain spec (case-insensitive).
 * Order matters -- longer prefixes are tested first so that `INT./EXT` is
 * matched before `INT`.
 */
const SCENE_HEADING_PREFIXES = [
  'INT./EXT.',
  'INT./EXT',
  'INT/EXT.',
  'INT/EXT',
  'I/E.',
  'I/E',
  'EXT.',
  'EXT',
  'EST.',
  'EST',
  'INT.',
  'INT',
];

/** Matches a valid scene heading prefix at the start of a line. */
const SCENE_HEADING_RE = new RegExp(
  `^(${SCENE_HEADING_PREFIXES.map(escapeRegex).join('|')})\\s`,
  'i',
);

/** Detects a forced scene heading (leading period NOT followed by another period). */
const FORCED_SCENE_HEADING_RE = /^\.[^.]/;

/** Scene number annotation: #number# at the end of the line. */
const SCENE_NUMBER_RE = /#([^#]+)#\s*$/;

/** A transition ends with "TO:" and is entirely uppercase. */
const TRANSITION_RE = /^[A-Z\s]+TO:$/;

/** A forced transition starts with ">". */
const FORCED_TRANSITION_RE = /^>/;

/** Centered text is wrapped in > ... < */
const CENTERED_RE = /^>(.+)<$/;

/** Section headings start with one or more "#". */
const SECTION_RE = /^(#{1,6})\s*(.*)$/;

/** Synopsis lines start with "=" but NOT "==". */
const SYNOPSIS_RE = /^=(?!=)(.*)$/;

/** Page break: three or more consecutive "=" characters. */
const PAGE_BREAK_RE = /^={3,}\s*$/;

/** Lyric lines start with "~". */
const LYRIC_RE = /^~(.*)$/;

/** Multiline note delimiters. */
const NOTE_OPEN_RE = /\[\[/;
const NOTE_CLOSE_RE = /\]\]/;

/** Multiline boneyard (comment) delimiters. */
const BONEYARD_OPEN_RE = /\/\*/;
const BONEYARD_CLOSE_RE = /\*\//;

/**
 * Character cue: an uppercase line (optionally with parenthetical extension)
 * that appears after a blank line.  May end with ^ for dual dialogue.
 *
 * Also accepts a forced character cue starting with @.
 */
const CHARACTER_EXTENSIONS = /\(([^)]+)\)\s*$/;
const DUAL_DIALOGUE_RE = /\^\s*$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let _idCounter = 0;
function nextId(): string {
  _idCounter += 1;
  return `scene-${_idCounter}`;
}

/**
 * Returns true when `line` looks like a character cue.
 * A character cue is:
 *   - forced with `@`
 *   - OR all uppercase letters (plus allowed punctuation) that is NOT a
 *     scene heading or transition.
 */
function isCharacterCue(line: string): boolean {
  if (line.startsWith('@')) return true;

  // Strip extension and dual-dialogue marker for the uppercase check.
  let stripped = line.replace(DUAL_DIALOGUE_RE, '').trim();
  stripped = stripped.replace(CHARACTER_EXTENSIONS, '').trim();

  // Must have at least one letter.
  if (!/[A-Z]/.test(stripped)) return false;

  // Must be entirely uppercase (letters, digits, spaces, dots, apostrophes, hyphens).
  if (!/^[A-Z0-9 .'\-]+$/.test(stripped)) return false;

  // Must NOT look like a scene heading.
  if (SCENE_HEADING_RE.test(line) || FORCED_SCENE_HEADING_RE.test(line)) {
    return false;
  }

  // Must NOT look like a transition.
  if (TRANSITION_RE.test(stripped)) return false;

  return true;
}

function isBlank(line: string): boolean {
  return line.trim().length === 0;
}

/**
 * Parse the INT/EXT prefix from a scene heading.
 */
function parseIntExt(heading: string): IntExt {
  const upper = heading.toUpperCase();
  if (/^(INT\.?\s*\/\s*EXT|I\/E)/.test(upper)) return 'INT/EXT';
  if (/^EXT/.test(upper)) return 'EXT';
  return 'INT';
}

/**
 * Extract location and time-of-day from a scene heading.
 *
 * Example:
 *   "INT. COFFEE SHOP - MORNING" -> { location: "COFFEE SHOP", timeOfDay: "MORNING" }
 */
function parseHeadingParts(heading: string): {
  location: string;
  timeOfDay: string;
} {
  // Remove scene number annotation.
  let text = heading.replace(SCENE_NUMBER_RE, '').trim();

  // Remove the prefix (INT./EXT./etc.).
  text = text.replace(
    new RegExp(
      `^(${SCENE_HEADING_PREFIXES.map(escapeRegex).join('|')})\\s*`,
      'i',
    ),
    '',
  );

  // Also remove forced-heading leading period.
  if (text.startsWith('.')) {
    text = text.slice(1).trim();
  }

  // Split on the last " - " to separate location from time-of-day.
  const dashIndex = text.lastIndexOf(' - ');
  if (dashIndex !== -1) {
    return {
      location: text.slice(0, dashIndex).trim(),
      timeOfDay: text.slice(dashIndex + 3).trim(),
    };
  }

  return { location: text.trim(), timeOfDay: '' };
}

/**
 * Strip inline Fountain markup from text (bold, italic, underline) for
 * character name normalisation purposes only.
 */
function stripInlineMarkup(text: string): string {
  return text
    .replace(/\*{3}(.+?)\*{3}/g, '$1') // bold italic
    .replace(/\*{2}(.+?)\*{2}/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1') // italic
    .replace(/_(.+?)_/g, '$1'); // underline
}

// ---------------------------------------------------------------------------
// Title page parser
// ---------------------------------------------------------------------------

interface TitlePageResult {
  titlePage: Record<string, string>;
  bodyStartLine: number; // 1-based line where body begins
}

/**
 * The title page consists of key: value pairs at the very start of the
 * document, ending at the first blank line.  Keys are case-insensitive
 * and are normalised to lowercase.  Multi-line values are indented with
 * at least three spaces or a tab.
 */
function parseTitlePage(lines: string[]): TitlePageResult {
  const titlePage: Record<string, string> = {};
  let idx = 0;

  // The title page must start with a line that has a key: value pattern.
  if (lines.length === 0 || !/^[A-Za-z][A-Za-z\s]*:/.test(lines[0])) {
    return { titlePage, bodyStartLine: 1 };
  }

  let currentKey = '';
  let currentValue = '';

  while (idx < lines.length) {
    const line = lines[idx];

    // A blank line terminates the title page.
    if (isBlank(line)) {
      // Store the last key/value if present.
      if (currentKey) {
        titlePage[currentKey] = currentValue.trim();
      }
      // Body starts after the blank line.
      return { titlePage, bodyStartLine: idx + 2 }; // +2: 1 for 0-index, 1 for blank line
    }

    // Continuation line: starts with 3+ spaces or a tab.
    if (/^(?: {3,}|\t)/.test(line) && currentKey) {
      currentValue += '\n' + line.trim();
    } else {
      // New key: value pair.
      if (currentKey) {
        titlePage[currentKey] = currentValue.trim();
      }

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) {
        // Not a valid title-page line -- the title page is empty.
        return { titlePage: {}, bodyStartLine: 1 };
      }
      currentKey = line.slice(0, colonIndex).trim().toLowerCase();
      currentValue = line.slice(colonIndex + 1).trim();
    }

    idx += 1;
  }

  // If we consumed the entire document as title page (no blank line).
  if (currentKey) {
    titlePage[currentKey] = currentValue.trim();
  }
  return { titlePage, bodyStartLine: idx + 1 };
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Parse a Fountain-formatted string into a typed {@link Screenplay} AST.
 */
export function parseFountain(input: string): Screenplay {
  // Reset id counter for deterministic output across calls.
  _idCounter = 0;

  const rawLines = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // -- Title page -----------------------------------------------------------
  const { titlePage, bodyStartLine } = parseTitlePage(rawLines);

  // Body lines (0-indexed into rawLines, but we track 1-based line numbers).
  const bodyLines = rawLines.slice(bodyStartLine - 1);

  // -- First pass: collect elements ----------------------------------------
  const elements: ScriptElement[] = [];

  let i = 0;
  const len = bodyLines.length;

  /** Convert body-relative index to 1-based source line number. */
  const srcLine = (idx: number) => bodyStartLine + idx;

  /**
   * Look backwards to see if the previous non-blank content line ended in a
   * blank line (or we are at the start of the body).
   */
  const prevLineBlank = (idx: number): boolean => {
    if (idx === 0) return true;
    return isBlank(bodyLines[idx - 1]);
  };

  /**
   * Look forward to see if the next non-blank content line is blank (or we
   * are at the end of the body).
   */
  const nextLineBlank = (idx: number): boolean => {
    if (idx >= len - 1) return true;
    return isBlank(bodyLines[idx + 1]);
  };

  while (i < len) {
    const line = bodyLines[i];

    // -- Blank lines (skip) ------------------------------------------------
    if (isBlank(line)) {
      i += 1;
      continue;
    }

    // -- Boneyard (/* ... */) ----------------------------------------------
    if (BONEYARD_OPEN_RE.test(line)) {
      const startIdx = i;
      let text = line;
      // If the closing delimiter is on the same line we still capture it.
      while (i < len && !BONEYARD_CLOSE_RE.test(bodyLines[i])) {
        if (i !== startIdx) text += '\n' + bodyLines[i];
        i += 1;
      }
      // Include the closing line.
      if (i < len) {
        if (i !== startIdx) text += '\n' + bodyLines[i];
        i += 1;
      }
      // Strip delimiters.
      text = text.replace(/\/\*/, '').replace(/\*\//, '').trim();
      elements.push({
        type: 'boneyard',
        text,
        startLine: srcLine(startIdx),
        endLine: srcLine(i - 1),
      });
      continue;
    }

    // -- Notes ([[ ... ]]) -------------------------------------------------
    if (NOTE_OPEN_RE.test(line) && !NOTE_CLOSE_RE.test(line)) {
      // Multi-line note.
      const startIdx = i;
      let text = line;
      i += 1;
      while (i < len && !NOTE_CLOSE_RE.test(bodyLines[i])) {
        text += '\n' + bodyLines[i];
        i += 1;
      }
      if (i < len) {
        text += '\n' + bodyLines[i];
        i += 1;
      }
      text = text.replace(/\[\[/, '').replace(/\]\]/, '').trim();
      elements.push({
        type: 'note',
        text,
        startLine: srcLine(startIdx),
        endLine: srcLine(i - 1),
      });
      continue;
    }
    // Inline note on a single line.
    if (NOTE_OPEN_RE.test(line) && NOTE_CLOSE_RE.test(line)) {
      const noteText = line.replace(/.*\[\[/, '').replace(/\]\].*/, '').trim();
      elements.push({
        type: 'note',
        text: noteText,
        startLine: srcLine(i),
        endLine: srcLine(i),
      });
      i += 1;
      continue;
    }

    // -- Page break (===) --------------------------------------------------
    if (PAGE_BREAK_RE.test(line)) {
      elements.push({
        type: 'page_break',
        text: '',
        startLine: srcLine(i),
        endLine: srcLine(i),
      });
      i += 1;
      continue;
    }

    // -- Section heading (# ... ) ------------------------------------------
    const sectionMatch = SECTION_RE.exec(line);
    if (sectionMatch) {
      elements.push({
        type: 'section',
        text: sectionMatch[2].trim(),
        depth: sectionMatch[1].length,
        startLine: srcLine(i),
        endLine: srcLine(i),
      });
      i += 1;
      continue;
    }

    // -- Synopsis (= ...) --------------------------------------------------
    const synopsisMatch = SYNOPSIS_RE.exec(line);
    if (synopsisMatch) {
      elements.push({
        type: 'synopsis',
        text: synopsisMatch[1].trim(),
        startLine: srcLine(i),
        endLine: srcLine(i),
      });
      i += 1;
      continue;
    }

    // -- Centered text (> ... <) -------------------------------------------
    const centeredMatch = CENTERED_RE.exec(line);
    if (centeredMatch) {
      elements.push({
        type: 'centered',
        text: centeredMatch[1].trim(),
        startLine: srcLine(i),
        endLine: srcLine(i),
      });
      i += 1;
      continue;
    }

    // -- Lyric (~ ...) -----------------------------------------------------
    const lyricMatch = LYRIC_RE.exec(line);
    if (lyricMatch) {
      elements.push({
        type: 'lyric',
        text: lyricMatch[1].trim(),
        startLine: srcLine(i),
        endLine: srcLine(i),
      });
      i += 1;
      continue;
    }

    // -- Scene heading -----------------------------------------------------
    const isForced = FORCED_SCENE_HEADING_RE.test(line);
    const isNatural = SCENE_HEADING_RE.test(line);

    if ((isForced || isNatural) && prevLineBlank(i)) {
      let text = isForced ? line.slice(1).trim() : line.trim();
      let sceneNumber: string | undefined;

      const snMatch = SCENE_NUMBER_RE.exec(text);
      if (snMatch) {
        sceneNumber = snMatch[1].trim();
        text = text.replace(SCENE_NUMBER_RE, '').trim();
      }

      elements.push({
        type: 'scene_heading',
        text,
        sceneNumber,
        startLine: srcLine(i),
        endLine: srcLine(i),
      });
      i += 1;
      continue;
    }

    // -- Transition --------------------------------------------------------
    // Forced transition: starts with ">" (but not centered "> ... <").
    if (FORCED_TRANSITION_RE.test(line) && !CENTERED_RE.test(line)) {
      elements.push({
        type: 'transition',
        text: line.slice(1).trim(),
        startLine: srcLine(i),
        endLine: srcLine(i),
      });
      i += 1;
      continue;
    }
    // Natural transition: all-caps ending with TO: preceded and followed by
    // blank lines.
    if (
      TRANSITION_RE.test(line.trim()) &&
      prevLineBlank(i) &&
      nextLineBlank(i)
    ) {
      elements.push({
        type: 'transition',
        text: line.trim(),
        startLine: srcLine(i),
        endLine: srcLine(i),
      });
      i += 1;
      continue;
    }

    // -- Character + dialogue block ----------------------------------------
    if (prevLineBlank(i) && isCharacterCue(line.trim())) {
      const charLine = line.trim();
      let characterName: string;
      let extension: string | undefined;
      let isDual = false;
      let charText = charLine;

      // Forced character cue (leading @).
      if (charText.startsWith('@')) {
        charText = charText.slice(1).trim();
      }

      // Dual dialogue marker (trailing ^).
      if (DUAL_DIALOGUE_RE.test(charText)) {
        isDual = true;
        charText = charText.replace(DUAL_DIALOGUE_RE, '').trim();
      }

      // Extension in parentheses at end.
      const extMatch = CHARACTER_EXTENSIONS.exec(charText);
      if (extMatch) {
        extension = extMatch[1].trim();
        charText = charText.replace(CHARACTER_EXTENSIONS, '').trim();
      }

      characterName = stripInlineMarkup(charText).toUpperCase().trim();

      const charElement: ScriptElement = {
        type: 'character',
        text: charLine,
        characterName,
        extension,
        startLine: srcLine(i),
        endLine: srcLine(i),
      };
      if (isDual) charElement.dual = 'right';

      elements.push(charElement);

      // If this is a dual-dialogue cue, mark the previous character block as
      // "left" and wrap everything in dual-dialogue delimiters.
      if (isDual) {
        // Insert dual_dialogue_begin before the previous character's block.
        const dualBeginIdx = findPreviousCharacterBlockStart(elements);
        if (dualBeginIdx !== -1) {
          const beginElement: ScriptElement = {
            type: 'dual_dialogue_begin',
            text: '',
            startLine: elements[dualBeginIdx].startLine,
            endLine: elements[dualBeginIdx].startLine,
          };
          elements.splice(dualBeginIdx, 0, beginElement);

          // Tag all elements in the previous character block as "left".
          for (
            let j = dualBeginIdx + 1;
            j < elements.length - 1;
            j++
          ) {
            elements[j].dual = 'left';
          }
        }
      }

      // Consume dialogue and parenthetical lines.
      i += 1;
      while (i < len && !isBlank(bodyLines[i])) {
        const dLine = bodyLines[i];
        const trimmed = dLine.trim();

        if (/^\(.*\)$/.test(trimmed)) {
          const pEl: ScriptElement = {
            type: 'parenthetical',
            text: trimmed,
            characterName,
            startLine: srcLine(i),
            endLine: srcLine(i),
          };
          if (isDual) pEl.dual = 'right';
          elements.push(pEl);
        } else {
          const dEl: ScriptElement = {
            type: 'dialogue',
            text: trimmed,
            characterName,
            startLine: srcLine(i),
            endLine: srcLine(i),
          };
          if (isDual) dEl.dual = 'right';
          elements.push(dEl);
        }
        i += 1;
      }

      // Close dual dialogue if we opened it.
      if (isDual) {
        elements.push({
          type: 'dual_dialogue_end',
          text: '',
          startLine: srcLine(i - 1),
          endLine: srcLine(i - 1),
        });
      }

      continue;
    }

    // -- Action (default) --------------------------------------------------
    // Collect consecutive non-blank lines as a single action block.
    {
      const startIdx = i;
      let text = line;

      // A forced action starts with "!".
      const isForced = line.startsWith('!');
      if (isForced) {
        text = line.slice(1);
      }

      i += 1;
      while (i < len && !isBlank(bodyLines[i])) {
        // Stop if the next line looks like a different element type.
        const next = bodyLines[i];
        if (
          SCENE_HEADING_RE.test(next) ||
          FORCED_SCENE_HEADING_RE.test(next) ||
          PAGE_BREAK_RE.test(next) ||
          SECTION_RE.test(next) ||
          SYNOPSIS_RE.test(next) ||
          CENTERED_RE.test(next) ||
          LYRIC_RE.test(next) ||
          NOTE_OPEN_RE.test(next) ||
          BONEYARD_OPEN_RE.test(next)
        ) {
          break;
        }
        text += '\n' + next;
        i += 1;
      }

      elements.push({
        type: 'action',
        text: text.trim(),
        startLine: srcLine(startIdx),
        endLine: srcLine(i - 1),
      });
    }
  }

  // -- Derive scenes -------------------------------------------------------
  const scenes = buildScenes(elements);

  // -- Extract unique characters & locations --------------------------------
  const characters = extractCharacters(elements);
  const locations = extractLocations(scenes);

  // -- Page count -----------------------------------------------------------
  const pageCount = estimatePageCount(elements);

  return {
    titlePage,
    elements,
    characters,
    locations,
    scenes,
    pageCount,
  };
}

// ---------------------------------------------------------------------------
// Post-processing helpers
// ---------------------------------------------------------------------------

/**
 * Walk backwards through the elements list to find where the previous
 * character block starts (the most recent `character` element that is NOT
 * already tagged as dual).  Returns the index or -1.
 */
function findPreviousCharacterBlockStart(
  elements: ScriptElement[],
): number {
  // The last element is the current (dual) character -- skip it.
  for (let j = elements.length - 2; j >= 0; j--) {
    if (elements[j].type === 'character' && !elements[j].dual) {
      return j;
    }
    // Stop searching if we hit a scene heading or page break.
    if (
      elements[j].type === 'scene_heading' ||
      elements[j].type === 'page_break'
    ) {
      break;
    }
  }
  return -1;
}

/**
 * Group elements into {@link Scene} objects.
 */
function buildScenes(elements: ScriptElement[]): Scene[] {
  const scenes: Scene[] = [];
  let current: Scene | null = null;

  for (const el of elements) {
    if (el.type === 'scene_heading') {
      // Close the previous scene.
      if (current) {
        current.endLine = el.startLine - 1;
        current.characters = extractSceneCharacters(current.elements);
        scenes.push(current);
      }

      const { location, timeOfDay } = parseHeadingParts(el.text);
      current = {
        id: nextId(),
        heading: el.text,
        location,
        timeOfDay,
        intExt: parseIntExt(el.text),
        elements: [],
        characters: [],
        sceneNumber: el.sceneNumber,
        startLine: el.startLine,
        endLine: el.endLine,
      };
    } else if (current) {
      current.elements.push(el);
      current.endLine = el.endLine;
    }
  }

  // Close the last scene.
  if (current) {
    current.characters = extractSceneCharacters(current.elements);
    scenes.push(current);
  }

  return scenes;
}

function extractSceneCharacters(elements: ScriptElement[]): string[] {
  const set = new Set<string>();
  for (const el of elements) {
    if (el.type === 'character' && el.characterName) {
      set.add(el.characterName);
    }
  }
  return Array.from(set).sort();
}

function extractCharacters(elements: ScriptElement[]): string[] {
  const set = new Set<string>();
  for (const el of elements) {
    if (el.type === 'character' && el.characterName) {
      set.add(el.characterName);
    }
  }
  return Array.from(set).sort();
}

function extractLocations(scenes: Scene[]): string[] {
  const set = new Set<string>();
  for (const scene of scenes) {
    if (scene.location) {
      set.add(scene.location.toUpperCase());
    }
  }
  return Array.from(set).sort();
}

/**
 * Estimate a page count using the industry-standard approximation of
 * 56 lines per page.  Each element contributes a different number of
 * output lines (action blocks count their newlines, dialogue lines are
 * single, etc.).
 */
function estimatePageCount(elements: ScriptElement[]): number {
  let lines = 0;
  for (const el of elements) {
    switch (el.type) {
      case 'scene_heading':
        lines += 2; // heading + blank line after
        break;
      case 'action':
        lines += el.text.split('\n').length + 1;
        break;
      case 'character':
        lines += 2; // character line + leading blank
        break;
      case 'dialogue':
        lines += el.text.split('\n').length;
        break;
      case 'parenthetical':
        lines += 1;
        break;
      case 'transition':
        lines += 2;
        break;
      case 'page_break':
        // A page break forces a new page.
        lines = Math.ceil(lines / 56) * 56;
        break;
      default:
        lines += 1;
        break;
    }
  }
  return Math.max(1, Math.ceil(lines / 56));
}
