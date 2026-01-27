// ---------------------------------------------------------------------------
// Fountain Screenplay Format -- Monaco Monarch Tokenizer & Language Support
// ---------------------------------------------------------------------------
//
// Registers a custom "fountain" language with Monaco's Monarch tokenizer
// engine, providing syntax highlighting for the full Fountain screenplay
// specification (https://fountain.io/syntax).
//
// Usage with @monaco-editor/react:
//
//   import { registerFountainLanguage } from './FountainLanguage';
//
//   <Editor
//     beforeMount={(monaco) => {
//       registerFountainLanguage(monaco);
//     }}
//   />
//
// ---------------------------------------------------------------------------

import type * as Monaco from 'monaco-editor';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register the `fountain` language, its tokenizer, and an optional
 * character-name completion provider with the given Monaco instance.
 *
 * @param monaco         The Monaco namespace (provided by `beforeMount`).
 * @param getCharacters  Optional callback that returns the current list of
 *                       character names for auto-completion. When omitted the
 *                       completion provider is still registered but returns
 *                       an empty set.
 */
export function registerFountainLanguage(
  monaco: typeof Monaco,
  getCharacters?: () => string[],
): void {
  // Guard against double-registration (e.g. HMR in development).
  const existing = monaco.languages.getLanguages();
  if (existing.some((lang) => lang.id === LANGUAGE_ID)) {
    return;
  }

  // 1. Register the language identifier.
  monaco.languages.register({
    id: LANGUAGE_ID,
    extensions: ['.fountain', '.spmd'],
    aliases: ['Fountain', 'fountain', 'Screenplay'],
    mimetypes: ['text/x-fountain'],
  });

  // 2. Set the language configuration (brackets, comments, etc.).
  monaco.languages.setLanguageConfiguration(LANGUAGE_ID, languageConfiguration);

  // 3. Set the Monarch tokenizer.
  monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, monarchTokenizer);

  // 4. Register the completion item provider for character names.
  monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    triggerCharacters: [],

    provideCompletionItems(
      model: Monaco.editor.ITextModel,
      position: Monaco.Position,
    ): Monaco.languages.ProviderResult<Monaco.languages.CompletionList> {
      const characters = getCharacters ? getCharacters() : [];

      if (characters.length === 0) {
        return { suggestions: [] };
      }

      const lineContent = model.getLineContent(position.lineNumber);
      const word = model.getWordUntilPosition(position);

      const range: Monaco.IRange = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      };

      // Only suggest character names when the line looks like it could be a
      // character cue: the cursor is on a line that (so far) is uppercase,
      // and the previous line is blank (or we are at line 1).
      const trimmed = lineContent.trim();
      const isPotentialCharacterCue =
        trimmed.length > 0 &&
        trimmed === trimmed.toUpperCase() &&
        /^[A-Z]/.test(trimmed);

      const prevLineBlank =
        position.lineNumber <= 1 ||
        model.getLineContent(position.lineNumber - 1).trim().length === 0;

      if (!isPotentialCharacterCue || !prevLineBlank) {
        return { suggestions: [] };
      }

      const suggestions: Monaco.languages.CompletionItem[] = characters.map(
        (name) => ({
          label: name,
          kind: monaco.languages.CompletionItemKind.Value,
          detail: 'Character',
          insertText: name,
          range,
          sortText: name.toLowerCase(),
        }),
      );

      return { suggestions };
    },
  });
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANGUAGE_ID = 'fountain';

// ---------------------------------------------------------------------------
// Language configuration
// ---------------------------------------------------------------------------

