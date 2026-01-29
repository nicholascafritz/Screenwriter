// ---------------------------------------------------------------------------
// Fountain Screenplay Format -- Monaco Light Theme
// ---------------------------------------------------------------------------
//
// Defines a custom light theme called "fountain-light" designed specifically
// for screenwriting in the Fountain format.  The colour palette is chosen
// for a clean, Notion-inspired aesthetic with good contrast and readability.
//
// Usage with @monaco-editor/react:
//
//   import { registerFountainTheme } from './FountainTheme';
//
//   <Editor
//     beforeMount={(monaco) => {
//       registerFountainTheme(monaco);
//     }}
//     theme="fountain-light"
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
export const FOUNTAIN_THEME_NAME = 'fountain-light';

/**
 * Register the `fountain-light` theme with the given Monaco instance.
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
// All colours are chosen for good contrast against a light background
// while remaining visually distinct from one another.
//

const palette = {
  /** Editor background -- off-white. */
  background: '#fafafa',

  /** Default foreground for action / body text. */
  foreground: '#262626',

  /** Scene headings (INT./EXT.) -- emerald green. */
  sceneHeading: '#059669',

  /** Character cues -- blue. */
  character: '#2563eb',

  /** Dialogue text -- dark text. */
  dialogue: '#262626',

  /** Action text -- dark gray. */
  action: '#525252',

  /** Transitions (CUT TO: etc.) -- violet. */
  transition: '#7c3aed',

  /** Parentheticals -- amber/orange. */
  parenthetical: '#d97706',

  /** Section headings (#, ##, ###) -- orange. */
  section: '#ea580c',

  /** Notes ([[ ]]) -- muted gray. */
  note: '#737373',

  /** Boneyard comments -- lighter gray. */
  boneyard: '#a3a3a3',

  /** Synopsis lines (= ...) -- teal. */
  synopsis: '#0d9488',

  /** Lyrics (~ ...) -- pink. */
  lyric: '#db2777',

  /** Centered text (> ... <) -- cyan/blue. */
  centered: '#0891b2',

  /** Page breaks (===) -- dark. */
  pageBreak: '#262626',

  /** Title page key: value pairs -- brown. */
  titlePage: '#92400e',

  /** Bold emphasis modifier. */
  bold: '#171717',

  /** Italic emphasis modifier. */
  italic: '#404040',

  // -- Editor chrome colours --

  /** Line numbers. */
  lineNumber: '#a3a3a3',

  /** Active line number. */
  lineNumberActive: '#525252',

  /** Cursor colour. */
  cursor: '#262626',

  /** Selection highlight. */
  selection: '#0066ff22',

  /** Current line highlight. */
  lineHighlight: '#f5f5f5',

  /** Widget / suggestion background. */
  widget: '#ffffff',

  /** Widget border. */
  widgetBorder: '#e5e5e5',

  /** Scrollbar. */
  scrollbar: '#d4d4d4',

  /** Minimap. */
  minimapBackground: '#f5f5f5',
} as const;

// ---------------------------------------------------------------------------
// Theme definition
// ---------------------------------------------------------------------------

const themeData: Monaco.editor.IStandaloneThemeData = {
  base: 'vs',
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
    'editor.inactiveSelectionBackground': '#0066ff11',
    'editor.selectionHighlightBackground': '#0066ff11',

    // -- Line numbers ----------------------------------------------------
    'editorLineNumber.foreground': palette.lineNumber,
    'editorLineNumber.activeForeground': palette.lineNumberActive,

    // -- Gutter / margins ------------------------------------------------
    'editorGutter.background': palette.background,

    // -- Indentation guides ----------------------------------------------
    'editorIndentGuide.background': '#e5e5e5',
    'editorIndentGuide.activeBackground': '#d4d4d4',

    // -- Bracket matching ------------------------------------------------
    'editorBracketMatch.background': '#0066ff22',
    'editorBracketMatch.border': '#0066ff44',

    // -- Widgets (autocomplete, hover, etc.) -----------------------------
    'editorWidget.background': palette.widget,
    'editorWidget.border': palette.widgetBorder,
    'editorWidget.foreground': palette.foreground,
    'editorSuggestWidget.background': palette.widget,
    'editorSuggestWidget.border': palette.widgetBorder,
    'editorSuggestWidget.foreground': palette.foreground,
    'editorSuggestWidget.highlightForeground': palette.character,
    'editorSuggestWidget.selectedBackground': '#f5f5f5',

    // -- Scrollbar -------------------------------------------------------
    'scrollbar.shadow': '#00000008',
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
    'editor.wordHighlightBackground': '#0066ff15',
    'editor.wordHighlightStrongBackground': '#0066ff25',

    // -- Overview ruler (right-edge markers) -----------------------------
    'editorOverviewRuler.border': '#00000000',

    // -- Drop-down / list ------------------------------------------------
    'list.hoverBackground': '#f5f5f5',
    'list.activeSelectionBackground': '#0066ff22',
    'list.activeSelectionForeground': palette.foreground,
    'list.focusBackground': '#0066ff22',
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
