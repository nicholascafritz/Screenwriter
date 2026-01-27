// ---------------------------------------------------------------------------
// Fountain Screenplay Format -- Monaco Dark Theme
// ---------------------------------------------------------------------------
//
// Defines a custom dark theme called "fountain-dark" designed specifically
// for screenwriting in the Fountain format.  The colour palette is chosen
// for long writing sessions: a dark blue-black background with carefully
// selected accent colours that map to each screenplay element type.
//
// Usage with @monaco-editor/react:
//
//   import { registerFountainTheme } from './FountainTheme';
//
//   <Editor
//     beforeMount={(monaco) => {
//       registerFountainTheme(monaco);
//     }}
//     theme="fountain-dark"
//   />
//
// The token names referenced here correspond to those emitted by the
// Monarch tokenizer in FountainLanguage.ts.
//
// ---------------------------------------------------------------------------

import type * as Monaco from 'monaco-editor';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** The theme name to pass to Monaco's `theme` prop. */
export const FOUNTAIN_THEME_NAME = 'fountain-dark';

/**
 * Register the `fountain-dark` theme with the given Monaco instance.
 *
 * Call this inside the `beforeMount` callback of `@monaco-editor/react`
 * (alongside `registerFountainLanguage`).
 */
export function registerFountainTheme(monaco: typeof Monaco): void {
  monaco.editor.defineTheme(FOUNTAIN_THEME_NAME, themeData);
}

// ---------------------------------------------------------------------------
// Colour palette
// ---------------------------------------------------------------------------
//
// All colours are chosen to satisfy WCAG AA contrast against the dark
// background while remaining visually distinct from one another.
//

const palette = {
  /** Editor background -- dark blue-black. */
  background: '#1a1a2e',

  /** Default foreground for action / body text. */
  foreground: '#e2e8f0',

  /** Scene headings (INT./EXT.) -- bright green. */
  sceneHeading: '#4ade80',

  /** Character cues -- bright blue. */
  character: '#60a5fa',

  /** Dialogue text -- warm white. */
  dialogue: '#e2e8f0',

  /** Action text -- light gray. */
  action: '#94a3b8',

  /** Transitions (CUT TO: etc.) -- purple. */
  transition: '#c084fc',

  /** Parentheticals -- yellow. */
  parenthetical: '#fbbf24',

  /** Section headings (#, ##, ###) -- orange. */
  section: '#fb923c',

  /** Notes ([[ ]]) -- dim gray. */
  note: '#64748b',

  /** Boneyard comments -- darker dim gray. */
  boneyard: '#475569',

  /** Synopsis lines (= ...) -- muted teal. */
  synopsis: '#2dd4bf',

  /** Lyrics (~ ...) -- pink. */
  lyric: '#f472b6',

  /** Centered text (> ... <) -- cyan. */
  centered: '#22d3ee',

  /** Page breaks (===) -- bright white. */
  pageBreak: '#ffffff',

  /** Title page key: value pairs -- muted gold. */
  titlePage: '#d4a574',

  /** Bold emphasis modifier. */
  bold: '#f8fafc',

  /** Italic emphasis modifier. */
  italic: '#cbd5e1',

  // -- Editor chrome colours --

  /** Line numbers. */
  lineNumber: '#4a5568',

  /** Active line number. */
  lineNumberActive: '#94a3b8',

  /** Cursor colour. */
  cursor: '#ffffff',

  /** Selection highlight. */
  selection: '#3b82f633',

  /** Current line highlight. */
  lineHighlight: '#1e293b',

  /** Widget / suggestion background. */
  widget: '#1e1e3a',

  /** Widget border. */
  widgetBorder: '#2d2d52',

  /** Scrollbar. */
  scrollbar: '#2d2d52',

  /** Minimap. */
  minimapBackground: '#16162a',
} as const;

// ---------------------------------------------------------------------------
// Theme definition
// ---------------------------------------------------------------------------

