// ---------------------------------------------------------------------------
// Story Bible Store -- Zustand state management for project context
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { generateId } from '@/lib/utils';
import type {
  StoryBible,
  CharacterProfile,
  LocationProfile,
  BeatSheetEntry,
} from './story-bible-types';
import { loadStoryBible, saveStoryBible, deleteStoryBible } from './story-bible-persistence';

// ---------------------------------------------------------------------------
// Save the Cat Beat Sheet Template
// ---------------------------------------------------------------------------

export const SAVE_THE_CAT_BEATS: { beat: string; hint: string }[] = [
  { beat: 'Opening Image', hint: 'A snapshot of the protagonist\'s world before the journey begins.' },
  { beat: 'Theme Stated', hint: 'Someone states the theme (often to the protagonist) within the first 5 pages.' },
  { beat: 'Set-Up', hint: 'Introduce the main characters, the world, and what needs fixing.' },
  { beat: 'Catalyst', hint: 'The inciting incident that sets the story in motion.' },
  { beat: 'Debate', hint: 'The protagonist hesitates — should they accept the challenge?' },
  { beat: 'Break into Two', hint: 'The protagonist commits to the journey. Act 2 begins.' },
  { beat: 'B Story', hint: 'A new character or subplot that carries the theme.' },
  { beat: 'Fun and Games', hint: 'The promise of the premise — what the audience came to see.' },
  { beat: 'Midpoint', hint: 'A false victory or false defeat that raises the stakes.' },
  { beat: 'Bad Guys Close In', hint: 'External pressure mounts and internal flaws resurface.' },
  { beat: 'All Is Lost', hint: 'The lowest point. Something or someone is lost.' },
  { beat: 'Dark Night of the Soul', hint: 'The protagonist faces despair and must dig deep.' },
  { beat: 'Break into Three', hint: 'A new idea or inspiration sparks the final push.' },
  { beat: 'Finale', hint: 'The protagonist faces the final challenge, applying lessons learned.' },
  { beat: 'Final Image', hint: 'A mirror of the opening image showing how things have changed.' },
];

function createDefaultBeatSheet(): BeatSheetEntry[] {
  return SAVE_THE_CAT_BEATS.map((b) => ({
    id: generateId(),
    beat: b.beat,
    description: '',
    sceneRefs: [],
    completed: false,
  }));
}

function createDefaultBible(projectId: string): StoryBible {
  return {
    projectId,
    genre: '',
    tone: '',
    themes: [],
    logline: '',
    synopsis: '',
    characters: [],
    locations: [],
    beatSheet: createDefaultBeatSheet(),
    customNotes: '',
    updatedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Store types
// ---------------------------------------------------------------------------

export interface StoryBibleState {
  bible: StoryBible | null;
  projectId: string | null;

  // Lifecycle
  loadForProject: (projectId: string) => void;
  persist: () => void;
  deleteForProject: (projectId: string) => void;
  clear: () => void;

  // Overview
  setGenre: (genre: string) => void;
  setTone: (tone: string) => void;
  setLogline: (logline: string) => void;
  setSynopsis: (synopsis: string) => void;
  addTheme: (theme: string) => void;
  removeTheme: (theme: string) => void;
  setCustomNotes: (notes: string) => void;

  // Characters
  addCharacter: (name: string) => void;
  updateCharacter: (id: string, updates: Partial<Omit<CharacterProfile, 'id'>>) => void;
  removeCharacter: (id: string) => void;

  // Locations
  addLocation: (name: string) => void;
  updateLocation: (id: string, updates: Partial<Omit<LocationProfile, 'id'>>) => void;
  removeLocation: (id: string) => void;

  // Beat Sheet
  updateBeat: (id: string, updates: Partial<Omit<BeatSheetEntry, 'id' | 'beat'>>) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    _persistTimer = null;
    useStoryBibleStore.getState().persist();
  }, 500);
}

function updateBible(
  set: (fn: (state: StoryBibleState) => Partial<StoryBibleState>) => void,
  updater: (bible: StoryBible) => StoryBible,
) {
  set((state) => {
    if (!state.bible) return {};
    return { bible: updater({ ...state.bible, updatedAt: Date.now() }) };
  });
  schedulePersist();
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStoryBibleStore = create<StoryBibleState>((set, get) => ({
  bible: null,
  projectId: null,

  loadForProject: (projectId) => {
    let bible = loadStoryBible(projectId);
    if (!bible) {
      bible = createDefaultBible(projectId);
      saveStoryBible(bible);
    }
    set({ bible, projectId });
  },

  persist: () => {
    const { bible } = get();
    if (!bible) return;
    saveStoryBible(bible);
  },

  deleteForProject: (projectId) => {
    deleteStoryBible(projectId);
  },

  clear: () => {
    set({ bible: null, projectId: null });
  },

  // -- Overview ---------------------------------------------------------------

  setGenre: (genre) => updateBible(set, (b) => ({ ...b, genre })),
  setTone: (tone) => updateBible(set, (b) => ({ ...b, tone })),
  setLogline: (logline) => updateBible(set, (b) => ({ ...b, logline })),
  setSynopsis: (synopsis) => updateBible(set, (b) => ({ ...b, synopsis })),
  setCustomNotes: (notes) => updateBible(set, (b) => ({ ...b, customNotes: notes })),

  addTheme: (theme) =>
    updateBible(set, (b) => ({
      ...b,
      themes: b.themes.includes(theme) ? b.themes : [...b.themes, theme],
    })),

  removeTheme: (theme) =>
    updateBible(set, (b) => ({
      ...b,
      themes: b.themes.filter((t) => t !== theme),
    })),

  // -- Characters -------------------------------------------------------------

  addCharacter: (name) =>
    updateBible(set, (b) => ({
      ...b,
      characters: [
        ...b.characters,
        { id: generateId(), name, description: '', arc: '', relationships: [], notes: '' },
      ],
    })),

  updateCharacter: (id, updates) =>
    updateBible(set, (b) => ({
      ...b,
      characters: b.characters.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  removeCharacter: (id) =>
    updateBible(set, (b) => ({
      ...b,
      characters: b.characters.filter((c) => c.id !== id),
    })),

  // -- Locations --------------------------------------------------------------

  addLocation: (name) =>
    updateBible(set, (b) => ({
      ...b,
      locations: [
        ...b.locations,
        { id: generateId(), name, description: '', associatedScenes: [] },
      ],
    })),

  updateLocation: (id, updates) =>
    updateBible(set, (b) => ({
      ...b,
      locations: b.locations.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    })),

  removeLocation: (id) =>
    updateBible(set, (b) => ({
      ...b,
      locations: b.locations.filter((l) => l.id !== id),
    })),

  // -- Beat Sheet -------------------------------------------------------------

  updateBeat: (id, updates) =>
    updateBible(set, (b) => ({
      ...b,
      beatSheet: b.beatSheet.map((beat) =>
        beat.id === id ? { ...beat, ...updates } : beat
      ),
    })),
}));
