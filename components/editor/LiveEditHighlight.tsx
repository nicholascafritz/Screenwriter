'use client';

import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/lib/store/editor';
import { getEditorHandle } from './ScreenplayEditor';

/**
 * LiveEditHighlight listens for AI edit events and applies a pulsing
 * highlight decoration to the affected lines in the Monaco editor.
 *
 * This is a headless component -- it renders nothing visible itself but
 * drives Monaco decorations via the imperative editor handle.
 */
export default function LiveEditHighlight() {
  const prevContentRef = useRef<string>('');
  const isAIEditing = useEditorStore((s) => s._isAIEditing);
  const content = useEditorStore((s) => s.content);

  useEffect(() => {
    if (!isAIEditing) {
      prevContentRef.current = content;
      return;
    }

    // When AI editing ends (content changes while isAIEditing), figure out
    // the changed line range and highlight it.
    const handle = getEditorHandle();
    if (!handle) return;

    const prevLines = prevContentRef.current.split('\n');
    const newLines = content.split('\n');

    // Find the first and last differing lines.
    let firstDiff = -1;
    let lastDiff = -1;
    const maxLen = Math.max(prevLines.length, newLines.length);

    for (let i = 0; i < maxLen; i++) {
      if (prevLines[i] !== newLines[i]) {
        if (firstDiff === -1) firstDiff = i;
        lastDiff = i;
      }
    }

    if (firstDiff >= 0) {
      // Highlight the changed range (1-based lines).
      handle.highlightLines(firstDiff + 1, lastDiff + 1);
      // Auto-clear after the pulse animation.
      setTimeout(() => handle.clearHighlights(), 2500);
      // Scroll to the start of the change.
      handle.revealLine(firstDiff + 1);
    }

    prevContentRef.current = content;
  }, [content, isAIEditing]);

  // Headless component.
  return null;
}
