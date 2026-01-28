// ---------------------------------------------------------------------------
// Content Pipeline -- Orchestrates content changes across stores
// ---------------------------------------------------------------------------
//
// This module provides composed operations that coordinate multiple stores
// without those stores having to know about each other directly.
//
// Key pipelines:
// - setContentWithReconciliation: editor.setContent + outline.reconcile + comments.reanchor
// - applyAIToolResult: setContent + recordAIEdit + reconcile
// ---------------------------------------------------------------------------

import { useEditorStore } from '@/lib/store/editor';
import { useOutlineStore } from '@/lib/store/outline';
import { useCommentStore } from '@/lib/store/comments';
import type { Comment } from '@/lib/store/comment-types';

/**
 * Set editor content and run full reconciliation pipeline.
 * This replaces direct calls to editor.setContent() when you need
 * outline reconciliation and comment reanchoring.
 */
export function setContentWithReconciliation(newContent: string): void {
  const editorStore = useEditorStore.getState();
  const outlineStore = useOutlineStore.getState();
  const commentStore = useCommentStore.getState();

  const oldContent = editorStore.content;

  // 1. Set content and parse (editor primitive)
  editorStore._setContentRaw(newContent);
  const screenplay = editorStore.parseContentOnly();

  // 2. Reconcile outline if loaded
  if (screenplay && outlineStore.isLoaded) {
    outlineStore.reconcileFromParse(screenplay);
  }

  // 3. Reanchor comments with sceneId lookup
  if (oldContent !== newContent) {
    commentStore.reanchorCommentsRaw(
      oldContent,
      newContent,
      (line) => outlineStore.getSceneIdForLine(line),
    );
  }
}

/**
 * Apply an AI tool result to the editor with proper recording.
 * This handles: content update, AI edit recording, reconciliation.
 *
 * @param newContent - The new content after AI modification
 * @param description - Description for the timeline entry
 * @param sceneName - Optional scene name for the timeline entry
 */
export function applyAIToolResult(
  newContent: string,
  description: string,
  sceneName?: string,
): void {
  const editorStore = useEditorStore.getState();
  const outlineStore = useOutlineStore.getState();
  const commentStore = useCommentStore.getState();

  const beforeContent = editorStore.content;

  // 1. Flush any pending human edits first
  editorStore.flushPendingDiff();

  // 2. Set AI editing flag to prevent human edit recording
  editorStore._setContentRaw(newContent);
  const screenplay = editorStore.parseContentOnly();

  // 3. Record the AI edit with affected scene IDs
  const scenes = outlineStore.outline?.scenes ?? [];
  editorStore.recordAIEdit(beforeContent, description, sceneName);

  // 4. Reconcile outline
  if (screenplay && outlineStore.isLoaded) {
    outlineStore.reconcileFromParse(screenplay);
  }

  // 5. Reanchor comments
  if (beforeContent !== newContent) {
    commentStore.reanchorCommentsRaw(
      beforeContent,
      newContent,
      (line) => outlineStore.getSceneIdForLine(line),
    );
  }
}

/**
 * Load sample script with full reconciliation.
 * Replaces direct call to editor.loadSampleScript() when orchestration is needed.
 */
export function loadSampleScriptWithReconciliation(): void {
  const editorStore = useEditorStore.getState();
  const outlineStore = useOutlineStore.getState();

  // 1. Load sample into editor
  editorStore.loadSampleScript();

  // 2. Get the parsed result and reconcile
  const screenplay = editorStore.screenplay;
  if (screenplay && outlineStore.isLoaded) {
    outlineStore.reconcileFromParse(screenplay);
  }
}

/**
 * Parse content and reconcile outline without triggering timeline.
 * Use this for initial load or when you've already handled timeline elsewhere.
 */
export function parseAndReconcile(): void {
  const editorStore = useEditorStore.getState();
  const outlineStore = useOutlineStore.getState();

  const screenplay = editorStore.parseContentOnly();
  if (screenplay && outlineStore.isLoaded) {
    outlineStore.reconcileFromParse(screenplay);
  }
}

/**
 * Get the sceneId for a given line number.
 * Convenience wrapper for use in components.
 */
export function getSceneIdForLine(line: number): string | null {
  return useOutlineStore.getState().getSceneIdForLine(line);
}

/**
 * Add a comment with automatic sceneId population.
 * This is the orchestrated version that looks up the sceneId from outline.
 */
export function addCommentWithSceneId(
  comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>,
): void {
  const commentStore = useCommentStore.getState();
  const outlineStore = useOutlineStore.getState();

  // Auto-populate sceneId if not provided
  const sceneId = comment.sceneId ?? outlineStore.getSceneIdForLine(comment.startLine);

  commentStore.addCommentRaw({
    ...comment,
    sceneId,
  });
}
