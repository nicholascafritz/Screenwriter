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
  associatedScenes: string[];
}

export interface BeatSheetEntry {
  id: string;
  beat: string;
  description: string;
  sceneRefs: string[];
  completed: boolean;
}

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
  outline: SceneOutlineEntry[];
  customNotes: string;
  updatedAt: number;
}
