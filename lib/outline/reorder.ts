// ---------------------------------------------------------------------------
// Reorder Helper -- Move drafted scene text in the editor
// ---------------------------------------------------------------------------
//
// Planned scenes can be reordered purely in the Outline store (just change
// sortIndex).  Drafted scenes live in the Fountain text, so reordering them
// means physically moving lines in the editor.  After calling setContent(),
// Monaco triggers parseContent() -> reconcileFromParse(), which updates the
// outline automatically.
// ---------------------------------------------------------------------------

import { getEditorHandle } from '@/components/editor/ScreenplayEditor';
import type { OutlineEntry } from '@/lib/store/outline-types';
import { useEditorStore } from '@/lib/store/editor';
import { useOutlineStore } from '@/lib/store/outline';

/**
 * Move a drafted scene's Fountain text to a new position relative to another
 * scene.  Returns `true` on success.
 *
 * @param movedEntry  The scene being moved (must have fountainRange).
 * @param targetEntry The scene to place it next to (must have fountainRange).
 * @param position    Whether to insert 'before' or 'after' the target.
 */
export function reorderDraftedSceneInEditor(
  movedEntry: OutlineEntry,
  targetEntry: OutlineEntry,
  position: 'before' | 'after',
): boolean {
  const handle = getEditorHandle();
  if (!handle) return false;
  if (!movedEntry.fountainRange || !targetEntry.fountainRange) return false;

  const content = handle.getContent();
  const lines = content.split('\n');

  // -- Determine the text block to extract (0-based indices) ----------------

  const moveStart = movedEntry.fountainRange.startLine - 1;
  const moveEnd = movedEntry.fountainRange.endLine; // exclusive for splice

  // Include a single preceding blank line (Fountain separator) if present.
  let extractStart = moveStart;
  if (extractStart > 0 && lines[extractStart - 1].trim() === '') {
    extractStart--;
  }

  // Extract the scene block and remove it from the array.
  const blockLength = moveEnd - extractStart;
  const movedLines = lines.splice(extractStart, blockLength);

  // -- Find the target insertion point (indices shifted after splice) -------

  let targetLine: number;
  if (position === 'before') {
    targetLine = targetEntry.fountainRange.startLine - 1;
    if (extractStart < targetLine) {
      targetLine -= blockLength;
    }
    // Step back over the preceding blank line so we insert before it.
    if (targetLine > 0 && lines[targetLine - 1]?.trim() === '') {
      targetLine--;
    }
  } else {
    targetLine = targetEntry.fountainRange.endLine;
    if (extractStart < targetLine) {
      targetLine -= blockLength;
    }
  }

  // Clamp to valid range.
  targetLine = Math.max(0, Math.min(lines.length, targetLine));

  // -- Ensure blank-line separators per Fountain spec -----------------------

  // If the moved block doesn't start with a blank line and the preceding
  // line isn't blank, add one.
  if (
    targetLine > 0 &&
    lines[targetLine - 1]?.trim() !== '' &&
    movedLines[0]?.trim() !== ''
  ) {
    movedLines.unshift('');
  }

  // If the line after the insertion point isn't blank and the block doesn't
  // end with one, add a trailing blank line.
  if (
    targetLine < lines.length &&
    lines[targetLine]?.trim() !== '' &&
    movedLines[movedLines.length - 1]?.trim() !== ''
  ) {
    movedLines.push('');
  }

  // -- Insert and update the editor -----------------------------------------

  lines.splice(targetLine, 0, ...movedLines);

  const newContent = lines.join('\n');
  handle.setContent(newContent);

  // Monaco's onChange will call setContent which only parses - we need to also
  // trigger outline reconciliation to update scene positions.
  // Give Monaco a tick to process the change, then reconcile.
  setTimeout(() => {
    const screenplay = useEditorStore.getState().screenplay;
    if (screenplay) {
      useOutlineStore.getState().reconcileFromParse(screenplay);
    }
  }, 0);

  return true;
}
