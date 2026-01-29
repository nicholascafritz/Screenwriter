// ---------------------------------------------------------------------------
// Animation Engine -- Visual-only edit animation for Monaco
// ---------------------------------------------------------------------------
//
// Animates AI edits in the Monaco editor using a safe visual-only approach:
// 1. Apply the complete correct content ATOMICALLY first
// 2. Then animate visually using decorations and CSS (no structural changes)
//
// This prevents text corruption that occurred with character-by-character
// insertion, which caused stale positions and word splitting.
// ---------------------------------------------------------------------------

import type { DiffHunk } from '@/lib/diff/types';
import type { ExtendedEditorHandle } from '@/components/editor/ScreenplayEditor';
import {
  useLiveEditStore,
  type AnimatedEdit,
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

/** A range of lines that were changed in the edit. */
interface LineRange {
  start: number;
  end: number;
  type: 'add' | 'remove' | 'modify';
}

/** Delay per range based on animation speed. */
const SPEED_DELAY_MS: Record<string, number> = {
  slow: 400,
  normal: 200,
  fast: 80,
  instant: 0,
};

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

  /**
   * Animate an edit using the visual-only approach:
   * 1. Apply full content atomically (prevents corruption)
   * 2. Scroll to changed area
   * 3. Animate visually with cursor movement and highlights
   */
  private async animateEdit(ctx: AnimationContext): Promise<void> {
    const { editorHandle, edit } = ctx;
    const state = useLiveEditStore.getState();

    // Mark as AI editing to suppress human-edit recording
    useEditorStore.setState({ _isAIEditing: true });

    // Phase 1: APPLY - Set the complete correct content atomically
    // This is the key difference from the old approach - we apply FIRST
    editorHandle.setContent(edit.fullContent);

    // Check if instant mode or skip requested - skip visual animation
    if (state.animationSpeed === 'instant' || state.skipRequested) {
      this.finishEdit(ctx);
      return;
    }

    // Phase 2: SCROLL - Navigate to the changed area
    editorHandle.revealLineSmooth(edit.startLine);
    await this.sleep(100); // Brief pause for scroll

    // Phase 3: CALCULATE - Extract changed line ranges from hunks
    const changedRanges = this.extractChangedLineRanges(edit.hunks);

    // If no ranges or very large edit, skip detailed animation
    if (changedRanges.length === 0 || this.isTooLarge(changedRanges)) {
      this.finishEdit(ctx);
      return;
    }

    // Phase 4: ANIMATE - Visual animation with cursor and highlights
    await this.animateLineReveals(editorHandle, changedRanges);

    // Phase 5: CLEANUP
    this.finishEdit(ctx);
  }

  /**
   * Extract line ranges from diff hunks.
   * Uses modifiedStart/End for adds and modifies (since we applied the new content).
   */
  private extractChangedLineRanges(hunks: DiffHunk[]): LineRange[] {
    if (!hunks || hunks.length === 0) return [];

    return hunks
      .map((h) => {
        // For the final content, we care about where the changes appear
        // in the modified (new) document
        let start: number;
        let end: number;

        if (h.type === 'remove') {
          // Removals don't exist in the new content, but we can indicate
          // where the removal happened (approximate)
          start = h.originalStart;
          end = h.originalStart; // Point, not range
        } else {
          // For adds and modifies, use the modified (new) positions
          start = h.modifiedStart;
          end = h.modifiedEnd || h.modifiedStart;
        }

        return {
          start,
          end,
          type: h.type,
        };
      })
      .filter((r) => r.start > 0)
      .sort((a, b) => a.start - b.start);
  }

  /**
   * Check if the edit is too large for detailed animation.
   */
  private isTooLarge(ranges: LineRange[]): boolean {
    const totalLines = ranges.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
    return totalLines > 150;
  }

  /**
   * Animate the reveal of changed lines by moving a typing cursor
   * and highlighting each range sequentially.
   */
  private async animateLineReveals(
    editorHandle: ExtendedEditorHandle,
    ranges: LineRange[]
  ): Promise<void> {
    const speed = useLiveEditStore.getState().animationSpeed;
    const delayPerRange = SPEED_DELAY_MS[speed] || SPEED_DELAY_MS.normal;

    for (let i = 0; i < ranges.length; i++) {
      const currentState = useLiveEditStore.getState();

      // Check for skip request
      if (currentState.skipRequested) {
        break;
      }

      // Wait while paused
      while (currentState.isPaused) {
        await this.sleep(100);
        if (useLiveEditStore.getState().skipRequested) {
          return;
        }
      }

      const range = ranges[i];

      // Show typing cursor at the start of this range
      editorHandle.showTypingCursor(range.start, 1);

      // Scroll to make sure this range is visible
      editorHandle.revealLineSmooth(range.start);

      // Highlight the changed lines
      editorHandle.highlightLines(range.start, range.end);

      // Wait before moving to next range
      await this.sleep(delayPerRange);

      // For larger ranges, animate the cursor moving through
      if (range.end - range.start > 3) {
        const midPoint = Math.floor((range.start + range.end) / 2);
        editorHandle.showTypingCursor(midPoint, 1);
        await this.sleep(delayPerRange / 2);

        editorHandle.showTypingCursor(range.end, 1);
        await this.sleep(delayPerRange / 2);
      }
    }

    // Hide cursor when done
    editorHandle.hideTypingCursor();
  }

  /**
   * Finish the edit - clear flags, highlight result, call completion callback.
   */
  private finishEdit(ctx: AnimationContext): void {
    const { editorHandle, edit } = ctx;

    // Clear AI editing flag
    useEditorStore.setState({ _isAIEditing: false });

    // Hide cursor
    editorHandle.hideTypingCursor();

    // Show final highlight on the affected area
    editorHandle.highlightLines(edit.startLine, edit.endLine);

    // Clear skip request if any
    useLiveEditStore.getState().clearSkipRequest();

    // Call completion callback
    ctx.onComplete();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
