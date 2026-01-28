// ---------------------------------------------------------------------------
// AI Tool Pipeline -- Orchestrates AI tool execution across stores
// ---------------------------------------------------------------------------
//
// This module provides utilities for applying AI tool results to the editor
// with proper timeline recording, reconciliation, and comment reanchoring.
// ---------------------------------------------------------------------------

import { useEditorStore } from '@/lib/store/editor';
import { useOutlineStore } from '@/lib/store/outline';
import { useCommentStore } from '@/lib/store/comments';

export interface AIToolResult {
  /** The new content to set in the editor. */
  content: string;
  /** Description of the AI edit for the timeline. */
  description: string;
  /** Optional scene name for the timeline entry. */
  sceneName?: string;
}

/**
 * Apply an AI tool result to the editor with proper orchestration.
 * Handles: flush pending edits, set content, record AI edit, reconcile, reanchor.
 */
export function applyAIToolResult(result: AIToolResult): void {
  const editorStore = useEditorStore.getState();
  const outlineStore = useOutlineStore.getState();
  const commentStore = useCommentStore.getState();

  const beforeContent = editorStore.content;

  // 1. Flush any pending human edits first
  editorStore.flushPendingDiff();

  // 2. Update content and parse (using primitives)
  editorStore._setContentRaw(result.content);
  const screenplay = editorStore.parseContentOnly();

  // 3. Record the AI edit for timeline/undo
  editorStore.recordAIEdit(
    beforeContent,
    result.description,
    result.sceneName,
  );

  // 4. Reconcile outline if loaded
  if (screenplay && outlineStore.isLoaded) {
    outlineStore.reconcileFromParse(screenplay);
  }

  // 5. Reanchor comments with sceneId lookup
  if (beforeContent !== result.content) {
    commentStore.reanchorCommentsRaw(
      beforeContent,
      result.content,
      (line) => outlineStore.getSceneIdForLine(line),
    );
  }
}

/**
 * Wrap AI editing operations with proper state flags.
 * Use this when you need to make multiple edits that shouldn't trigger
 * individual timeline entries.
 *
 * @param editFn - Function that performs the edits
 * @param description - Description for the single timeline entry
 * @param sceneName - Optional scene name
 */
export async function withAIEditing<T>(
  editFn: () => T | Promise<T>,
  description: string,
  sceneName?: string,
): Promise<T> {
  const editorStore = useEditorStore.getState();
  const outlineStore = useOutlineStore.getState();
  const commentStore = useCommentStore.getState();

  const beforeContent = editorStore.content;

  // Flush pending human edits before AI editing
  editorStore.flushPendingDiff();

  // Execute the edit function
  const result = await editFn();

  // Get current state after edits
  const afterContent = useEditorStore.getState().content;

  // Record the AI edit if content changed
  if (beforeContent !== afterContent) {
    editorStore.recordAIEdit(beforeContent, description, sceneName);

    // Reconcile outline
    const screenplay = useEditorStore.getState().screenplay;
    if (screenplay && outlineStore.isLoaded) {
      outlineStore.reconcileFromParse(screenplay);
    }

    // Reanchor comments
    commentStore.reanchorCommentsRaw(
      beforeContent,
      afterContent,
      (line) => useOutlineStore.getState().getSceneIdForLine(line),
    );
  }

  return result;
}
