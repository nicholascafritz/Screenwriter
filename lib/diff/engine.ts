// ---------------------------------------------------------------------------
// Diff Engine -- Core diffing, patching, and summary generation
// ---------------------------------------------------------------------------
//
// Built on top of Google's diff-match-patch library for robust character-level
// diffing.  The engine converts raw diffs into line-oriented hunks that are
// easier to display in a screenplay editor and to selectively accept/reject.
// ---------------------------------------------------------------------------

import DiffMatchPatch from 'diff-match-patch';
import type { DiffHunk, DiffResult } from './types';

// ---------------------------------------------------------------------------
// Singleton instance (stateless, safe to reuse)
// ---------------------------------------------------------------------------

const dmp = new DiffMatchPatch();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let _hunkIdCounter = 0;

function nextHunkId(): string {
  _hunkIdCounter += 1;
  return `hunk-${_hunkIdCounter}`;
}

/**
 * Reset the internal hunk ID counter.  Useful in tests to get deterministic
 * IDs across runs.
 */
export function resetHunkIdCounter(): void {
  _hunkIdCounter = 0;
}

/**
 * Count the number of newline-terminated lines in a string.
 * A trailing newline does NOT add an extra empty line.
 */
function countLines(text: string): number {
  if (text.length === 0) return 0;
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') count++;
  }
  // If the string does not end with '\n', the last line is still a line.
  if (text[text.length - 1] !== '\n') count++;
  return count;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a structured diff between two texts.
 *
 * The result contains an ordered list of {@link DiffHunk} objects, each
 * representing one contiguous region of change.  Line numbers are 1-based
 * and refer to the original and modified texts respectively.
 *
 * @param original - The original (before) text.
 * @param modified - The modified (after) text.
 * @returns A {@link DiffResult} with hunks and a human-readable summary.
 */
export function calculateDiff(original: string, modified: string): DiffResult {
  resetHunkIdCounter();

  // Compute character-level diffs.
  const diffs = dmp.diff_main(original, modified);
  dmp.diff_cleanupSemantic(diffs);

  const hunks: DiffHunk[] = [];

  // Track current line positions (1-based).
  let originalLine = 1;
  let modifiedLine = 1;

  // Walk through diff operations and build hunks.
  // diff-match-patch returns tuples: [operation, text]
  //   operation: -1 = DELETE, 0 = EQUAL, 1 = INSERT
  let i = 0;
  while (i < diffs.length) {
    const [op, text] = diffs[i];

    if (op === DiffMatchPatch.DIFF_EQUAL) {
      // Equal text -- advance both line counters.
      const lines = countLines(text);
      originalLine += lines;
      modifiedLine += lines;
      // Adjust: if text ends with newline, we already counted it.
      // We need line number of the NEXT content, so count newlines.
      // Actually, let's recount more carefully using split.
      const newlineCount = (text.match(/\n/g) || []).length;
      // Reset to precise tracking.
      originalLine = originalLine - lines + newlineCount;
      modifiedLine = modifiedLine - lines + newlineCount;
      // If text doesn't end with newline, we are mid-line -- don't advance.
      if (text.endsWith('\n')) {
        originalLine += 1;
        modifiedLine += 1;
      }
      i++;
      continue;
    }

    // We have a change.  Collect consecutive DELETE/INSERT pairs as a single
    // hunk (a "modify" if both are present).
    let removedText = '';
    let addedText = '';
    const hunkOriginalStart = originalLine;
    const hunkModifiedStart = modifiedLine;

    // Collect all contiguous non-EQUAL diffs.
    while (i < diffs.length && diffs[i][0] !== DiffMatchPatch.DIFF_EQUAL) {
      const [innerOp, innerText] = diffs[i];
      if (innerOp === DiffMatchPatch.DIFF_DELETE) {
        removedText += innerText;
      } else if (innerOp === DiffMatchPatch.DIFF_INSERT) {
        addedText += innerText;
      }
      i++;
    }

    // Determine hunk type.
    let type: DiffHunk['type'];
    if (removedText.length > 0 && addedText.length > 0) {
      type = 'modify';
    } else if (removedText.length > 0) {
      type = 'remove';
    } else {
      type = 'add';
    }

    // Calculate line spans.
    const removedLines = removedText.length > 0 ? countLines(removedText) : 0;
    const addedLines = addedText.length > 0 ? countLines(addedText) : 0;

    const hunkOriginalEnd =
      type === 'add' ? 0 : hunkOriginalStart + Math.max(0, removedLines - 1);
    const hunkModifiedEnd =
      type === 'remove' ? 0 : hunkModifiedStart + Math.max(0, addedLines - 1);

    hunks.push({
      id: nextHunkId(),
      type,
      originalStart: type === 'add' ? 0 : hunkOriginalStart,
      originalEnd: hunkOriginalEnd,
      modifiedStart: type === 'remove' ? 0 : hunkModifiedStart,
      modifiedEnd: hunkModifiedEnd,
      originalText: removedText,
      modifiedText: addedText,
    });

    // Advance line counters past the changed text.
    if (removedText.length > 0) {
      const newlines = (removedText.match(/\n/g) || []).length;
      originalLine += newlines;
      if (removedText.endsWith('\n')) {
        // Line counter already advanced past the last newline.
      }
    }
    if (addedText.length > 0) {
      const newlines = (addedText.match(/\n/g) || []).length;
      modifiedLine += newlines;
    }
  }

  const result: DiffResult = {
    hunks,
    originalText: original,
    modifiedText: modified,
    summary: '',
  };

  result.summary = generateSummary(result);

  return result;
}

