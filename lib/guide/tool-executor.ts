// ---------------------------------------------------------------------------
// Guide Tool Executor -- Reusable tool dispatch for AI guide responses
// ---------------------------------------------------------------------------
//
// PRIMITIVES ARCHITECTURE:
// Provides a centralized, reusable dispatcher for guide tool calls.
// Separates tool dispatch logic from the chat UI component.
// ---------------------------------------------------------------------------

import { useStoryBibleStore } from '@/lib/store/story-bible';
import { useOutlineStore } from '@/lib/store/outline';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GuideToolName =
  | 'update_genre'
  | 'update_tone'
  | 'update_logline'
  | 'update_synopsis'
  | 'add_theme'
  | 'add_character'
  | 'add_character_relationship'
  | 'add_location'
  | 'update_beat'
  | 'generate_scene_outline';

export interface GuideToolCall {
  name: GuideToolName;
  input: Record<string, unknown>;
}

export interface GuideToolResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Tool Handlers (Primitives)
// ---------------------------------------------------------------------------

const toolHandlers: Record<
  GuideToolName,
  (input: Record<string, unknown>) => GuideToolResult
> = {
  update_genre: (input) => {
    useStoryBibleStore.getState().setGenre(input.genre as string);
    return { success: true };
  },

  update_tone: (input) => {
    useStoryBibleStore.getState().setTone(input.tone as string);
    return { success: true };
  },

  update_logline: (input) => {
    useStoryBibleStore.getState().setLogline(input.logline as string);
    return { success: true };
  },

  update_synopsis: (input) => {
    useStoryBibleStore.getState().setSynopsis(input.synopsis as string);
    return { success: true };
  },

  add_theme: (input) => {
    useStoryBibleStore.getState().addTheme(input.theme as string);
    return { success: true };
  },

  add_character: (input) => {
    const store = useStoryBibleStore.getState();
    const bible = store.bible;
    const inputName = (input.name as string) ?? '';

    // Check for existing character (case-insensitive) to prevent duplicates
    const existingChar = bible?.characters.find(
      (c) => c.name.toLowerCase() === inputName.toLowerCase(),
    );

    // Only add if character doesn't already exist
    if (!existingChar) {
      store.addCharacter(inputName);
    }

    // Find character (existing or newly added) and update fields
    const updatedBible = useStoryBibleStore.getState().bible;
    const char = updatedBible?.characters.find(
      (c) => c.name.toLowerCase() === inputName.toLowerCase(),
    );
    if (char) {
      const updates: Record<string, string> = {};
      if (input.description) updates.description = input.description as string;
      if (input.arc) updates.arc = input.arc as string;
      if (input.notes) updates.notes = input.notes as string;
      if (Object.keys(updates).length > 0) {
        store.updateCharacter(char.id, updates);
      }
    }
    return { success: true };
  },

  add_character_relationship: (input) => {
    const bible = useStoryBibleStore.getState().bible;
    const charName = (input.characterName as string) ?? '';
    const relatedName = (input.relatedCharacterName as string) ?? '';
    const relationship = (input.relationship as string) ?? '';
    const char = bible?.characters.find(
      (c) => c.name.toLowerCase() === charName.toLowerCase(),
    );
    if (char) {
      useStoryBibleStore.getState().updateCharacter(char.id, {
        relationships: [
          ...char.relationships,
          { characterId: relatedName, relationship },
        ],
      });
      return { success: true };
    }
    return { success: false, error: `Character "${charName}" not found` };
  },

  add_location: (input) => {
    const store = useStoryBibleStore.getState();
    const bible = store.bible;
    const inputName = (input.name as string) ?? '';

    // Check for existing location (case-insensitive) to prevent duplicates
    const existingLoc = bible?.locations.find(
      (l) => l.name.toLowerCase() === inputName.toLowerCase(),
    );

    // Only add if location doesn't already exist
    if (!existingLoc) {
      store.addLocation(inputName);
    }

    // Find location (existing or newly added) and update description
    if (input.description) {
      const updatedBible = useStoryBibleStore.getState().bible;
      const loc = updatedBible?.locations.find(
        (l) => l.name.toLowerCase() === inputName.toLowerCase(),
      );
      if (loc) {
        store.updateLocation(loc.id, {
          description: input.description as string,
        });
      }
    }
    return { success: true };
  },

  update_beat: (input) => {
    const bible = useStoryBibleStore.getState().bible;
    const beatName = input.beatName as string;
    const beat = bible?.beatSheet.find((b) => b.beat === beatName);
    if (beat) {
      useStoryBibleStore.getState().updateBeat(beat.id, {
        description: (input.description as string) ?? '',
        completed: true,
      });
      return { success: true };
    }
    return { success: false, error: `Beat "${beatName}" not found` };
  },

  generate_scene_outline: (input) => {
    const outlineStore = useOutlineStore.getState();
    const bible = useStoryBibleStore.getState().bible;
    const lastScene = outlineStore.outline?.scenes.at(-1);
    const beatName = input.beat as string | undefined;
    const beatId = beatName
      ? bible?.beatSheet.find((b) => b.beat === beatName)?.id ?? null
      : null;
    outlineStore.addPlannedScene(lastScene?.id ?? null, {
      heading: input.heading as string,
      summary: input.summary as string,
      beatId,
    });
    return { success: true };
  },
};

// ---------------------------------------------------------------------------
// Executor (Composed)
// ---------------------------------------------------------------------------

/**
 * Execute a single guide tool call.
 * Returns the result indicating success or failure.
 */
export function executeGuideTool(
  name: string,
  input: Record<string, unknown>,
): GuideToolResult {
  const handler = toolHandlers[name as GuideToolName];
  if (!handler) {
    return { success: false, error: `Unknown tool: ${name}` };
  }
  try {
    return handler(input);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Execute multiple guide tool calls in sequence.
 * Returns an array of results.
 */
export function executeGuideTools(
  calls: GuideToolCall[],
): GuideToolResult[] {
  return calls.map((call) => executeGuideTool(call.name, call.input));
}

/**
 * Check if a tool name is a valid guide tool.
 */
export function isGuideToolName(name: string): name is GuideToolName {
  return name in toolHandlers;
}
