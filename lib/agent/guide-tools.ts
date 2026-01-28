// ---------------------------------------------------------------------------
// AI Guide -- Tool Definitions & Executor for Story Bible Guide Mode
// ---------------------------------------------------------------------------
//
// Defines tool schemas and a pass-through executor for the story guide mode.
// These tools are called by the AI during the guided story development
// conversation.  The server-side executor returns simple acknowledgment
// strings -- the actual store mutations happen client-side when the NDJSON
// stream delivers tool_call chunks.
//
// Usage:
//   import { GUIDE_TOOLS, executeGuideToolCall, isGuideToolName } from '@/lib/agent/guide-tools';
// ---------------------------------------------------------------------------

import type { ToolDefinition, ToolResult } from './tools';

// ---------------------------------------------------------------------------
// Tool names (for fast lookup)
// ---------------------------------------------------------------------------

const GUIDE_TOOL_NAMES = new Set([
  'update_genre',
  'update_tone',
  'update_logline',
  'update_synopsis',
  'add_theme',
  'add_character',
  'add_character_relationship',
  'add_location',
  'update_beat',
  'generate_scene_outline',
]);

/**
 * Check whether a tool name belongs to the guide tool set.
 */
export function isGuideToolName(name: string): boolean {
  return GUIDE_TOOL_NAMES.has(name);
}

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

export const GUIDE_TOOLS: ToolDefinition[] = [
  // -- Overview tools -------------------------------------------------------

  {
    name: 'update_genre',
    description: 'Set the screenplay genre in the story bible.',
    input_schema: {
      type: 'object',
      properties: {
        genre: {
          type: 'string',
          description: 'The genre (e.g., "Sci-Fi Thriller", "Romantic Comedy").',
        },
      },
      required: ['genre'],
    },
  },

  {
    name: 'update_tone',
    description: 'Set the overall tone/mood of the screenplay.',
    input_schema: {
      type: 'object',
      properties: {
        tone: {
          type: 'string',
          description: 'The tone (e.g., "Dark and suspenseful", "Lighthearted with an edge").',
        },
      },
      required: ['tone'],
    },
  },

  {
    name: 'update_logline',
    description: 'Set or refine the logline for the screenplay.',
    input_schema: {
      type: 'object',
      properties: {
        logline: {
          type: 'string',
          description: 'The logline -- a one- or two-sentence story summary.',
        },
      },
      required: ['logline'],
    },
  },

  {
    name: 'update_synopsis',
    description: 'Set the synopsis (short narrative summary of the full story arc).',
    input_schema: {
      type: 'object',
      properties: {
        synopsis: {
          type: 'string',
          description: 'The story synopsis.',
        },
      },
      required: ['synopsis'],
    },
  },

  {
    name: 'add_theme',
    description: 'Add a thematic element to the story bible.',
    input_schema: {
      type: 'object',
      properties: {
        theme: {
          type: 'string',
          description: 'The theme to add (e.g., "redemption", "the cost of ambition").',
        },
      },
      required: ['theme'],
    },
  },

  // -- Character tools ------------------------------------------------------

  {
    name: 'add_character',
    description:
      'Add a character to the story bible with their description and arc. ' +
      'Call this as soon as a character is established in the conversation.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Character name (ALL CAPS for main characters).',
        },
        description: {
          type: 'string',
          description: 'Brief character description (who they are, what they want).',
        },
        arc: {
          type: 'string',
          description: 'Character arc summary (how they change through the story).',
        },
        notes: {
          type: 'string',
          description: 'Additional notes about the character.',
        },
      },
      required: ['name'],
    },
  },

  {
    name: 'add_character_relationship',
    description: 'Define a relationship between two characters.',
    input_schema: {
      type: 'object',
      properties: {
        characterName: {
          type: 'string',
          description: 'The character whose profile to update.',
        },
        relatedCharacterName: {
          type: 'string',
          description: 'The other character in the relationship.',
        },
        relationship: {
          type: 'string',
          description: 'Nature of the relationship (e.g., "mentor", "rival", "love interest").',
        },
      },
      required: ['characterName', 'relatedCharacterName', 'relationship'],
    },
  },

  // -- Location tools -------------------------------------------------------

  {
    name: 'add_location',
    description: 'Add a key location to the story bible.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Location name (e.g., "Mars Colony Alpha", "Downtown Precinct").',
        },
        description: {
          type: 'string',
          description: 'Location description and its narrative significance.',
        },
      },
      required: ['name'],
    },
  },

  // -- Beat sheet tools -----------------------------------------------------

  {
    name: 'update_beat',
    description:
      'Update a Save the Cat beat with its description for this story. ' +
      'Call this as soon as a beat is developed during conversation.',
    input_schema: {
      type: 'object',
      properties: {
        beatName: {
          type: 'string',
          description: 'Exact beat name from Save the Cat.',
          enum: [
            'Opening Image',
            'Theme Stated',
            'Set-Up',
            'Catalyst',
            'Debate',
            'Break into Two',
            'B Story',
            'Fun and Games',
            'Midpoint',
            'Bad Guys Close In',
            'All Is Lost',
            'Dark Night of the Soul',
            'Break into Three',
            'Finale',
            'Final Image',
          ],
        },
        description: {
          type: 'string',
          description: 'How this beat manifests in the story.',
        },
      },
      required: ['beatName', 'description'],
    },
  },

  // -- Outline tools --------------------------------------------------------

  {
    name: 'generate_scene_outline',
    description:
      'Generate a scene-by-scene outline entry. Call this repeatedly ' +
      'to build the full outline during the finalization phase.',
    input_schema: {
      type: 'object',
      properties: {
        sceneNumber: {
          type: 'number',
          description: 'Scene number in sequence (1-based).',
        },
        heading: {
          type: 'string',
          description: 'Scene heading (e.g., "INT. OFFICE - DAY").',
        },
        summary: {
          type: 'string',
          description: 'Brief scene summary (1-2 sentences).',
        },
        beat: {
          type: 'string',
          description: 'Which Save the Cat beat this scene primarily serves.',
        },
        characters: {
          type: 'array',
          items: { type: 'string' },
          description: 'Characters appearing in this scene.',
        },
      },
      required: ['sceneNumber', 'heading', 'summary'],
    },
  },
];

