// ---------------------------------------------------------------------------
// Fountain Screenplay Format -- AST Type Definitions
// ---------------------------------------------------------------------------

/**
 * Every element that can appear in a Fountain screenplay.
 *
 * Reference: https://fountain.io/syntax
 */
export type ElementType =
  | 'title_page'
  | 'scene_heading'
  | 'action'
  | 'character'
  | 'dialogue'
  | 'parenthetical'
  | 'transition'
  | 'centered'
  | 'section'
  | 'synopsis'
  | 'note'
  | 'boneyard'
  | 'page_break'
  | 'lyric'
  | 'dual_dialogue_begin'
  | 'dual_dialogue_end';

// ---------------------------------------------------------------------------
// Core AST node
// ---------------------------------------------------------------------------

/**
 * A single parsed element from a Fountain document.
 *
 * `startLine` and `endLine` are 1-based inclusive line numbers that map back
 * to the original source text so that editors can highlight ranges.
 */
export interface ScriptElement {
  /** Fountain element type. */
  type: ElementType;

  /** Raw text content of the element (markup characters stripped). */
  text: string;

  /**
   * Scene number when explicitly provided in the source, e.g.
   *   INT. HOUSE - DAY #42#
   */
  sceneNumber?: string;

  /** Depth for `section` elements (number of leading `#` characters). */
  depth?: number;

  /**
   * Normalised character name (uppercase, trimmed) extracted from
   * `character` elements.  For convenience this is also set on
   * `dialogue` and `parenthetical` elements that belong to that
   * character block.
   */
  characterName?: string;

  /**
   * Parenthetical extension such as `V.O.`, `O.S.`, or `CONT'D`
   * found in a character cue line.
   */
  extension?: string;

  /**
   * When the element belongs to a dual-dialogue block, indicates
   * whether it is on the left or right side.
   */
  dual?: 'left' | 'right';

  /** 1-based inclusive start line in the source. */
  startLine: number;

  /** 1-based inclusive end line in the source. */
  endLine: number;
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export type IntExt = 'INT' | 'EXT' | 'INT/EXT' | 'I/E';

/**
 * A scene is a logical grouping that starts with a scene heading and
 * includes every element up to (but not including) the next scene heading.
 */
export interface Scene {
  /** Unique identifier generated for every scene (stable within a parse). */
  id: string;

  /** Full scene heading text (e.g. "INT. COFFEE SHOP - MORNING"). */
  heading: string;

  /** Location portion of the scene heading (text between INT/EXT and dash). */
  location: string;

  /** Time of day portion (text after the last dash). */
  timeOfDay: string;

  /** Whether the scene is interior, exterior, or both. */
  intExt: IntExt;

  /** All elements that belong to this scene (excluding the heading itself). */
  elements: ScriptElement[];

  /** Unique character names that speak within this scene. */
  characters: string[];

  /** Explicit scene number when provided. */
  sceneNumber?: string;

  /** 1-based start line of the scene heading. */
  startLine: number;

  /** 1-based end line of the last element in the scene. */
  endLine: number;
}

// ---------------------------------------------------------------------------
// Top-level parse result
// ---------------------------------------------------------------------------

/**
 * The complete result of parsing a Fountain document.
 */
export interface Screenplay {
  /** Key/value pairs from the title page block. */
  titlePage: Record<string, string>;

  /** Flat list of every parsed element in document order. */
  elements: ScriptElement[];

  /** Sorted list of unique character names found in the screenplay. */
  characters: string[];

  /** Sorted list of unique locations extracted from scene headings. */
  locations: string[];

  /** Scenes derived by grouping elements under scene headings. */
  scenes: Scene[];

  /** Estimated page count (approx. 56 lines per page). */
  pageCount: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  /** Human-readable description of the problem. */
  message: string;

  /** Severity level. */
  severity: ValidationSeverity;

  /** 1-based line number where the issue was detected. */
  line: number;

  /** Optional column offset (1-based). */
  column?: number;

  /** Machine-readable rule identifier. */
  rule: string;
}

// ---------------------------------------------------------------------------
// Structural analysis
// ---------------------------------------------------------------------------

/** A screenplay act, detected from section headers or heuristics. */
export interface Act {
  /** Sequential act number (1-based). */
  number: number;

  /** Display label (e.g. "Act One", "ACT I"). */
  label: string;

  /** Source of detection: 'section' (from # headers) or 'heuristic'. */
  source: 'section' | 'heuristic';

  /** Scenes belonging to this act (by index into Screenplay.scenes). */
  sceneIndices: number[];

  /** 1-based start line in source. */
  startLine: number;

  /** 1-based end line in source. */
  endLine: number;
}

/** A narrative sequence -- a thematic grouping of scenes within an act. */
export interface Sequence {
  /** Sequential sequence number within its act. */
  number: number;

  /** Descriptive label (derived from dominant location or theme). */
  label: string;

  /** Scene indices in this sequence. */
  sceneIndices: number[];

  /** Act this sequence belongs to. */
  actNumber: number;

  /** 1-based start line in source. */
  startLine: number;

  /** 1-based end line in source. */
  endLine: number;
}

/** Full structural analysis of a screenplay. */
export interface ScreenplayStructure {
  acts: Act[];
  sequences: Sequence[];

  /** Total scene count for reference. */
  sceneCount: number;

  /** Whether structure was detected from explicit markers or inferred. */
  detectionMethod: 'explicit' | 'heuristic' | 'mixed';
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface ScreenplayAnalytics {
  /** Estimated page count. */
  pageCount: number;

  /** Total number of scenes. */
  sceneCount: number;

  /** Sorted unique character names. */
  characters: string[];

  /** Sorted unique locations. */
  locations: string[];

  /** Total number of parsed elements. */
  elementCount: number;

  /** Number of dialogue elements. */
  dialogueCount: number;

  /** Number of action elements. */
  actionCount: number;

  /** Ratio of dialogue elements to action elements (0 when no action). */
  dialogueToActionRatio: number;

  /** Estimated number of lines in the formatted output. */
  lineCount: number;

  /** Per-character dialogue line counts, sorted descending by count. */
  characterDialogueCounts: { name: string; count: number }[];
}