const languageConfiguration: Monaco.languages.LanguageConfiguration = {
  comments: {
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['[[', ']]'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '[[', close: ']]' },
    { open: '(', close: ')' },
    { open: '/*', close: '*/' },
    { open: '*', close: '*' },
    { open: '**', close: '**' },
    { open: '_', close: '_' },
  ],
  surroundingPairs: [
    { open: '(', close: ')' },
    { open: '*', close: '*' },
    { open: '**', close: '**' },
    { open: '_', close: '_' },
    { open: '[[', close: ']]' },
  ],
  folding: {
    markers: {
      start: /^(#{1,3}\s|INT|EXT|EST|INT\.\/EXT|INT\/EXT|I\/E)/i,
      end: /^\s*$/,
    },
  },
  wordPattern: /(-?\d*\.\d\w*)|([^\s`~!@#$%^&*()=+[\]{};:'"<>,.?/\\|]+)/,
};

// ---------------------------------------------------------------------------
// Monarch tokenizer
// ---------------------------------------------------------------------------
//
// Monarch is Monaco's declarative tokenization engine. Rules are matched
// against each line from left-to-right.  The `@` prefix refers to tokenizer
// state names; `$` refers to regex captures.
//
// Key design decisions:
//
// - Scene headings, transitions, sections, synopses, lyrics, centered text,
//   and page breaks are all detectable from a single line with a regex.
//
// - Character cues are uppercase lines.  Because Monarch does not carry
//   inter-line context the same way a full parser does, we use a dedicated
//   `dialogue` state that is entered when we see an all-caps line that
//   matches character-cue patterns.  Lines in this state are tokenized as
//   dialogue or parentheticals until a blank line is encountered, which
//   pops back to the root state.
//
// - Multi-line notes (`[[ ... ]]`) and boneyard comments (`/* ... */`) each
//   have their own states.
//
// - Title page key/value pairs are detected at the start of the document
//   by matching lines that begin with a word followed by a colon.
// ---------------------------------------------------------------------------

const monarchTokenizer: Monaco.languages.IMonarchLanguage = {
  defaultToken: 'variable.action',
  ignoreCase: false,

  // These regular expressions are used inside rules via `@sceneHeadingPrefix`
  // syntax.  Monarch interpolates them at compile time.
  sceneHeadingPrefix:
    /(?:INT\.\/EXT\.|INT\.\/EXT|INT\/EXT\.|INT\/EXT|I\/E\.|I\/E|EXT\.|EXT|EST\.|EST|INT\.|INT)/,

  tokenizer: {
    // -------------------------------------------------------------------
    // Root state
    // -------------------------------------------------------------------
    root: [
      // --- Boneyard (multi-line comment) --------------------------------
      [/\/\*/, 'comment.boneyard', '@boneyard'],

      // --- Multi-line note ----------------------------------------------
      [/\[\[/, 'comment.note', '@note'],

      // --- Page break (three or more equals signs) ----------------------
      [/^={3,}\s*$/, 'keyword.pagebreak'],

      // --- Section headings (#, ##, ###) --------------------------------
      [/^#{1,3}\s+.*$/, 'tag.section'],

      // --- Synopsis (= but not ==) --------------------------------------
      [/^=(?!=).*$/, 'comment.synopsis'],

      // --- Centered text (> ... <) --------------------------------------
      [/^>.*<\s*$/, 'string.centered'],

      // --- Forced scene heading (leading period, not ..) ----------------
      [/^\.[^.].*$/, 'keyword.scene-heading'],

      // --- Natural scene heading (INT./EXT./etc.) -----------------------
      // The `@sceneHeadingPrefix` reference is interpolated by Monarch.
      [
        /^(?:INT\.\/EXT\.|INT\.\/EXT|INT\/EXT\.|INT\/EXT|I\/E\.|I\/E|EXT\.|EXT|EST\.|EST|INT\.|INT)\s.*$/i,
        'keyword.scene-heading',
      ],

      // --- Forced transition (leading >) --------------------------------
      // Must not match centered text (already handled above).
      [/^>(?!.*<\s*$).*$/, 'keyword.transition'],

      // --- Natural transition (all caps ending with TO:) ----------------
      [/^[A-Z\s]+TO:\s*$/, 'keyword.transition'],

      // --- Lyric (leading ~) --------------------------------------------
      [/^~.*$/, 'string.lyric'],

      // --- Forced character cue (leading @) -----------------------------
      [/^@.*$/, 'type.character', '@dialogue'],

      // --- Character cue (all uppercase line) ---------------------------
      // This matches lines that are entirely uppercase letters, digits,
      // spaces, periods, apostrophes, and hyphens, optionally followed
      // by a parenthetical extension and/or a ^ for dual dialogue.
      // We require at least one uppercase letter to avoid matching blank
      // or numeric-only lines.
      [
        /^[A-Z][A-Z0-9 '.\-]*(?:\s*\(.*\))?(?:\s*\^)?\s*$/,
        'type.character',
        '@dialogue',
      ],

      // --- Title page key: value pairs ----------------------------------
      // These only appear at the top of the document, but Monarch does not
      // track document position, so we match the pattern anywhere.  In
      // practice, after the first blank line the body begins and these
      // patterns are unlikely to fire on real screenplay content.
      [/^[A-Za-z][A-Za-z\s]*:.*$/, 'attribute.title-page'],

      // --- Forced action (leading !) ------------------------------------
      [/^!.*$/, 'variable.action'],

      // --- Inline note on a single line ---------------------------------
      [/\[\[.*?\]\]/, 'comment.note'],

      // --- Inline emphasis (bold italic) --------------------------------
      [/\*{3}[^*]+\*{3}/, 'variable.action.bold-italic'],
      [/\*{2}[^*]+\*{2}/, 'variable.action.bold'],
      [/\*[^*]+\*/, 'variable.action.italic'],
      [/_[^_]+_/, 'variable.action.underline'],

      // --- Default: action text -----------------------------------------
      [/./, 'variable.action'],
    ],

    // -------------------------------------------------------------------
    // Dialogue state
    // -------------------------------------------------------------------
    // Entered after a character cue.  Tokenizes subsequent lines as
    // dialogue or parentheticals until a blank line is encountered.
    // -------------------------------------------------------------------
    dialogue: [
      // A blank line ends the dialogue block and returns to root.
      [/^\s*$/, 'white', '@pop'],

      // Boneyard inside dialogue.
      [/\/\*/, 'comment.boneyard', '@boneyard'],

      // Inline note inside dialogue.
      [/\[\[/, 'comment.note', '@note'],

      // Parenthetical: line wrapped in parentheses.
      [/^\s*\(.*\)\s*$/, 'string.parenthetical'],

      // Inline emphasis within dialogue.
      [/\*{3}[^*]+\*{3}/, 'string.dialogue.bold-italic'],
      [/\*{2}[^*]+\*{2}/, 'string.dialogue.bold'],
      [/\*[^*]+\*/, 'string.dialogue.italic'],
      [/_[^_]+_/, 'string.dialogue.underline'],

      // Dialogue text.
      [/./, 'string.dialogue'],
    ],

    // -------------------------------------------------------------------
    // Note state: handles multi-line [[ ... ]]
    // -------------------------------------------------------------------
    note: [
      [/\]\]/, 'comment.note', '@pop'],
      [/./, 'comment.note'],
    ],

    // -------------------------------------------------------------------
    // Boneyard state: handles multi-line /* ... */
    // -------------------------------------------------------------------
    boneyard: [
      [/\*\//, 'comment.boneyard', '@pop'],
      [/./, 'comment.boneyard'],
    ],
  },
};
