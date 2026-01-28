// ---------------------------------------------------------------------------
// Story Bible Types -- Structured project context
// ---------------------------------------------------------------------------

export interface CharacterProfile {
  id: string;
  name: string;
  description: string;
  arc: string;
  relationships: { characterId: string; relationship: string }[];
  notes: string;
}

export interface LocationProfile {
  id: string;
  name: string;
  description: string;
  /** @deprecated Use `useOutlineStore.getScenesForLocation()` instead. Kept for Firestore backward compat. */
  associatedScenes: string[];
}

export interface BeatSheetEntry {
  id: string;
  beat: string;
  description: string;
  /** @deprecated Use `useOutlineStore.getScenesForBeat()` instead. Kept for Firestore backward compat. */
  sceneRefs: string[];
  completed: boolean;
}

/** @deprecated Scene outline data now lives in the Outline store as OutlineEntry[]. */
export interface SceneOutlineEntry {
  sceneNumber: number;
  heading: string;
  summary: string;
  beat?: string;
  characters?: string[];
}

export interface StoryBible {
  projectId: string;
  genre: string;
  tone: string;
  themes: string[];
  logline: string;
  synopsis: string;
  characters: CharacterProfile[];
  locations: LocationProfile[];
  beatSheet: BeatSheetEntry[];
  /** @deprecated Scene outline data now lives in the Outline store. Kept for Firestore backward compat. */
  outline?: SceneOutlineEntry[];
  customNotes: string;
  updatedAt: number;
}
