// ---------------------------------------------------------------------------
// Diff Engine -- Type Definitions
// ---------------------------------------------------------------------------

/**
 * A single hunk within a diff result, representing one contiguous region
 * of change between the original and modified texts.
 */
export interface DiffHunk {
  /** Unique identifier for this hunk. */
  id: string;

  /** The kind of change this hunk represents. */
  type: 'add' | 'remove' | 'modify';

  /** 1-based start line in the original text (0 when type is 'add'). */
  originalStart: number;

  /** 1-based end line in the original text (0 when type is 'add'). */
  originalEnd: number;

  /** 1-based start line in the modified text (0 when type is 'remove'). */
  modifiedStart: number;

  /** 1-based end line in the modified text (0 when type is 'remove'). */
  modifiedEnd: number;

  /** The original text content covered by this hunk. */
  originalText: string;

  /** The modified text content that replaces the original. */
  modifiedText: string;

  /** Whether this hunk has been accepted by the user (for selective apply). */
  accepted?: boolean;
}

/**
 * The complete result of comparing two texts.
 */
export interface DiffResult {
  /** Ordered list of change hunks. */
  hunks: DiffHunk[];

  /** The full original text that was compared. */
  originalText: string;

  /** The full modified text that was compared. */
  modifiedText: string;

  /** Human-readable summary of what changed. */
  summary: string;
}

/**
 * A single entry in the edit timeline, tracking every change made to the
 * screenplay -- whether by the human writer or by AI assistance.
 */
export interface TimelineEntry {
  /** Unique identifier for this timeline entry. */
  id: string;

  /** Unix timestamp (milliseconds) when the edit occurred. */
  timestamp: number;

  /** Who initiated the change. */
  source: 'human' | 'ai';

  /** Human-readable description of what was changed. */
  description: string;

  /** The diff representing the change. */
  diff: DiffResult;

  /** Name of the scene affected, if applicable. */
  sceneName?: string;

  /** Stable SceneIds of scenes whose fountain ranges overlap with this edit. */
  affectedSceneIds?: string[];

  /** Whether this edit can be undone. */
  undoable: boolean;

  /** Project this entry belongs to (for persistence). */
  projectId?: string;
}
