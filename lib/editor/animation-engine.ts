// ---------------------------------------------------------------------------
// Animation Engine -- Character-by-character edit animation for Monaco
// ---------------------------------------------------------------------------
//
// Animates AI edits in the Monaco editor, showing text appearing/disappearing
// character-by-character like watching someone type in real-time.
// ---------------------------------------------------------------------------

import type { DiffHunk } from '@/lib/diff/types';
import type { ExtendedEditorHandle } from '@/components/editor/ScreenplayEditor';
import {
  useLiveEditStore,
  SPEED_CHARS_PER_FRAME,
  type AnimatedEdit,
  type AnimationSpeed,
} from '@/lib/store/live-edit';
import { useEditorStore } from '@/lib/store/editor';
import { useOperationsStore } from '@/lib/store/operations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnimationContext {
  editorHandle: ExtendedEditorHandle;
  edit: AnimatedEdit;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Animation Engine Class
// ---------------------------------------------------------------------------

class EditAnimationEngine {
  private rafId: number | null = null;
  private isRunning = false;

  async processQueue(editorHandle: ExtendedEditorHandle): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    const store = useLiveEditStore.getState();
    store.startAnimation();

    while (true) {
      const state = useLiveEditStore.getState();
      const nextEdit = state.pendingEdits[0];

      if (!nextEdit) {
        break;
      }

      // Set as current edit
      useLiveEditStore.getState().setCurrentEdit(nextEdit);

      // Log the operation
      const opId = useOperationsStore.getState().startOperation(
        nextEdit.toolName,
        `Editing${nextEdit.sceneName ? `: ${nextEdit.sceneName}` : ''}`,
        nextEdit.sceneName
      );

      // Animate this edit
      await this.animateEdit({
        editorHandle,
        edit: nextEdit,
        onComplete: () => {
          // Record the AI edit to the timeline
          const editorState = useEditorStore.getState();
          editorState.recordAIEdit(
            nextEdit.beforeContent,
            `AI: ${nextEdit.toolName}`,
            nextEdit.sceneName
          );

          // Mark operation complete
          useOperationsStore.getState().completeOperation(opId);

          // Remove from queue
          useLiveEditStore.getState().completeCurrentEdit();
        },
      });

      // Small pause between edits for visual breathing room
      await this.sleep(150);
    }

    // Clear the AI editing flag when all animations are done
    useEditorStore.setState({ _isAIEditing: false });

