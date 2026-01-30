'use client';

// ---------------------------------------------------------------------------
// ScreenplayEditor -- Main Monaco editor wrapper for Fountain screenplays
// ---------------------------------------------------------------------------
//
// Wraps @monaco-editor/react with Fountain language support, theme, and
// tight integration with the editor Zustand store.  Exposes imperative
// helpers for programmatic content access and line highlighting.
// ---------------------------------------------------------------------------

import React, { useCallback, useRef, useEffect } from 'react';
import Editor, { type OnMount, type BeforeMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { registerFountainLanguage } from './FountainLanguage';
import { registerFountainTheme, FOUNTAIN_THEME_NAME } from './FountainTheme';
import { useEditorStore } from '@/lib/store/editor';
import { setContentWithReconciliation } from '@/lib/orchestration/content-pipeline';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScreenplayEditorProps {
  className?: string;
  onContentChange?: (content: string) => void;
}

/** Basic imperative handle exposed via the module-level getter. */
export interface ScreenplayEditorHandle {
  /** Return the current editor content. */
  getContent: () => string;
  /** Replace the entire editor content programmatically. */
  setContent: (value: string) => void;
  /** Highlight a range of lines with a temporary decoration. */
  highlightLines: (startLine: number, endLine: number) => void;
  /** Clear all decorations added by `highlightLines`. */
  clearHighlights: () => void;
  /** Scroll the editor to reveal a specific line number. */
  revealLine: (line: number) => void;
}

/** Extended handle with additional methods for live edit animation. */
export interface ExtendedEditorHandle extends ScreenplayEditorHandle {
  /** Insert text at a specific position without replacing entire document. */
  insertText: (line: number, column: number, text: string) => void;
  /** Delete a range of text. */
  deleteRange: (startLine: number, startCol: number, endLine: number, endCol: number) => void;
  /** Scroll to line with smooth animation. */
  revealLineSmooth: (line: number) => void;
  /** Show AI typing cursor decoration at position. */
  showTypingCursor: (line: number, column: number) => void;
  /** Hide the AI typing cursor. */
  hideTypingCursor: () => void;
  /** Highlight lines that are about to be deleted. */
  highlightDeletingLines: (startLine: number, endLine: number) => void;
}

// ---------------------------------------------------------------------------
// Module-level handle (accessible outside React tree)
// ---------------------------------------------------------------------------

let _handle: ExtendedEditorHandle | null = null;

/** Retrieve the imperative handle for the mounted editor instance. */
export function getEditorHandle(): ExtendedEditorHandle | null {
  return _handle;
}

// ---------------------------------------------------------------------------
// Monaco editor options
// ---------------------------------------------------------------------------

const EDITOR_OPTIONS: Monaco.editor.IStandaloneEditorConstructionOptions = {
  fontFamily: 'Courier Prime, Courier New, monospace',
  fontSize: 13,
  lineHeight: 20,
  wordWrap: 'off',
  minimap: { enabled: false },
  lineNumbers: 'on',
  renderLineHighlight: 'line',
  scrollBeyondLastLine: false,
  padding: { top: 16, bottom: 16 },
  automaticLayout: true,
  scrollbar: {
    vertical: 'auto',
    horizontal: 'auto',
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
    useShadows: false,
  },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
  contextmenu: true,
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  tabSize: 4,
  insertSpaces: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  smoothScrolling: true,
  mouseWheelZoom: false,
  bracketPairColorization: { enabled: false },
  fixedOverflowWidgets: true,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScreenplayEditor({
  className,
  onContentChange,
}: ScreenplayEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<Monaco.editor.ITextModel | null>(null);
  const decorationsRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const cursorDecorationRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const deletingDecorationRef = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);

  // ---- Store bindings -----------------------------------------------------

  const content = useEditorStore((s) => s.content);
  const setCursor = useEditorStore((s) => s.setCursor);
  const setSelection = useEditorStore((s) => s.setSelection);
  const setCurrentScene = useEditorStore((s) => s.setCurrentScene);
  const screenplay = useEditorStore((s) => s.screenplay);

  // ---- Helpers ------------------------------------------------------------

  /**
   * Walk backwards from the given line to find the nearest scene heading
   * text.  Returns null if no scene heading is found above the cursor.
   */
  const findCurrentScene = useCallback(
    (lineNumber: number): string | null => {
      if (!screenplay) return null;
      // Find the scene whose line range contains the cursor.
      for (let i = screenplay.scenes.length - 1; i >= 0; i--) {
        const scene = screenplay.scenes[i];
        if (lineNumber >= scene.startLine) {
          return scene.heading;
        }
      }
      return null;
    },
    [screenplay],
  );

  /**
   * Provide the current character list from the parsed screenplay so
   * that the Fountain language auto-complete can suggest character names.
   */
  const getCharacters = useCallback((): string[] => {
    const sp = useEditorStore.getState().screenplay;
    return sp?.characters ?? [];
  }, []);

  // ---- Monaco lifecycle callbacks -----------------------------------------

  const handleBeforeMount: BeforeMount = useCallback(
    (monaco) => {
      registerFountainLanguage(monaco, getCharacters);
      registerFountainTheme(monaco);
    },
    [getCharacters],
  );

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      modelRef.current = editor.getModel();

      // Create decoration collections for various operations.
      decorationsRef.current = editor.createDecorationsCollection([]);
      cursorDecorationRef.current = editor.createDecorationsCollection([]);
      deletingDecorationRef.current = editor.createDecorationsCollection([]);

      // -- Cursor position tracking -----------------------------------------
      editor.onDidChangeCursorPosition((e) => {
        const line = e.position.lineNumber;
        const column = e.position.column;
        setCursor(line, column);

        // Detect current scene heading.
        const scene = findCurrentScene(line);
        setCurrentScene(scene);
      });

      // -- Selection tracking -----------------------------------------------
      editor.onDidChangeCursorSelection((e) => {
        const sel = e.selection;
        if (sel.isEmpty()) {
          setSelection(null);
        } else {
          const model = editor.getModel();
          if (model) {
            setSelection(model.getValueInRange(sel));
          }
        }
      });

      // -- Build the imperative handle and expose it module-level -----------
      _handle = {
        getContent: () => {
          const model = editor.getModel();
          return model ? model.getValue() : '';
        },
        setContent: (value: string) => {
          const model = editor.getModel();
          if (model) {
            model.setValue(value);
          }
        },
        highlightLines: (startLine: number, endLine: number) => {
          if (!decorationsRef.current) return;
          const newDecorations: Monaco.editor.IModelDeltaDecoration[] = [
            {
              range: new monaco.Range(startLine, 1, endLine, 1),
              options: {
                isWholeLine: true,
                className: 'screenplay-highlight-line',
                glyphMarginClassName: 'screenplay-highlight-glyph',
              },
            },
          ];
          decorationsRef.current.set(newDecorations);
        },
        clearHighlights: () => {
          if (decorationsRef.current) {
            decorationsRef.current.clear();
          }
        },
        revealLine: (line: number) => {
          // Set cursor position to the beginning of the line
          editor.setPosition({ lineNumber: line, column: 1 });
          // Scroll to center the line in view
          editor.revealLineInCenter(line);
          // Focus the editor to ensure the cursor is visible
          editor.focus();
        },

        // ---- Extended methods for live edit animation ----

        insertText: (line: number, column: number, text: string) => {
          const model = editor.getModel();
          if (!model) return;

          model.applyEdits([
            {
              range: new monaco.Range(line, column, line, column),
              text: text,
              forceMoveMarkers: true,
            },
          ]);
        },

        deleteRange: (
          startLine: number,
          startCol: number,
          endLine: number,
          endCol: number
        ) => {
          const model = editor.getModel();
          if (!model) return;

          model.applyEdits([
            {
              range: new monaco.Range(startLine, startCol, endLine, endCol),
              text: '',
              forceMoveMarkers: true,
            },
          ]);
        },

        revealLineSmooth: (line: number) => {
          // Use smooth scrolling animation (0 = smooth, 1 = immediate)
          editor.revealLineInCenterIfOutsideViewport(line, 0);
        },

        showTypingCursor: (line: number, column: number) => {
          if (!cursorDecorationRef.current) return;

          const decorations: Monaco.editor.IModelDeltaDecoration[] = [
            {
              range: new monaco.Range(line, column, line, column),
              options: {
                className: 'ai-typing-cursor-line',
                beforeContentClassName: 'ai-typing-cursor',
                stickiness:
                  monaco.editor.TrackedRangeStickiness
                    .NeverGrowsWhenTypingAtEdges,
              },
            },
          ];
          cursorDecorationRef.current.set(decorations);
        },

        hideTypingCursor: () => {
          if (cursorDecorationRef.current) {
            cursorDecorationRef.current.clear();
          }
        },

        highlightDeletingLines: (startLine: number, endLine: number) => {
          if (!deletingDecorationRef.current) return;

          const decorations: Monaco.editor.IModelDeltaDecoration[] = [
            {
              range: new monaco.Range(startLine, 1, endLine, 1),
              options: {
                isWholeLine: true,
                className: 'screenplay-deleting-line',
              },
            },
          ];
          deletingDecorationRef.current.set(decorations);
        },
      };
    },
    [setCursor, setSelection, setCurrentScene, findCurrentScene],
  );

  // ---- Content change handler ---------------------------------------------

  const handleChange = useCallback(
    (value: string | undefined) => {
      const text = value ?? '';
      setContentWithReconciliation(text);
      onContentChange?.(text);
    },
    [onContentChange],
  );

  // ---- Cleanup imperative handle on unmount -------------------------------

  useEffect(() => {
    return () => {
      _handle = null;
      editorRef.current = null;
      modelRef.current = null;
    };
  }, []);

  // ---- Render -------------------------------------------------------------

  return (
    <div className={cn('relative h-full w-full', className)}>
      <Editor
        height="100%"
        defaultLanguage="fountain"
        theme={FOUNTAIN_THEME_NAME}
        value={content}
        options={EDITOR_OPTIONS}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        onChange={handleChange}
        loading={
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
