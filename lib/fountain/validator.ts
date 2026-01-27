// ---------------------------------------------------------------------------
// Fountain Screenplay Format -- Validator / Linter
// ---------------------------------------------------------------------------
//
// Validates a parsed Screenplay AST and returns an array of issues with line
// numbers and severity levels.  Rules cover structural formatting, common
// mistakes, and best-practice recommendations.
//
// Usage:
//   import { validateScreenplay } from '@/lib/fountain/validator';
//   const issues = validateScreenplay(screenplay);
// ---------------------------------------------------------------------------

import type {
  Screenplay,
  ScriptElement,
  ValidationIssue,
  ValidationSeverity,
} from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a {@link Screenplay} AST and return all detected issues.
 *
 * Issues are sorted by line number (ascending).
 */
export function validateScreenplay(
  screenplay: Screenplay,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  checkTitlePage(screenplay, issues);
  checkElements(screenplay.elements, issues);
  checkScenes(screenplay, issues);
  checkCharacters(screenplay, issues);

  // Sort by line number then severity (error first).
  issues.sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line;
    return severityOrder(a.severity) - severityOrder(b.severity);
  });

  return issues;
}

// ---------------------------------------------------------------------------
// Title page checks
// ---------------------------------------------------------------------------

function checkTitlePage(
  screenplay: Screenplay,
  issues: ValidationIssue[],
): void {
  const tp = screenplay.titlePage;

  if (Object.keys(tp).length === 0) {
    issues.push(
      issue(
        1,
        'warning',
        'missing-title-page',
        'Screenplay is missing a title page. Consider adding Title, Credit, Author, and Draft date fields.',
      ),
    );
    return;
  }

  if (!tp['title']) {
    issues.push(
      issue(
        1,
        'warning',
        'missing-title',
        'Title page is missing the "Title" field.',
      ),
    );
  }

  if (!tp['author'] && !tp['authors']) {
    issues.push(
      issue(
        1,
        'info',
        'missing-author',
        'Title page is missing an "Author" or "Authors" field.',
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Element-level checks
// ---------------------------------------------------------------------------

function checkElements(
  elements: ScriptElement[],
  issues: ValidationIssue[],
): void {
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const prev = i > 0 ? elements[i - 1] : null;

    switch (el.type) {
      case 'scene_heading':
        checkSceneHeading(el, issues);
        break;

      case 'dialogue':
        checkDialogue(el, prev, issues);
        break;

      case 'parenthetical':
        checkParenthetical(el, prev, issues);
        break;

      case 'character':
        checkCharacterCue(el, elements, i, issues);
        break;

      case 'transition':
        checkTransition(el, issues);
        break;

      default:
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Scene heading validation
// ---------------------------------------------------------------------------

const VALID_HEADING_PREFIXES_RE =
  /^(INT\.?\s*\/\s*EXT\.?|EXT\.?|INT\.?|EST\.?|I\/E\.?)\s/i;

function checkSceneHeading(
  el: ScriptElement,
  issues: ValidationIssue[],
): void {
  const text = el.text.trim();

  // Validate prefix format.
  if (!VALID_HEADING_PREFIXES_RE.test(text)) {
    issues.push(
      issue(
        el.startLine,
        'warning',
        'scene-heading-prefix',
        `Scene heading "${truncate(text, 40)}" does not start with a standard prefix (INT., EXT., INT./EXT., EST., I/E.).`,
      ),
    );
  }

  // Warn if the heading is entirely lowercase (probably a forced heading
  // that the author forgot to capitalise).
  if (text === text.toLowerCase() && /[a-z]/.test(text)) {
    issues.push(
      issue(
        el.startLine,
        'info',
        'scene-heading-case',
        'Scene headings are conventionally written in ALL CAPS.',
      ),
    );
  }

  // Check for missing location/time structure (should contain " - ").
  if (!text.includes(' - ')) {
    issues.push(
      issue(
        el.startLine,
        'info',
        'scene-heading-structure',
        'Scene heading is missing the " - " separator between location and time of day.',
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Dialogue validation
// ---------------------------------------------------------------------------

function checkDialogue(
  el: ScriptElement,
  prev: ScriptElement | null,
  issues: ValidationIssue[],
): void {
  // Orphaned dialogue: dialogue that does not follow a character or
  // parenthetical element.
  if (
    prev &&
    prev.type !== 'character' &&
    prev.type !== 'parenthetical' &&
    prev.type !== 'dialogue'
  ) {
    issues.push(
      issue(
        el.startLine,
        'error',
        'orphaned-dialogue',
        `Dialogue line "${truncate(el.text, 40)}" is not preceded by a character cue.`,
      ),
    );
  }

  // Warn on very long dialogue lines (may indicate an action block that
  // was inadvertently parsed as dialogue).
  if (el.text.length > 500) {
    issues.push(
      issue(
        el.startLine,
        'warning',
        'long-dialogue',
        'This dialogue block is unusually long. Is it intended to be action?',
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Parenthetical validation
// ---------------------------------------------------------------------------

function checkParenthetical(
  el: ScriptElement,
  prev: ScriptElement | null,
  issues: ValidationIssue[],
): void {
  if (
    prev &&
    prev.type !== 'character' &&
    prev.type !== 'dialogue' &&
    prev.type !== 'parenthetical'
  ) {
    issues.push(
      issue(
        el.startLine,
        'error',
        'orphaned-parenthetical',
        'Parenthetical is not within a dialogue block.',
      ),
    );
  }

  // Check that parenthetical text is wrapped in parentheses.
  const text = el.text.trim();
  if (!text.startsWith('(') || !text.endsWith(')')) {
    issues.push(
      issue(
        el.startLine,
        'warning',
        'parenthetical-format',
        'Parenthetical should be enclosed in parentheses, e.g. "(softly)".',
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Character cue validation
// ---------------------------------------------------------------------------

function checkCharacterCue(
  el: ScriptElement,
  elements: ScriptElement[],
  index: number,
  issues: ValidationIssue[],
): void {
  // A character cue with no following dialogue is suspicious.
  const next = index < elements.length - 1 ? elements[index + 1] : null;
  if (
    !next ||
    (next.type !== 'dialogue' && next.type !== 'parenthetical')
  ) {
    issues.push(
      issue(
        el.startLine,
        'warning',
        'empty-dialogue-block',
        `Character "${el.characterName ?? el.text}" has no following dialogue.`,
      ),
    );
  }

  // Warn on character names that contain unusual characters.
  const name = el.characterName ?? '';
  if (/[^A-Z0-9 .'\-#]/.test(name) && name.length > 0) {
    issues.push(
      issue(
        el.startLine,
        'info',
        'character-name-chars',
        `Character name "${name}" contains unusual characters.`,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Transition validation
// ---------------------------------------------------------------------------

function checkTransition(
  el: ScriptElement,
  issues: ValidationIssue[],
): void {
  const text = el.text.trim();

  // Transitions are conventionally ALL CAPS.
  if (text !== text.toUpperCase()) {
    issues.push(
      issue(
        el.startLine,
        'info',
        'transition-case',
        'Transitions are conventionally written in ALL CAPS.',
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Scene-level checks
// ---------------------------------------------------------------------------

function checkScenes(
  screenplay: Screenplay,
  issues: ValidationIssue[],
): void {
  if (screenplay.scenes.length === 0 && screenplay.elements.length > 0) {
    issues.push(
      issue(
        1,
        'warning',
        'no-scenes',
        'No scene headings were found. The screenplay may be missing structure.',
      ),
    );
  }

  // Check for duplicate scene numbers.
  const sceneNumbers = new Map<string, number>();
  for (const scene of screenplay.scenes) {
    if (scene.sceneNumber) {
      if (sceneNumbers.has(scene.sceneNumber)) {
        issues.push(
          issue(
            scene.startLine,
            'error',
            'duplicate-scene-number',
            `Scene number "${scene.sceneNumber}" is already used at line ${sceneNumbers.get(scene.sceneNumber)}.`,
          ),
        );
      } else {
        sceneNumbers.set(scene.sceneNumber, scene.startLine);
      }
    }
  }

  // Check for very short scenes (possibly formatting errors).
  for (const scene of screenplay.scenes) {
    if (scene.elements.length === 0) {
      issues.push(
        issue(
          scene.startLine,
          'info',
          'empty-scene',
          `Scene "${truncate(scene.heading, 40)}" contains no elements.`,
        ),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Character consistency checks
// ---------------------------------------------------------------------------

function checkCharacters(
  screenplay: Screenplay,
  issues: ValidationIssue[],
): void {
  // Look for character names that are very similar (possible typos).
  const names = screenplay.characters;

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (areSimilar(names[i], names[j])) {
        // Find the first occurrence line for the second name.
        const line = findCharacterLine(screenplay.elements, names[j]);
        issues.push(
          issue(
            line,
            'info',
            'similar-character-names',
            `Character names "${names[i]}" and "${names[j]}" are very similar. Is this intentional?`,
          ),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function issue(
  line: number,
  severity: ValidationSeverity,
  rule: string,
  message: string,
): ValidationIssue {
  return { line, severity, rule, message };
}

function severityOrder(severity: ValidationSeverity): number {
  switch (severity) {
    case 'error':
      return 0;
    case 'warning':
      return 1;
    case 'info':
      return 2;
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/**
 * Simple similarity check: two names that differ by at most one character
 * (Levenshtein distance <= 1) are considered similar.
 */
function areSimilar(a: string, b: string): boolean {
  if (a === b) return false;
  const lenDiff = Math.abs(a.length - b.length);
  if (lenDiff > 1) return false;

  if (a.length === b.length) {
    // Same length: check for a single substitution.
    let diffs = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) diffs++;
      if (diffs > 1) return false;
    }
    return diffs === 1;
  }

  // Different lengths by 1: check for a single insertion/deletion.
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  let si = 0;
  let li = 0;
  let diffs = 0;

  while (si < shorter.length && li < longer.length) {
    if (shorter[si] !== longer[li]) {
      diffs++;
      if (diffs > 1) return false;
      li++;
    } else {
      si++;
      li++;
    }
  }

  return true;
}

function findCharacterLine(
  elements: ScriptElement[],
  name: string,
): number {
  for (const el of elements) {
    if (el.type === 'character' && el.characterName === name) {
      return el.startLine;
    }
  }
  return 1;
}