    this.isRunning = false;
    useLiveEditStore.setState({ isAnimating: false });
  }

  private async animateEdit(ctx: AnimationContext): Promise<void> {
    const { editorHandle, edit } = ctx;
    const state = useLiveEditStore.getState();

    // Check if instant mode or skip requested
    if (state.animationSpeed === 'instant' || state.skipRequested) {
      this.applyInstantly(ctx);
      return;
    }

    // If no hunks, apply instantly (full content replacement)
    if (!edit.hunks || edit.hunks.length === 0) {
      this.applyInstantly(ctx);
      return;
    }

    // Check if edit is too large (>200 lines) - auto-skip
    const totalLines = edit.hunks.reduce((sum, h) => {
      const lines = (h.modifiedText || '').split('\n').length;
      return sum + lines;
    }, 0);

    if (totalLines > 200) {
      this.applyInstantly(ctx);
      return;
    }

    // Scroll to the first affected line
    editorHandle.revealLineSmooth(edit.startLine);

    // Wait a moment for scroll to complete
    await this.sleep(100);

    // Sort hunks by position (process in order)
    const sortedHunks = [...edit.hunks].sort((a, b) => {
      const aLine = a.type === 'add' ? a.modifiedStart : a.originalStart;
      const bLine = b.type === 'add' ? b.modifiedStart : b.originalStart;
      return aLine - bLine;
    });

    // Process each hunk
    for (const hunk of sortedHunks) {
      const currentState = useLiveEditStore.getState();

      // Check for skip request
      if (currentState.skipRequested) {
        this.applyInstantly(ctx);
        return;
      }

      // Wait while paused
      while (currentState.isPaused) {
        await this.sleep(100);
        if (useLiveEditStore.getState().skipRequested) {
          this.applyInstantly(ctx);
          return;
        }
      }

      await this.animateHunk(editorHandle, hunk);
    }

    // Clear AI cursor when done
    editorHandle.hideTypingCursor();

    // Highlight the affected lines
    editorHandle.highlightLines(edit.startLine, edit.endLine);

    ctx.onComplete();
  }

  private async animateHunk(
    editorHandle: ExtendedEditorHandle,
    hunk: DiffHunk
  ): Promise<void> {
    switch (hunk.type) {
      case 'remove':
        await this.animateDeletion(editorHandle, hunk);
        break;
      case 'add':
        await this.animateInsertion(editorHandle, hunk);
        break;
      case 'modify':
        // For modify, first delete then insert
        await this.animateDeletion(editorHandle, hunk);
        await this.animateInsertion(editorHandle, hunk);
        break;
    }
  }

  private async animateDeletion(
    editorHandle: ExtendedEditorHandle,
    hunk: DiffHunk
  ): Promise<void> {
    const { originalStart, originalEnd } = hunk;

    // Show typing cursor at deletion point
    editorHandle.showTypingCursor(originalStart, 1);

    // Reveal the line being deleted
    editorHandle.revealLineSmooth(originalStart);

    // Brief pause to show what's being deleted
    await this.sleep(100);

    // Highlight the lines being deleted
    editorHandle.highlightDeletingLines(originalStart, originalEnd);

    // Wait for visual feedback
    await this.sleep(200);

    // Perform the deletion
    editorHandle.deleteRange(
      originalStart,
      1,
      originalEnd + 1,
      1
    );

    // Clear deletion highlight
    editorHandle.clearHighlights();
  }

  private async animateInsertion(
    editorHandle: ExtendedEditorHandle,
    hunk: DiffHunk
  ): Promise<void> {
    const { modifiedStart, modifiedText } = hunk;

    if (!modifiedText) return;

    // Calculate insertion point (line and column)
    let insertLine = modifiedStart;
    let insertColumn = 1;

    // If this is a pure add, we need to insert at the right position
    // For now, we insert at the beginning of the target line

    // Reveal and focus the insertion line
    editorHandle.revealLineSmooth(insertLine);

    // Get animation speed
    const speed = useLiveEditStore.getState().animationSpeed;
    const charsPerFrame = SPEED_CHARS_PER_FRAME[speed];

    // Split into characters for animation
    const chars = modifiedText.split('');
    let charIndex = 0;
    let currentLine = insertLine;
    let currentColumn = insertColumn;

    // First, insert a blank line if needed for 'add' type hunks
    if (hunk.type === 'add') {
      editorHandle.insertText(insertLine, 1, '');
    }

    // Animate character by character
    while (charIndex < chars.length) {
      const state = useLiveEditStore.getState();

      // Check for skip
      if (state.skipRequested) {
        // Insert remaining text instantly
        const remaining = chars.slice(charIndex).join('');
        editorHandle.insertText(currentLine, currentColumn, remaining);
        break;
      }

      // Wait while paused
      while (state.isPaused) {
        await this.sleep(100);
        if (useLiveEditStore.getState().skipRequested) {
          const remaining = chars.slice(charIndex).join('');
          editorHandle.insertText(currentLine, currentColumn, remaining);
          return;
        }
      }

      // Get batch of characters for this frame
      const batchEnd = Math.min(charIndex + charsPerFrame, chars.length);
      const batch = chars.slice(charIndex, batchEnd).join('');

      // Show typing cursor at current position
      editorHandle.showTypingCursor(currentLine, currentColumn);

      // Insert the batch
      editorHandle.insertText(currentLine, currentColumn, batch);

      // Update position tracking
      for (const char of batch) {
        if (char === '\n') {
          currentLine++;
          currentColumn = 1;
        } else {
          currentColumn++;
        }
      }

      charIndex = batchEnd;

      // Wait for next frame (approximately 16ms for 60fps)
      await this.waitFrame();
    }
  }

  private applyInstantly(ctx: AnimationContext): void {
    const { editorHandle, edit } = ctx;

    // Mark as AI editing
    useEditorStore.setState({ _isAIEditing: true });

    // Apply the full content
    editorHandle.setContent(edit.fullContent);

    // Clear AI editing flag
    useEditorStore.setState({ _isAIEditing: false });

    // Hide cursor and highlight
    editorHandle.hideTypingCursor();
    editorHandle.highlightLines(edit.startLine, edit.endLine);

    // Clear skip request
    useLiveEditStore.getState().clearSkipRequest();

    ctx.onComplete();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private waitFrame(): Promise<void> {
    return new Promise((resolve) => {
      this.rafId = requestAnimationFrame(() => resolve());
    });
  }

  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.isRunning = false;
    useLiveEditStore.getState().clearQueue();
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

export const animationEngine = new EditAnimationEngine();

// ---------------------------------------------------------------------------
// Helper to start animation processing
// ---------------------------------------------------------------------------

export function startLiveEditAnimation(
  editorHandle: ExtendedEditorHandle
): void {
  animationEngine.processQueue(editorHandle);
}

export function cancelLiveEditAnimation(): void {
  animationEngine.cancel();
}