const themeData: Monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,

  colors: {
    // -- General editor chrome -------------------------------------------
    'editor.background': palette.background,
    'editor.foreground': palette.foreground,
    'editor.lineHighlightBackground': palette.lineHighlight,
    'editor.lineHighlightBorder': '#00000000',

    // -- Cursor ----------------------------------------------------------
    'editorCursor.foreground': palette.cursor,

    // -- Selection -------------------------------------------------------
    'editor.selectionBackground': palette.selection,
    'editor.inactiveSelectionBackground': '#3b82f61a',
    'editor.selectionHighlightBackground': '#3b82f61a',

    // -- Line numbers ----------------------------------------------------
    'editorLineNumber.foreground': palette.lineNumber,
    'editorLineNumber.activeForeground': palette.lineNumberActive,

    // -- Gutter / margins ------------------------------------------------
    'editorGutter.background': palette.background,

    // -- Indentation guides ----------------------------------------------
    'editorIndentGuide.background': '#2d2d52',
    'editorIndentGuide.activeBackground': '#4a5568',

    // -- Bracket matching ------------------------------------------------
    'editorBracketMatch.background': '#3b82f633',
    'editorBracketMatch.border': '#3b82f680',

    // -- Widgets (autocomplete, hover, etc.) -----------------------------
    'editorWidget.background': palette.widget,
    'editorWidget.border': palette.widgetBorder,
    'editorWidget.foreground': palette.foreground,
    'editorSuggestWidget.background': palette.widget,
    'editorSuggestWidget.border': palette.widgetBorder,
    'editorSuggestWidget.foreground': palette.foreground,
    'editorSuggestWidget.highlightForeground': palette.character,
    'editorSuggestWidget.selectedBackground': '#2d2d52',

    // -- Scrollbar -------------------------------------------------------
    'scrollbar.shadow': '#00000000',
    'scrollbarSlider.background': palette.scrollbar + '80',
    'scrollbarSlider.hoverBackground': palette.scrollbar + 'cc',
    'scrollbarSlider.activeBackground': palette.scrollbar + 'ff',

    // -- Minimap ---------------------------------------------------------
    'minimap.background': palette.minimapBackground,
    'minimapSlider.background': palette.scrollbar + '40',

    // -- Find / search ---------------------------------------------------
    'editor.findMatchBackground': '#fbbf2440',
    'editor.findMatchHighlightBackground': '#fbbf2420',

    // -- Word highlight --------------------------------------------------
    'editor.wordHighlightBackground': '#3b82f620',
    'editor.wordHighlightStrongBackground': '#3b82f630',

    // -- Overview ruler (right-edge markers) -----------------------------
    'editorOverviewRuler.border': '#00000000',

    // -- Drop-down / list ------------------------------------------------
    'list.hoverBackground': '#2d2d52',
    'list.activeSelectionBackground': '#3b82f633',
    'list.activeSelectionForeground': palette.foreground,
    'list.focusBackground': '#3b82f633',
    'list.highlightForeground': palette.character,
  },

  rules: [
    // -- Scene headings --------------------------------------------------
    {
      token: 'keyword.scene-heading',
      foreground: palette.sceneHeading.slice(1),
      fontStyle: 'bold',
    },

    // -- Characters ------------------------------------------------------
    {
      token: 'type.character',
      foreground: palette.character.slice(1),
      fontStyle: 'bold',
    },

    // -- Dialogue --------------------------------------------------------
    {
      token: 'string.dialogue',
      foreground: palette.dialogue.slice(1),
    },
    {
      token: 'string.dialogue.bold-italic',
      foreground: palette.bold.slice(1),
      fontStyle: 'bold italic',
    },
    {
      token: 'string.dialogue.bold',
      foreground: palette.bold.slice(1),
      fontStyle: 'bold',
    },
    {
      token: 'string.dialogue.italic',
      foreground: palette.italic.slice(1),
      fontStyle: 'italic',
    },
    {
      token: 'string.dialogue.underline',
      foreground: palette.dialogue.slice(1),
      fontStyle: 'underline',
    },

    // -- Parentheticals --------------------------------------------------
    {
      token: 'string.parenthetical',
      foreground: palette.parenthetical.slice(1),
      fontStyle: 'italic',
    },

    // -- Transitions -----------------------------------------------------
    {
      token: 'keyword.transition',
      foreground: palette.transition.slice(1),
      fontStyle: 'bold',
    },

    // -- Centered text ---------------------------------------------------
    {
      token: 'string.centered',
      foreground: palette.centered.slice(1),
    },

    // -- Action text -----------------------------------------------------
    {
      token: 'variable.action',
      foreground: palette.action.slice(1),
    },
    {
      token: 'variable.action.bold-italic',
      foreground: palette.bold.slice(1),
      fontStyle: 'bold italic',
    },
    {
      token: 'variable.action.bold',
      foreground: palette.bold.slice(1),
      fontStyle: 'bold',
    },
    {
      token: 'variable.action.italic',
      foreground: palette.italic.slice(1),
      fontStyle: 'italic',
    },
    {
      token: 'variable.action.underline',
      foreground: palette.action.slice(1),
      fontStyle: 'underline',
    },

    // -- Sections --------------------------------------------------------
    {
      token: 'tag.section',
      foreground: palette.section.slice(1),
      fontStyle: 'bold',
    },

    // -- Synopsis --------------------------------------------------------
    {
      token: 'comment.synopsis',
      foreground: palette.synopsis.slice(1),
      fontStyle: 'italic',
    },

    // -- Notes -----------------------------------------------------------
    {
      token: 'comment.note',
      foreground: palette.note.slice(1),
      fontStyle: 'italic',
    },

    // -- Boneyard (comments) ---------------------------------------------
    {
      token: 'comment.boneyard',
      foreground: palette.boneyard.slice(1),
      fontStyle: 'italic',
    },

    // -- Lyrics ----------------------------------------------------------
    {
      token: 'string.lyric',
      foreground: palette.lyric.slice(1),
      fontStyle: 'italic',
    },

    // -- Page breaks -----------------------------------------------------
    {
      token: 'keyword.pagebreak',
      foreground: palette.pageBreak.slice(1),
      fontStyle: 'bold',
    },

    // -- Title page ------------------------------------------------------
    {
      token: 'attribute.title-page',
      foreground: palette.titlePage.slice(1),
    },

    // -- Whitespace / default --------------------------------------------
    {
      token: 'white',
      foreground: palette.foreground.slice(1),
    },
    {
      token: '',
      foreground: palette.action.slice(1),
    },
  ],
};