// ---------------------------------------------------------------------------
// Pass-through executor (server-side)
// ---------------------------------------------------------------------------

/**
 * Execute a guide tool call on the server side.
 *
 * Guide tools are pass-through -- they return a simple acknowledgment string.
 * The actual Bible store mutations happen client-side when the NDJSON stream
 * delivers the tool_call chunk and the client dispatches to the Zustand store.
 */
export function executeGuideToolCall(
  name: string,
  input: Record<string, unknown>,
): ToolResult {
  switch (name) {
    case 'update_genre':
      return { result: `Genre set to "${input.genre}".` };
    case 'update_tone':
      return { result: `Tone set to "${input.tone}".` };
    case 'update_logline':
      return { result: `Logline updated.` };
    case 'update_synopsis':
      return { result: `Synopsis updated.` };
    case 'add_theme':
      return { result: `Theme "${input.theme}" added.` };
    case 'add_character':
      return { result: `Character "${input.name}" added to story bible.` };
    case 'add_character_relationship':
      return {
        result: `Relationship between "${input.characterName}" and "${input.relatedCharacterName}" defined as "${input.relationship}".`,
      };
    case 'add_location':
      return { result: `Location "${input.name}" added to story bible.` };
    case 'update_beat':
      return { result: `Beat "${input.beatName}" updated.` };
    case 'generate_scene_outline':
      return {
        result: `Scene ${input.sceneNumber}: ${input.heading} added to outline.`,
      };
    default:
      return { result: `Unknown guide tool: ${name}` };
  }
}