/**
 * Apply a complete diff to the original text, producing the modified text.
 *
 * This uses diff-match-patch's patch mechanism for robust application even
 * when the original text has shifted slightly.
 *
 * @param original - The original text to patch.
 * @param diff     - The diff result to apply.
 * @returns The modified text after all hunks are applied.
 */
export function applyDiff(original: string, diff: DiffResult): string {
  // Reconstruct diffs from the stored original and modified texts and apply
  // as patches.  This is more reliable than manually splicing hunks.
  const diffs = dmp.diff_main(original, diff.modifiedText);
  dmp.diff_cleanupSemantic(diffs);
  const patches = dmp.patch_make(original, diffs);
  const [result] = dmp.patch_apply(patches, original);
  return result;
}

/**
 * Apply only the accepted hunks from a diff to the original text.
 *
 * Hunks are applied from last to first (by original position) so that
 * earlier line numbers remain valid as we make replacements.
 *
 * @param original        - The original text.
 * @param diff            - The full diff result.
 * @param acceptedHunkIds - Array of hunk IDs that the user has accepted.
 * @returns The text with only the accepted changes applied.
 */
export function applySelectedHunks(
  original: string,
  diff: DiffResult,
  acceptedHunkIds: string[],
): string {
  const acceptedSet = new Set(acceptedHunkIds);

  // Filter to accepted hunks and sort by original position descending so
  // that we can apply from the end of the document backwards without
  // invalidating earlier positions.
  const hunksToApply = diff.hunks
    .filter((h) => acceptedSet.has(h.id))
    .sort((a, b) => {
      // Sort by original start descending; additions (originalStart=0)
      // use their modified position as a proxy.
      const aPos = a.originalStart || a.modifiedStart;
      const bPos = b.originalStart || b.modifiedStart;
      return bPos - aPos;
    });

  let result = original;

  for (const hunk of hunksToApply) {
    if (hunk.type === 'add') {
      // Insert the new text.  Find the position by scanning to the line
      // number.  Since we sorted descending, insertions are stable.
      const lines = result.split('\n');
      // Insert after the line corresponding to the modified start.
      // For additions, originalStart is 0 so we use context: insert at
      // the modified start position (clamped to the document length).
      const insertAt = Math.min(hunk.modifiedStart - 1, lines.length);
      const addedLines = hunk.modifiedText.replace(/\n$/, '').split('\n');
      lines.splice(insertAt, 0, ...addedLines);
      result = lines.join('\n');
    } else if (hunk.type === 'remove') {
      // Remove lines from originalStart to originalEnd.
      const lines = result.split('\n');
      const start = hunk.originalStart - 1; // 0-based
      const count = hunk.originalEnd - hunk.originalStart + 1;
      lines.splice(start, count);
      result = lines.join('\n');
    } else {
      // Modify: replace original lines with modified lines.
      const lines = result.split('\n');
      const start = hunk.originalStart - 1; // 0-based
      const count = hunk.originalEnd - hunk.originalStart + 1;
      const replacementLines = hunk.modifiedText.replace(/\n$/, '').split('\n');
      lines.splice(start, count, ...replacementLines);
      result = lines.join('\n');
    }
  }

  return result;
}

/**
 * Generate a human-readable summary of a diff result.
 *
 * Examples:
 *   - "Added 3 lines, removed 1 line, modified 2 sections"
 *   - "No changes"
 *
 * @param diff - The diff result to summarise.
 * @returns A plain-English summary string.
 */
export function generateSummary(diff: DiffResult): string {
  if (diff.hunks.length === 0) {
    return 'No changes';
  }

  let additions = 0;
  let removals = 0;
  let modifications = 0;
  let addedLines = 0;
  let removedLines = 0;

  for (const hunk of diff.hunks) {
    switch (hunk.type) {
      case 'add':
        additions++;
        addedLines += countLines(hunk.modifiedText);
        break;
      case 'remove':
        removals++;
        removedLines += countLines(hunk.originalText);
        break;
      case 'modify':
        modifications++;
        break;
    }
  }

  const parts: string[] = [];

  if (additions > 0) {
    parts.push(`Added ${addedLines} ${addedLines === 1 ? 'line' : 'lines'}`);
  }
  if (removals > 0) {
    parts.push(
      `removed ${removedLines} ${removedLines === 1 ? 'line' : 'lines'}`,
    );
  }
  if (modifications > 0) {
    parts.push(
      `modified ${modifications} ${modifications === 1 ? 'section' : 'sections'}`,
    );
  }

  // Capitalise the first letter of the joined summary.
  const summary = parts.join(', ');
  return summary.charAt(0).toUpperCase() + summary.slice(1);
}
