// ---------------------------------------------------------------------------
// Outline Types -- The structural spine of a screenplay project
// ---------------------------------------------------------------------------
//
// The Outline is the persistent scene identity layer. Every scene in a
// screenplay gets a stable SceneId that survives re-parsing, heading edits,
// reordering, and rewrites. All features (comments, beats, characters,
// timeline, AI tools) reference scenes through SceneIds.
// ---------------------------------------------------------------------------

/**
 * Stable scene identifier. Format: "sc_<random>".
 * Persisted across parses and editing sessions.
 */
export type SceneId = string;

// ---------------------------------------------------------------------------
// Scene entry
// ---------------------------------------------------------------------------

/**
 * A single scene in the Outline. Combines structural identity (stable ID,
 * heading) with metadata (summary, beat assignment, character presence)
 * and a live link to the Fountain source (fountainRange).
 */
export interface OutlineEntry {
  /** Stable ID that survives re-parsing, reordering, editing. */
  id: SceneId;

  /** Scene heading text (e.g. "INT. COFFEE SHOP - MORNING"). */
  heading: string;

  /** INT/EXT classification. */
  intExt: 'INT' | 'EXT' | 'INT/EXT' | 'I/E' | '';

  /** Location extracted from heading. */
  location: string;

  /** Time of day extracted from heading. */
  timeOfDay: string;

  /** Writer's summary/notes for this scene (from guide or manual entry). */
  summary: string;

  /** Beat this scene belongs to (BeatSheetEntry.id), or null. */
  beatId: string | null;

  /** Characters present in this scene (CharacterProfile.id values). */
  characterIds: string[];

  /** Sort position in the Outline. */
  sortIndex: number;

  /**
   * Line range in current Fountain text. Updated on every reconciliation.
   * Null when the scene exists in the Outline but not yet in Fountain
   * (i.e. planned but not yet written).
   */
  fountainRange: { startLine: number; endLine: number } | null;

  /** Explicit scene number when provided via Fountain #N# syntax. */
  sceneNumber: string | null;

  /** Writer-facing status. */
  status: 'planned' | 'drafted' | 'revised' | 'locked';
}

// ---------------------------------------------------------------------------
// Act & Sequence
// ---------------------------------------------------------------------------

/** An act grouping scenes in the Outline. */
export interface OutlineAct {
  id: string;
  label: string;
  sceneIds: SceneId[];
  source: 'explicit' | 'heuristic' | 'manual';
}

/** A sequence (sub-act grouping) in the Outline. */
export interface OutlineSequence {
  id: string;
  label: string;
  sceneIds: SceneId[];
  actId: string;
  source: 'auto' | 'manual';
}

// ---------------------------------------------------------------------------
// Top-level Outline
// ---------------------------------------------------------------------------

/** The full Outline for a project. */
export interface Outline {
  projectId: string;

  /** Ordered list of scene entries. */
  scenes: OutlineEntry[];

  /** Act structure (references scenes by SceneId). */
  acts: OutlineAct[];

  /** Sequence groupings within acts. */
  sequences: OutlineSequence[];

  updatedAt: number;
}
