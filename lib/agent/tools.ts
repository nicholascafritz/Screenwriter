// ---------------------------------------------------------------------------
// AI Agent -- Tool Definitions & Executor
// ---------------------------------------------------------------------------
//
// Defines the tool schemas (in Anthropic SDK format) and the executor that
// processes tool calls against a Fountain screenplay string.  Each tool
// operates on the parsed AST and returns a textual result plus an optional
// updated screenplay string when the tool mutates content.
//
// Usage:
//   import { SCREENPLAY_TOOLS, executeToolCall } from '@/lib/agent/tools';
// ---------------------------------------------------------------------------

import { parseFountain } from '@/lib/fountain/parser';
import { serializeFountain } from '@/lib/fountain/serializer';
import { validateScreenplay } from '@/lib/fountain/validator';
import { analyzeScreenplay } from '@/lib/fountain/analytics';
import type { Screenplay, Scene } from '@/lib/fountain/types';
import { STRUCTURE_TOOLS, executeStructureToolCall } from './structure-tools';
import { useStoryBibleStore } from '@/lib/store/story-bible';

// ---------------------------------------------------------------------------
// Tool result type
// ---------------------------------------------------------------------------

export interface ToolResult {
  /** Human-readable result text to feed back to the model. */
  result: string;

  /** When the tool mutates the screenplay, the updated Fountain text. */
  updatedScreenplay?: string;
}

// ---------------------------------------------------------------------------
// Tool schema type (Anthropic SDK format)
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

export const SCREENPLAY_TOOLS: ToolDefinition[] = [
  // -- Structure navigation tools (from structure-tools.ts) --
  ...STRUCTURE_TOOLS,

  // 1. read_screenplay
  {
    name: 'read_screenplay',
    description:
      'Read the full screenplay text, or a specific line range. ' +
      'Returns Fountain-formatted text with line numbers.',
    input_schema: {
      type: 'object',
      properties: {
        startLine: {
          type: 'number',
          description:
            'Optional 1-based start line. Omit to read from the beginning.',
        },
        endLine: {
          type: 'number',
          description:
            'Optional 1-based end line (inclusive). Omit to read to the end.',
        },
      },
    },
  },

  // 2. read_scene
  {
    name: 'read_scene',
    description:
      'Read a specific scene by its heading text or sequential number (1-based). ' +
      'Returns the full scene content including the heading.',
    input_schema: {
      type: 'object',
      properties: {
        sceneHeading: {
          type: 'string',
          description:
            'The scene heading text to match (case-insensitive substring match).',
        },
        sceneNumber: {
          type: 'number',
          description:
            'The 1-based sequential scene number. Used when sceneHeading is not provided.',
        },
      },
    },
  },

  // 3. search_screenplay
  {
    name: 'search_screenplay',
    description:
      'Search for text in the screenplay. Returns matching lines with ' +
      'line numbers and surrounding context.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The text to search for.',
        },
        caseSensitive: {
          type: 'boolean',
          description:
            'Whether the search should be case-sensitive. Defaults to false.',
        },
      },
      required: ['query'],
    },
  },

  // 4. edit_scene
  {
    name: 'edit_scene',
    description:
      'Replace the content of a specific scene (identified by its heading) ' +
      'with new Fountain-formatted content. The new content should include ' +
      'the scene heading.',
    input_schema: {
      type: 'object',
      properties: {
        sceneHeading: {
          type: 'string',
          description:
            'The scene heading text to find (case-insensitive substring match).',
        },
        newContent: {
          type: 'string',
          description:
            'The replacement Fountain content for the entire scene, including heading.',
        },
      },
      required: ['sceneHeading', 'newContent'],
    },
  },

  // 5. insert_scene
  {
    name: 'insert_scene',
    description:
      'Insert a new scene after the specified scene. The content should ' +
      'be valid Fountain text starting with a scene heading.',
    input_schema: {
      type: 'object',
      properties: {
        afterScene: {
          type: 'string',
          description:
            'The heading of the scene after which to insert. Use "START" to insert at the beginning.',
        },
        content: {
          type: 'string',
          description:
            'The Fountain-formatted content for the new scene, starting with a scene heading.',
        },
      },
      required: ['afterScene', 'content'],
    },
  },

  // 6. delete_scene
  {
    name: 'delete_scene',
    description:
      'Delete a scene identified by its heading. Removes the heading and ' +
      'all content belonging to that scene.',
    input_schema: {
      type: 'object',
      properties: {
        sceneHeading: {
          type: 'string',
          description:
            'The scene heading text to find and delete (case-insensitive substring match).',
        },
      },
      required: ['sceneHeading'],
    },
  },

  // 7. reorder_scenes
  {
    name: 'reorder_scenes',
    description:
      'Move a scene to a new position, placing it after the specified target scene.',
    input_schema: {
      type: 'object',
      properties: {
        sceneHeading: {
          type: 'string',
          description:
            'The heading of the scene to move (case-insensitive substring match).',
        },
        afterScene: {
          type: 'string',
          description:
            'The heading of the scene after which to place it. Use "START" to move to the beginning.',
        },
      },
      required: ['sceneHeading', 'afterScene'],
    },
  },

  // 8. replace_text
  {
    name: 'replace_text',
    description:
      'Find and replace text within the screenplay. Can be scoped to a ' +
      'specific scene or applied globally.',
    input_schema: {
      type: 'object',
      properties: {
        find: {
          type: 'string',
          description: 'The text to find.',
        },
        replace: {
          type: 'string',
          description: 'The replacement text.',
        },
        sceneHeading: {
          type: 'string',
          description:
            'Optional scene heading to scope the replacement to. Omit for global replacement.',
        },
      },
      required: ['find', 'replace'],
    },
  },

  // 9. get_outline
  {
    name: 'get_outline',
    description:
      'Get a scene-level outline of the screenplay, listing each scene ' +
      'heading with a brief summary of its content and character appearances.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  // 10. get_characters
  {
    name: 'get_characters',
    description:
      'List all characters found in the screenplay with the scenes they appear in ' +
      'and their dialogue line counts.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  // 11. get_statistics
  {
    name: 'get_statistics',
    description:
      'Get screenplay statistics including page count, scene count, ' +
      'dialogue-to-action ratio, character dialogue counts, and more.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  // 12. validate_format
  {
    name: 'validate_format',
    description:
      'Run the Fountain format linter/validator on the screenplay and ' +
      'return any errors, warnings, or informational issues.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  // 13. polish_pass
  {
    name: 'polish_pass',
    description:
      'Run a comprehensive polish pass on the screenplay or a specific scene. ' +
      'Auto-fixes mechanical issues (whitespace, blank line spacing, format errors) and ' +
      'returns a prioritized diagnostic of creative issues for further editing.',
    input_schema: {
      type: 'object',
      properties: {
        sceneHeading: {
          type: 'string',
          description:
            'Optional scene heading to scope the polish to a specific scene. Omit for full screenplay.',
        },
        focus: {
          type: 'string',
          enum: ['all', 'dialogue', 'action', 'pacing', 'format'],
          description:
            'Filter the diagnostic to a specific area. Defaults to "all".',
        },
      },
    },
  },

  // 14. dialogue
  {
    name: 'dialogue',
    description:
      'Workshop dialogue for a specific character or scene. ' +
      '"analyze" — breaks down dialogue quality: voice distinctiveness between characters, ' +
      'subtext depth, on-the-nose flags, monologue detection, rhythm analysis. ' +
      '"generate" — builds a character voice profile from existing dialogue + scene context, ' +
      'returning a structured brief for writing new dialogue. ' +
      '"rewrite" — extracts target dialogue with character voice data and creative direction, ' +
      'returning a structured brief for revision.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['analyze', 'generate', 'rewrite'],
          description:
            'The dialogue workshop action to perform.',
        },
        character: {
          type: 'string',
          description:
            'Character name to focus on. Required for generate and rewrite actions.',
        },
        sceneHeading: {
          type: 'string',
          description:
            'Scope to a specific scene (case-insensitive substring match).',
        },
        direction: {
          type: 'string',
          description:
            'Creative direction for generate/rewrite (e.g., "more confrontational", "add subtext", "funnier").',
        },
      },
      required: ['action'],
    },
  },

  // 15. get_story_bible
  {
    name: 'get_story_bible',
    description:
      'Read the project story bible including characters, locations, themes, ' +
      'beat sheet progress, and writer notes. Returns structured project context.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
];

// ---------------------------------------------------------------------------
// Tool Executor
// ---------------------------------------------------------------------------

/**
 * Execute a tool call against the given screenplay text.
 *
 * @param name   - The tool name (must match one of SCREENPLAY_TOOLS).
 * @param input  - The tool input parameters.
 * @param screenplay - The current Fountain screenplay text.
 * @returns A result string and optionally the updated screenplay text.
 */
export function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  screenplay: string,
): ToolResult {
  switch (name) {
    case 'read_screenplay':
      return executeReadScreenplay(screenplay, input);
    case 'read_scene':
      return executeReadScene(screenplay, input);
    case 'search_screenplay':
      return executeSearchScreenplay(screenplay, input);
    case 'edit_scene':
      return executeEditScene(screenplay, input);
    case 'insert_scene':
      return executeInsertScene(screenplay, input);
    case 'delete_scene':
      return executeDeleteScene(screenplay, input);
    case 'reorder_scenes':
      return executeReorderScenes(screenplay, input);
    case 'replace_text':
      return executeReplaceText(screenplay, input);
    case 'get_outline':
      return executeGetOutline(screenplay);
    case 'get_characters':
      return executeGetCharacters(screenplay);
    case 'get_statistics':
      return executeGetStatistics(screenplay);
    case 'validate_format':
      return executeValidateFormat(screenplay);
    case 'polish_pass':
      return executePolishPass(screenplay, input);
    case 'dialogue':
      return executeDialogue(screenplay, input);
    case 'get_story_bible':
      return executeGetStoryBible();
    case 'get_structure':
    case 'read_act':
    case 'get_act_analysis':
    case 'analyze_narrative_arc':
    case 'compare_structure':
      return executeStructureToolCall(name, input, screenplay);
    default:
      return { result: `Unknown tool: ${name}` };
  }
}

// ---------------------------------------------------------------------------
// Individual tool implementations
// ---------------------------------------------------------------------------

function executeReadScreenplay(
  screenplay: string,
  input: Record<string, unknown>,
): ToolResult {
  const lines = screenplay.split('\n');
  const startLine = (input.startLine as number | undefined) ?? 1;
  const endLine = (input.endLine as number | undefined) ?? lines.length;

  const clampedStart = Math.max(1, Math.min(startLine, lines.length));
  const clampedEnd = Math.max(clampedStart, Math.min(endLine, lines.length));

  const selected = lines.slice(clampedStart - 1, clampedEnd);
  const numbered = selected
    .map((line, idx) => `${clampedStart + idx}: ${line}`)
    .join('\n');

  return {
    result:
      `Showing lines ${clampedStart}-${clampedEnd} of ${lines.length}:\n\n${numbered}`,
  };
}

function executeReadScene(
  screenplay: string,
  input: Record<string, unknown>,
): ToolResult {
  const parsed = parseFountain(screenplay);
  const scene = findScene(
    parsed,
    input.sceneHeading as string | undefined,
    input.sceneNumber as number | undefined,
  );

  if (!scene) {
    return { result: 'Scene not found.' };
  }

  const lines = screenplay.split('\n');
  const sceneLines = lines.slice(scene.startLine - 1, scene.endLine);
  const numbered = sceneLines
    .map((line, idx) => `${scene.startLine + idx}: ${line}`)
    .join('\n');

  return {
    result:
      `Scene: ${scene.heading}\nLines ${scene.startLine}-${scene.endLine}:\n\n${numbered}`,
  };
}

function executeSearchScreenplay(
  screenplay: string,
  input: Record<string, unknown>,
): ToolResult {
  const query = input.query as string;
  const caseSensitive = (input.caseSensitive as boolean | undefined) ?? false;
  const lines = screenplay.split('\n');
  const matches: string[] = [];

  const searchQuery = caseSensitive ? query : query.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = caseSensitive ? lines[i] : lines[i].toLowerCase();
    if (line.includes(searchQuery)) {
      // Show context: 1 line before and after.
      const contextStart = Math.max(0, i - 1);
      const contextEnd = Math.min(lines.length - 1, i + 1);
      const context: string[] = [];
      for (let j = contextStart; j <= contextEnd; j++) {
        const marker = j === i ? '>>>' : '   ';
        context.push(`${marker} ${j + 1}: ${lines[j]}`);
      }
      matches.push(context.join('\n'));
    }
  }

  if (matches.length === 0) {
    return { result: `No matches found for "${query}".` };
  }

  return {
    result: `Found ${matches.length} match(es) for "${query}":\n\n${matches.join('\n\n')}`,
  };
}

function executeEditScene(
  screenplay: string,
  input: Record<string, unknown>,
): ToolResult {
  const parsed = parseFountain(screenplay);
  const scene = findScene(parsed, input.sceneHeading as string);
  const newContent = input.newContent as string;

  if (!scene) {
    return { result: `Scene not found: "${input.sceneHeading}"` };
  }

  const lines = screenplay.split('\n');
  const before = lines.slice(0, scene.startLine - 1);
  const after = lines.slice(scene.endLine);

  const updatedText = [...before, newContent, ...after].join('\n');

  return {
    result: `Replaced scene "${scene.heading}" (lines ${scene.startLine}-${scene.endLine}) with new content.`,
    updatedScreenplay: updatedText,
  };
}

function executeInsertScene(
  screenplay: string,
  input: Record<string, unknown>,
): ToolResult {
  const afterScene = input.afterScene as string;
  const content = input.content as string;
  const lines = screenplay.split('\n');

  if (afterScene === 'START') {
    // Insert at the very beginning of the body.
    // Find where the body starts (after any title page).
    const parsed = parseFountain(screenplay);
    const hasTitlePage = Object.keys(parsed.titlePage).length > 0;

    if (hasTitlePage && parsed.elements.length > 0) {
      // Insert before the first element.
      const firstLine = parsed.elements[0].startLine;
      const before = lines.slice(0, firstLine - 1);
      const after = lines.slice(firstLine - 1);
      const updatedText = [...before, '', content, '', ...after].join('\n');
      return {
        result: `Inserted new scene at the beginning of the screenplay.`,
        updatedScreenplay: updatedText,
      };
    }

    // No title page or empty: prepend.
    const updatedText = content + '\n\n' + screenplay;
    return {
      result: `Inserted new scene at the beginning of the screenplay.`,
      updatedScreenplay: updatedText,
    };
  }

  // Find the target scene.
  const parsed = parseFountain(screenplay);
  const scene = findScene(parsed, afterScene);

  if (!scene) {
    return { result: `Target scene not found: "${afterScene}"` };
  }

  const before = lines.slice(0, scene.endLine);
  const after = lines.slice(scene.endLine);
  const updatedText = [...before, '', content, ...after].join('\n');

  return {
    result: `Inserted new scene after "${scene.heading}".`,
    updatedScreenplay: updatedText,
  };
}

function executeDeleteScene(
  screenplay: string,
  input: Record<string, unknown>,
): ToolResult {
  const parsed = parseFountain(screenplay);
  const scene = findScene(parsed, input.sceneHeading as string);

  if (!scene) {
    return { result: `Scene not found: "${input.sceneHeading}"` };
  }

  const lines = screenplay.split('\n');

  // Remove the scene lines plus any preceding blank line.
  let deleteStart = scene.startLine - 1;
  if (deleteStart > 0 && lines[deleteStart - 1].trim() === '') {
    deleteStart -= 1;
  }

  const before = lines.slice(0, deleteStart);
  const after = lines.slice(scene.endLine);
  const updatedText = [...before, ...after].join('\n');

  return {
    result: `Deleted scene "${scene.heading}" (lines ${scene.startLine}-${scene.endLine}).`,
    updatedScreenplay: updatedText,
  };
}

function executeReorderScenes(
  screenplay: string,
  input: Record<string, unknown>,
): ToolResult {
  const parsed = parseFountain(screenplay);
  const sourceScene = findScene(parsed, input.sceneHeading as string);
  const afterScene = input.afterScene as string;

  if (!sourceScene) {
    return { result: `Source scene not found: "${input.sceneHeading}"` };
  }

  // Extract the source scene text.
  const lines = screenplay.split('\n');
  let extractStart = sourceScene.startLine - 1;
  if (extractStart > 0 && lines[extractStart - 1].trim() === '') {
    extractStart -= 1;
  }
  const sceneText = lines.slice(sourceScene.startLine - 1, sourceScene.endLine).join('\n');

  // Remove the source scene.
  const withoutSource = [
    ...lines.slice(0, extractStart),
    ...lines.slice(sourceScene.endLine),
  ].join('\n');

  // Re-parse to find the target position.
  if (afterScene === 'START') {
    const reParsed = parseFountain(withoutSource);
    const newLines = withoutSource.split('\n');
    const hasTitlePage = Object.keys(reParsed.titlePage).length > 0;

    if (hasTitlePage && reParsed.elements.length > 0) {
      const firstLine = reParsed.elements[0].startLine;
      const before = newLines.slice(0, firstLine - 1);
      const after = newLines.slice(firstLine - 1);
      return {
        result: `Moved scene "${sourceScene.heading}" to the beginning.`,
        updatedScreenplay: [...before, sceneText, '', ...after].join('\n'),
      };
    }

    return {
      result: `Moved scene "${sourceScene.heading}" to the beginning.`,
      updatedScreenplay: sceneText + '\n\n' + withoutSource,
    };
  }

  const reParsed = parseFountain(withoutSource);
  const targetScene = findScene(reParsed, afterScene);

  if (!targetScene) {
    return { result: `Target scene not found: "${afterScene}"` };
  }

  const newLines = withoutSource.split('\n');
  const before = newLines.slice(0, targetScene.endLine);
  const after = newLines.slice(targetScene.endLine);
  const updatedText = [...before, '', sceneText, ...after].join('\n');

  return {
    result: `Moved scene "${sourceScene.heading}" to after "${targetScene.heading}".`,
    updatedScreenplay: updatedText,
  };
}

function executeReplaceText(
  screenplay: string,
  input: Record<string, unknown>,
): ToolResult {
  const find = input.find as string;
  const replace = input.replace as string;
  const sceneHeading = input.sceneHeading as string | undefined;

  if (sceneHeading) {
    // Scoped replacement within a specific scene.
    const parsed = parseFountain(screenplay);
    const scene = findScene(parsed, sceneHeading);

    if (!scene) {
      return { result: `Scene not found: "${sceneHeading}"` };
    }

    const lines = screenplay.split('\n');
    const before = lines.slice(0, scene.startLine - 1);
    const sceneLines = lines.slice(scene.startLine - 1, scene.endLine);
    const after = lines.slice(scene.endLine);

    let sceneText = sceneLines.join('\n');
    const count = countOccurrences(sceneText, find);

    if (count === 0) {
      return {
        result: `No occurrences of "${find}" found in scene "${scene.heading}".`,
      };
    }

    sceneText = sceneText.split(find).join(replace);
    const updatedText = [...before, sceneText, ...after].join('\n');

    return {
      result: `Replaced ${count} occurrence(s) of "${find}" with "${replace}" in scene "${scene.heading}".`,
      updatedScreenplay: updatedText,
    };
  }

  // Global replacement.
  const count = countOccurrences(screenplay, find);

  if (count === 0) {
    return { result: `No occurrences of "${find}" found in the screenplay.` };
  }

  const updatedText = screenplay.split(find).join(replace);

  return {
    result: `Replaced ${count} occurrence(s) of "${find}" with "${replace}" globally.`,
    updatedScreenplay: updatedText,
  };
}

function executeGetOutline(screenplay: string): ToolResult {
  const parsed = parseFountain(screenplay);

  if (parsed.scenes.length === 0) {
    return {
      result: 'No scenes found in the screenplay. The script may be empty or missing scene headings.',
    };
  }

  const outlineLines: string[] = ['Screenplay Outline:', ''];

  for (let i = 0; i < parsed.scenes.length; i++) {
    const scene = parsed.scenes[i];
    const num = i + 1;
    const characters = scene.characters.length > 0
      ? scene.characters.join(', ')
      : 'none';

    // Build a brief summary from the first action element.
    let summary = '';
    for (const el of scene.elements) {
      if (el.type === 'action') {
        summary = el.text.split('\n')[0];
        if (summary.length > 80) {
          summary = summary.slice(0, 77) + '...';
        }
        break;
      }
    }

    outlineLines.push(
      `${num}. ${scene.heading}` +
        (scene.sceneNumber ? ` #${scene.sceneNumber}#` : ''),
    );
    outlineLines.push(`   Characters: ${characters}`);
    outlineLines.push(`   Elements: ${scene.elements.length}`);
    if (summary) {
      outlineLines.push(`   Summary: ${summary}`);
    }
    outlineLines.push('');
  }

  return { result: outlineLines.join('\n') };
}

function executeGetCharacters(screenplay: string): ToolResult {
  const parsed = parseFountain(screenplay);
  const analytics = analyzeScreenplay(parsed);

  if (analytics.characters.length === 0) {
    return {
      result: 'No characters found in the screenplay.',
    };
  }

  const lines: string[] = ['Characters:', ''];

  // Build a map of character -> scenes they appear in.
  const characterScenes = new Map<string, string[]>();
  for (const scene of parsed.scenes) {
    for (const charName of scene.characters) {
      if (!characterScenes.has(charName)) {
        characterScenes.set(charName, []);
      }
      characterScenes.get(charName)!.push(scene.heading);
    }
  }

  // Sort by dialogue count (descending).
  const dialogueCounts = new Map<string, number>();
  for (const entry of analytics.characterDialogueCounts) {
    dialogueCounts.set(entry.name, entry.count);
  }

  const sortedCharacters = [...analytics.characters].sort((a, b) => {
    return (dialogueCounts.get(b) ?? 0) - (dialogueCounts.get(a) ?? 0);
  });

  for (const name of sortedCharacters) {
    const count = dialogueCounts.get(name) ?? 0;
    const scenes = characterScenes.get(name) ?? [];
    lines.push(`- **${name}**: ${count} dialogue line(s) in ${scenes.length} scene(s)`);
    if (scenes.length > 0 && scenes.length <= 5) {
      lines.push(`  Scenes: ${scenes.join('; ')}`);
    } else if (scenes.length > 5) {
      lines.push(
        `  Scenes: ${scenes.slice(0, 5).join('; ')} (+${scenes.length - 5} more)`,
      );
    }
  }

  return { result: lines.join('\n') };
}

function executeGetStatistics(screenplay: string): ToolResult {
  const parsed = parseFountain(screenplay);
  const stats = analyzeScreenplay(parsed);

  const lines: string[] = [
    'Screenplay Statistics:',
    '',
    `- Page count: ~${stats.pageCount}`,
    `- Scene count: ${stats.sceneCount}`,
    `- Total elements: ${stats.elementCount}`,
    `- Dialogue lines: ${stats.dialogueCount}`,
    `- Action blocks: ${stats.actionCount}`,
    `- Dialogue-to-action ratio: ${stats.dialogueToActionRatio.toFixed(2)}`,
    `- Estimated line count: ${stats.lineCount}`,
    `- Unique characters: ${stats.characters.length}`,
    `- Unique locations: ${stats.locations.length}`,
  ];

  if (stats.characterDialogueCounts.length > 0) {
    lines.push('');
    lines.push('Top characters by dialogue:');
    const top = stats.characterDialogueCounts.slice(0, 10);
    for (const entry of top) {
      lines.push(`  - ${entry.name}: ${entry.count} line(s)`);
    }
  }

  if (stats.locations.length > 0) {
    lines.push('');
    lines.push('Locations:');
    for (const loc of stats.locations) {
      lines.push(`  - ${loc}`);
    }
  }

  return { result: lines.join('\n') };
}

function executeValidateFormat(screenplay: string): ToolResult {
  const parsed = parseFountain(screenplay);
  const issues = validateScreenplay(parsed);

  if (issues.length === 0) {
    return {
      result: 'Validation passed: no issues found.',
    };
  }

  const lines: string[] = [
    `Validation found ${issues.length} issue(s):`,
    '',
  ];

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  lines.push(
    `Summary: ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info(s)`,
  );
  lines.push('');

  for (const issue of issues) {
    const icon =
      issue.severity === 'error'
        ? 'ERROR'
        : issue.severity === 'warning'
          ? 'WARN'
          : 'INFO';
    lines.push(`[${icon}] Line ${issue.line}: ${issue.message} (${issue.rule})`);
  }

  return { result: lines.join('\n') };
}

function executePolishPass(
  screenplay: string,
  input: Record<string, unknown>,
): ToolResult {
  const sceneHeading = input.sceneHeading as string | undefined;
  const focus = (input.focus as string | undefined) ?? 'all';

  // -------------------------------------------------------------------------
  // Phase A — Mechanical auto-fixes
  // -------------------------------------------------------------------------

  let fixed = screenplay;

  // 1. Trim trailing whitespace from every line.
  fixed = fixed
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');

  // 2. Collapse 3+ consecutive blank lines to 2.
  fixed = fixed.replace(/\n{4,}/g, '\n\n\n');

  // 3. Ensure the screenplay ends with exactly one trailing newline.
  fixed = fixed.trimEnd() + '\n';

  const mechanicalFixes: string[] = [];

  if (fixed !== screenplay) {
    mechanicalFixes.push(
      'Normalized whitespace (trimmed trailing spaces, collapsed excessive blank lines, ensured trailing newline)',
    );
  }

  // -------------------------------------------------------------------------
  // Phase B — Creative diagnostic
  // -------------------------------------------------------------------------

  const parsed = parseFountain(fixed);
  const diagnostics: string[] = [];

  // Determine which scenes to analyze.
  let targetScenes = parsed.scenes;
  if (sceneHeading) {
    const lower = sceneHeading.toLowerCase();
    targetScenes = parsed.scenes.filter((s) =>
      s.heading.toLowerCase().includes(lower),
    );
    if (targetScenes.length === 0) {
      return {
        result: `Scene not found: "${sceneHeading}"`,
        updatedScreenplay: fixed !== screenplay ? fixed : undefined,
      };
    }
  }

  const includeAll = focus === 'all';

  // --- Dialogue density ---------------------------------------------------
  if (includeAll || focus === 'dialogue') {
    for (const scene of targetScenes) {
      let dialogueElements = 0;
      let actionElements = 0;
      for (const el of scene.elements) {
        if (el.type === 'dialogue') dialogueElements++;
        if (el.type === 'action') actionElements++;
      }

      if (actionElements > 0) {
        const ratio = dialogueElements / actionElements;
        if (ratio > 4) {
          diagnostics.push(
            `[DIALOGUE] Scene "${scene.heading}" is dialogue-heavy (${dialogueElements}:${actionElements} dialogue-to-action ratio). Consider adding action beats or visual storytelling to break up the talk.`,
          );
        } else if (ratio < 0.5 && dialogueElements > 0) {
          diagnostics.push(
            `[DIALOGUE] Scene "${scene.heading}" has underwritten dialogue (${dialogueElements}:${actionElements} ratio). Characters may need more voice in this scene.`,
          );
        }
      } else if (dialogueElements > 4) {
        diagnostics.push(
          `[DIALOGUE] Scene "${scene.heading}" is all dialogue with no action lines (${dialogueElements} dialogue blocks). Add physical beats to ground the scene visually.`,
        );
      }
    }
  }

  // --- Verbose action ------------------------------------------------------
  if (includeAll || focus === 'action') {
    for (const scene of targetScenes) {
      for (const el of scene.elements) {
        if (el.type === 'action') {
          const lineCount = el.text.split('\n').length;
          if (lineCount > 4) {
            const preview = el.text.split('\n')[0].slice(0, 60);
            diagnostics.push(
              `[ACTION] Verbose action block (${lineCount} lines) in "${scene.heading}" starting with "${preview}..." — candidate for trimming.`,
            );
          }
        }
      }
    }
  }

  // --- Scene length outliers -----------------------------------------------
  if (includeAll || focus === 'pacing') {
    if (parsed.scenes.length >= 3) {
      const sceneLengths = parsed.scenes.map(
        (s) => s.endLine - s.startLine + 1,
      );
      const avgLength =
        sceneLengths.reduce((a, b) => a + b, 0) / sceneLengths.length;

      for (let i = 0; i < targetScenes.length; i++) {
        const scene = targetScenes[i];
        const len = scene.endLine - scene.startLine + 1;

        if (len > avgLength * 2) {
          diagnostics.push(
            `[PACING] Scene "${scene.heading}" is significantly longer than average (${len} lines vs ~${Math.round(avgLength)} avg). Consider splitting or trimming.`,
          );
        } else if (len < avgLength * 0.3 && len < 5) {
          diagnostics.push(
            `[PACING] Scene "${scene.heading}" is very short (${len} lines vs ~${Math.round(avgLength)} avg). Consider whether it serves a clear purpose or should be merged.`,
          );
        }
      }
    }
  }

  // --- Repeated words/phrases ----------------------------------------------
  if (includeAll || focus === 'dialogue' || focus === 'action') {
    for (const scene of targetScenes) {
      const sceneText = scene.elements.map((el) => el.text).join(' ');
      const words = sceneText.toLowerCase().match(/\b[a-z]{4,}\b/g);
      if (words) {
        const counts = new Map<string, number>();
        const STOP_WORDS = new Set([
          'that', 'this', 'with', 'from', 'have', 'been', 'were', 'they',
          'their', 'them', 'then', 'than', 'what', 'when', 'where', 'which',
          'will', 'would', 'could', 'should', 'into', 'just', 'about', 'over',
          'some', 'only', 'your', 'more', 'back', 'down', 'here', 'there',
          'very', 'like', 'does', 'also', 'each', 'know', 'take', 'come',
          'make', 'look', 'said', 'says', 'goes', 'going', 'through',
        ]);
        for (const word of words) {
          if (!STOP_WORDS.has(word)) {
            counts.set(word, (counts.get(word) ?? 0) + 1);
          }
        }
        const repeated = Array.from(counts.entries())
          .filter(([, count]) => count >= 3)
          .sort((a, b) => b[1] - a[1]);

        if (repeated.length > 0) {
          const top = repeated
            .slice(0, 5)
            .map(([word, count]) => `"${word}" (${count}x)`)
            .join(', ');
          diagnostics.push(
            `[REPETITION] Scene "${scene.heading}" has repeated words: ${top}. Vary the language.`,
          );
        }
      }
    }
  }

  // --- Missing transitions -------------------------------------------------
  if (includeAll || focus === 'pacing') {
    for (let i = 0; i < targetScenes.length - 1; i++) {
      const current = targetScenes[i];
      const next = targetScenes[i + 1];

      // Check if INT/EXT changes between adjacent scenes.
      if (current.intExt !== next.intExt) {
        // Check if there's a transition element at the end of the current scene.
        const lastEl = current.elements[current.elements.length - 1];
        if (!lastEl || lastEl.type !== 'transition') {
          diagnostics.push(
            `[TRANSITION] No transition between "${current.heading}" and "${next.heading}" (${current.intExt} → ${next.intExt}). Consider whether a CUT TO: or visual bridge is needed.`,
          );
        }
      }
    }
  }

  // --- Validation issues ---------------------------------------------------
  if (includeAll || focus === 'format') {
    const issues = validateScreenplay(parsed);
    const relevant = sceneHeading
      ? issues.filter((issue) => {
          for (const scene of targetScenes) {
            if (issue.line >= scene.startLine && issue.line <= scene.endLine) {
              return true;
            }
          }
          return false;
        })
      : issues;

    if (relevant.length > 0) {
      for (const issue of relevant) {
        const icon =
          issue.severity === 'error'
            ? 'ERROR'
            : issue.severity === 'warning'
              ? 'WARN'
              : 'INFO';
        diagnostics.push(
          `[FORMAT/${icon}] Line ${issue.line}: ${issue.message} (${issue.rule})`,
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // Build report
  // -------------------------------------------------------------------------

  const report: string[] = ['## Polish Pass Report', ''];

  if (sceneHeading) {
    report.push(
      `**Scope**: Scene${targetScenes.length > 1 ? 's' : ''} matching "${sceneHeading}"`,
    );
  } else {
    report.push('**Scope**: Full screenplay');
  }
  report.push(`**Focus**: ${focus}`);
  report.push('');

  // Phase A summary.
  report.push('### Mechanical Fixes Applied');
  report.push('');
  if (mechanicalFixes.length > 0) {
    for (const fix of mechanicalFixes) {
      report.push(`- ${fix}`);
    }
  } else {
    report.push('No mechanical issues found — screenplay is clean.');
  }
  report.push('');

  // Phase B summary.
  report.push('### Creative Diagnostic');
  report.push('');
  if (diagnostics.length > 0) {
    report.push(
      `Found ${diagnostics.length} item(s) to review (prioritized by impact):`,
    );
    report.push('');
    // Sort: ERROR > WARN > creative issues.
    const sorted = diagnostics.sort((a, b) => {
      const priority = (s: string) => {
        if (s.includes('[FORMAT/ERROR]')) return 0;
        if (s.includes('[FORMAT/WARN]')) return 1;
        if (s.includes('[DIALOGUE]')) return 2;
        if (s.includes('[ACTION]')) return 3;
        if (s.includes('[PACING]')) return 4;
        if (s.includes('[REPETITION]')) return 5;
        if (s.includes('[TRANSITION]')) return 6;
        return 7;
      };
      return priority(a) - priority(b);
    });
    for (let i = 0; i < sorted.length; i++) {
      report.push(`${i + 1}. ${sorted[i]}`);
    }
  } else {
    report.push('No creative issues detected — looking sharp.');
  }

  return {
    result: report.join('\n'),
    updatedScreenplay: fixed !== screenplay ? fixed : undefined,
  };
}

// ---------------------------------------------------------------------------
// Story Bible tool implementation
// ---------------------------------------------------------------------------

function executeGetStoryBible(): ToolResult {
  try {
    const bible = useStoryBibleStore.getState().bible;
    if (!bible) {
      return { result: 'No story bible found for this project.' };
    }

    const lines: string[] = ['## Story Bible', ''];

    // Overview
    lines.push('### Overview');
    lines.push('');
    lines.push(`- **Genre**: ${bible.genre || '(not set)'}`);
    lines.push(`- **Tone**: ${bible.tone || '(not set)'}`);
    lines.push(`- **Themes**: ${bible.themes.length > 0 ? bible.themes.join(', ') : '(none)'}`);
    lines.push(`- **Logline**: ${bible.logline || '(not set)'}`);
    if (bible.synopsis) {
      lines.push(`- **Synopsis**: ${bible.synopsis}`);
    }
    lines.push('');

    // Characters
    lines.push('### Characters');
    lines.push('');
    if (bible.characters.length === 0) {
      lines.push('No characters defined.');
    } else {
      for (const char of bible.characters) {
        lines.push(`#### ${char.name}`);
        if (char.description) lines.push(`- **Description**: ${char.description}`);
        if (char.arc) lines.push(`- **Arc**: ${char.arc}`);
        if (char.relationships.length > 0) {
          const rels = char.relationships
            .map((r) => `${r.characterId}: ${r.relationship}`)
            .join('; ');
          lines.push(`- **Relationships**: ${rels}`);
        }
        if (char.notes) lines.push(`- **Notes**: ${char.notes}`);
        lines.push('');
      }
    }

    // Locations
    lines.push('### Locations');
    lines.push('');
    if (bible.locations.length === 0) {
      lines.push('No locations defined.');
    } else {
      for (const loc of bible.locations) {
        lines.push(`- **${loc.name}**${loc.description ? `: ${loc.description}` : ''}`);
        if (loc.associatedScenes.length > 0) {
          lines.push(`  Scenes: ${loc.associatedScenes.join(', ')}`);
        }
      }
    }
    lines.push('');

    // Beat Sheet
    lines.push('### Beat Sheet (Save the Cat)');
    lines.push('');
    const completed = bible.beatSheet.filter((b) => b.completed).length;
    lines.push(`Progress: ${completed}/${bible.beatSheet.length} beats completed`);
    lines.push('');
    for (const beat of bible.beatSheet) {
      const check = beat.completed ? '[x]' : '[ ]';
      lines.push(`${check} **${beat.beat}**`);
      if (beat.description) {
        lines.push(`    ${beat.description}`);
      }
      if (beat.sceneRefs.length > 0) {
        lines.push(`    Scene refs: ${beat.sceneRefs.join(', ')}`);
      }
    }
    lines.push('');

    // Custom notes
    if (bible.customNotes) {
      lines.push('### Writer Notes');
      lines.push('');
      lines.push(bible.customNotes);
    }

    return { result: lines.join('\n') };
  } catch {
    return { result: 'Story bible is not available.' };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find a scene by heading (case-insensitive substring match) or by
 * 1-based sequential number.
 */
function findScene(
  parsed: Screenplay,
  heading?: string,
  number?: number,
): Scene | undefined {
  if (heading) {
    const lower = heading.toLowerCase();
    return parsed.scenes.find((s) =>
      s.heading.toLowerCase().includes(lower),
    );
  }
  if (number !== undefined && number >= 1 && number <= parsed.scenes.length) {
    return parsed.scenes[number - 1];
  }
  return undefined;
}

/**
 * Count non-overlapping occurrences of `search` in `text`.
 */
function countOccurrences(text: string, search: string): number {
  if (search.length === 0) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(search, pos)) !== -1) {
    count++;
    pos += search.length;
  }
  return count;
}

// ---------------------------------------------------------------------------
// Dialogue tool implementation
// ---------------------------------------------------------------------------

/** Common stop words excluded from vocabulary analysis. */
const DIALOGUE_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'not', 'are', 'was', 'were',
  'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'that',
  'this', 'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
  'such', 'than', 'too', 'very', 'just', 'about', 'over', 'into', 'back',
  'down', 'here', 'there', 'then', 'them', 'they', 'their', 'your', 'you',
  'we', 'he', 'she', 'his', 'her', 'my', 'me', 'its', 'our', 'us',
  'if', 'so', 'no', 'yes', 'up', 'out', 'off', 'also', 'only', 'now',
  'well', 'know', 'like', 'going', 'get', 'got', 'right', 'okay',
]);

interface CharacterDialogueData {
  name: string;
  lines: string[];
  wordCount: number;
  avgWordsPerBlock: number;
  topVocab: [string, number][];
  questionRatio: number;
  avgSentenceLength: number;
  sentenceLengthVariance: number;
}

function extractCharacterDialogue(
  parsed: Screenplay,
  targetScenes: Scene[],
  characterFilter?: string,
): Map<string, string[]> {
  const dialogueMap = new Map<string, string[]>();

  for (const scene of targetScenes) {
    let currentCharacter: string | null = null;
    for (const el of scene.elements) {
      if (el.type === 'character') {
        // Strip extensions like (V.O.), (O.S.), (CONT'D)
        currentCharacter = el.text.replace(/\s*\(.*?\)\s*/g, '').trim();
      } else if (el.type === 'dialogue' && currentCharacter) {
        if (!characterFilter || currentCharacter.toLowerCase() === characterFilter.toLowerCase()) {
          if (!dialogueMap.has(currentCharacter)) {
            dialogueMap.set(currentCharacter, []);
          }
          dialogueMap.get(currentCharacter)!.push(el.text);
        }
      } else if (el.type !== 'parenthetical') {
        currentCharacter = null;
      }
    }
  }

  return dialogueMap;
}

function buildCharacterProfile(name: string, lines: string[]): CharacterDialogueData {
  const allText = lines.join(' ');
  const words = allText.toLowerCase().match(/\b[a-z']+\b/g) ?? [];
  const wordCount = words.length;
  const avgWordsPerBlock = lines.length > 0 ? wordCount / lines.length : 0;

  // Top vocabulary (non-stop words)
  const vocab = new Map<string, number>();
  for (const w of words) {
    if (w.length >= 3 && !DIALOGUE_STOP_WORDS.has(w)) {
      vocab.set(w, (vocab.get(w) ?? 0) + 1);
    }
  }
  const topVocab = Array.from(vocab.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Question vs statement ratio
  const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const questions = allText.split('?').length - 1;
  const questionRatio = sentences.length > 0 ? questions / sentences.length : 0;

  // Sentence length stats
  const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avgSentenceLength = sentenceLengths.length > 0
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
    : 0;
  const sentenceLengthVariance = sentenceLengths.length > 1
    ? sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgSentenceLength, 2), 0) / sentenceLengths.length
    : 0;

  return {
    name,
    lines,
    wordCount,
    avgWordsPerBlock: Math.round(avgWordsPerBlock * 10) / 10,
    topVocab,
    questionRatio: Math.round(questionRatio * 100) / 100,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    sentenceLengthVariance: Math.round(sentenceLengthVariance * 10) / 10,
  };
}

function executeDialogue(
  screenplay: string,
  input: Record<string, unknown>,
): ToolResult {
  const action = input.action as string;
  const character = input.character as string | undefined;
  const sceneHeading = input.sceneHeading as string | undefined;
  const direction = input.direction as string | undefined;

  const parsed = parseFountain(screenplay);

  // Determine target scenes
  let targetScenes = parsed.scenes;
  if (sceneHeading) {
    const lower = sceneHeading.toLowerCase();
    targetScenes = parsed.scenes.filter(s => s.heading.toLowerCase().includes(lower));
    if (targetScenes.length === 0) {
      return { result: `Scene not found: "${sceneHeading}"` };
    }
  }

  switch (action) {
    case 'analyze':
      return executeDialogueAnalyze(parsed, targetScenes, character);
    case 'generate':
      if (!character) {
        return { result: 'Error: "character" parameter is required for the generate action.' };
      }
      return executeDialogueGenerate(parsed, targetScenes, character, direction);
    case 'rewrite':
      if (!character) {
        return { result: 'Error: "character" parameter is required for the rewrite action.' };
      }
      return executeDialogueRewrite(parsed, targetScenes, character, direction);
    default:
      return { result: `Unknown dialogue action: "${action}". Use "analyze", "generate", or "rewrite".` };
  }
}

function executeDialogueAnalyze(
  parsed: Screenplay,
  targetScenes: Scene[],
  characterFilter?: string,
): ToolResult {
  const dialogueMap = extractCharacterDialogue(parsed, targetScenes, characterFilter);

  if (dialogueMap.size === 0) {
    return { result: 'No dialogue found in the specified scope.' };
  }

  const profiles: CharacterDialogueData[] = [];
  for (const [name, lines] of Array.from(dialogueMap)) {
    profiles.push(buildCharacterProfile(name, lines));
  }

  const report: string[] = ['## Dialogue Analysis', ''];

  // Per-character analysis
  for (const profile of profiles) {
    report.push(`### ${profile.name}`);
    report.push('');
    report.push(`- **Dialogue blocks**: ${profile.lines.length}`);
    report.push(`- **Total words**: ${profile.wordCount}`);
    report.push(`- **Avg words/block**: ${profile.avgWordsPerBlock}`);
    report.push(`- **Avg sentence length**: ${profile.avgSentenceLength} words`);
    report.push(`- **Sentence length variance**: ${profile.sentenceLengthVariance} (${profile.sentenceLengthVariance > 15 ? 'varied rhythm' : 'uniform rhythm'})`);
    report.push(`- **Question ratio**: ${Math.round(profile.questionRatio * 100)}% of sentences are questions`);

    if (profile.topVocab.length > 0) {
      const vocabStr = profile.topVocab
        .map(([word, count]) => `"${word}" (${count}x)`)
        .join(', ');
      report.push(`- **Top vocabulary**: ${vocabStr}`);
    }

    // Quality flags
    const flags: string[] = [];

    // On-the-nose detection: dialogue containing emotion words
    const emotionWords = ['angry', 'sad', 'happy', 'scared', 'love', 'hate', 'afraid', 'sorry', 'feel', 'feeling'];
    const emotionHits: string[] = [];
    for (const line of profile.lines) {
      const lower = line.toLowerCase();
      for (const ew of emotionWords) {
        if (lower.includes(ew)) {
          emotionHits.push(`"${line.slice(0, 50)}${line.length > 50 ? '...' : ''}" (contains "${ew}")`);
          break;
        }
      }
    }
    if (emotionHits.length > 0) {
      flags.push(`**On-the-nose alert**: ${emotionHits.length} line(s) state emotions directly — ${emotionHits.slice(0, 2).join('; ')}`);
    }

    // Monologue detection: blocks > 5 lines (estimated by word count > 60)
    const longBlocks = profile.lines.filter(l => l.split('\n').length > 5 || l.split(/\s+/).length > 60);
    if (longBlocks.length > 0) {
      flags.push(`**Monologue alert**: ${longBlocks.length} long dialogue block(s) — consider breaking up with action beats or interruptions`);
    }

    // Exposition detection
    const expositionPatterns = ['as you know', 'as we discussed', 'remember when', 'let me explain', 'the reason is', 'what you need to understand'];
    const expositionHits: string[] = [];
    for (const line of profile.lines) {
      const lower = line.toLowerCase();
      for (const pattern of expositionPatterns) {
        if (lower.includes(pattern)) {
          expositionHits.push(`"${pattern}" detected`);
          break;
        }
      }
    }
    if (expositionHits.length > 0) {
      flags.push(`**Exposition dump**: ${expositionHits.length} line(s) with expository patterns — ${expositionHits.slice(0, 2).join('; ')}`);
    }

    if (flags.length > 0) {
      report.push('');
      report.push('**Quality flags:**');
      for (const flag of flags) {
        report.push(`  - ${flag}`);
      }
    }

    report.push('');
  }

  // Cross-character voice distinctiveness (when multiple characters)
  if (profiles.length >= 2) {
    report.push('### Voice Distinctiveness');
    report.push('');

    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const a = profiles[i];
        const b = profiles[j];

        // Word overlap
        const aWords = new Set(a.topVocab.map(([w]) => w));
        const bWords = new Set(b.topVocab.map(([w]) => w));
        const overlap = Array.from(aWords).filter(w => bWords.has(w));
        const overlapPct = Math.round((overlap.length / Math.max(aWords.size, bWords.size, 1)) * 100);

        // Sentence length similarity
        const lengthDiff = Math.abs(a.avgSentenceLength - b.avgSentenceLength);

        const distinct = overlapPct < 30 && lengthDiff > 2;
        const similar = overlapPct > 50 || lengthDiff < 1;

        report.push(`- **${a.name} vs ${b.name}**: Vocab overlap ${overlapPct}%, sentence length diff ${lengthDiff.toFixed(1)} words`);
        if (similar) {
          report.push(`  ⚠ These characters sound similar — differentiate vocabulary, rhythm, or sentence structure`);
        } else if (distinct) {
          report.push(`  ✓ Distinct voices detected`);
        }
      }
    }

    report.push('');
  }

  // Dialogue-to-action ratio per scene
  report.push('### Scene Dialogue Density');
  report.push('');
  for (const scene of targetScenes) {
    let dCount = 0;
    let aCount = 0;
    for (const el of scene.elements) {
      if (el.type === 'dialogue') dCount++;
      if (el.type === 'action') aCount++;
    }
    if (dCount > 0 || aCount > 0) {
      const ratio = aCount > 0 ? (dCount / aCount).toFixed(1) : 'all dialogue';
      report.push(`- **${scene.heading}**: ${dCount} dialogue / ${aCount} action (ratio: ${ratio})`);
    }
  }

  return { result: report.join('\n') };
}

function executeDialogueGenerate(
  parsed: Screenplay,
  targetScenes: Scene[],
  character: string,
  direction?: string,
): ToolResult {
  // Collect ALL dialogue for this character across the entire screenplay
  const allDialogue = extractCharacterDialogue(parsed, parsed.scenes, character);
  const characterLines = allDialogue.get(character.toUpperCase()) ?? allDialogue.get(character) ?? [];

  // Also check with case-insensitive match
  if (characterLines.length === 0) {
    for (const [name, lines] of Array.from(allDialogue)) {
      if (name.toLowerCase() === character.toLowerCase()) {
        characterLines.push(...lines);
        break;
      }
    }
  }

  const brief: string[] = ['## Dialogue Generation Brief', ''];

  // Voice profile
  if (characterLines.length > 0) {
    const profile = buildCharacterProfile(character.toUpperCase(), characterLines);
    brief.push('### Character Voice Profile');
    brief.push('');
    brief.push(`- **Character**: ${character.toUpperCase()}`);
    brief.push(`- **Existing dialogue blocks**: ${profile.lines.length}`);
    brief.push(`- **Avg words/block**: ${profile.avgWordsPerBlock}`);
    brief.push(`- **Avg sentence length**: ${profile.avgSentenceLength} words`);
    brief.push(`- **Rhythm**: ${profile.sentenceLengthVariance > 15 ? 'Varied — mixes short and long' : 'Uniform — consistent cadence'}`);
    brief.push(`- **Question tendency**: ${Math.round(profile.questionRatio * 100)}%`);
    if (profile.topVocab.length > 0) {
      brief.push(`- **Signature words**: ${profile.topVocab.slice(0, 5).map(([w]) => `"${w}"`).join(', ')}`);
    }

    // Most characteristic lines (up to 5)
    const bestLines = characterLines
      .filter(l => l.split(/\s+/).length >= 5 && l.split(/\s+/).length <= 30)
      .slice(0, 5);
    if (bestLines.length > 0) {
      brief.push('');
      brief.push('**Characteristic lines:**');
      for (const line of bestLines) {
        brief.push(`> ${line}`);
      }
    }
  } else {
    brief.push(`### Character Voice Profile`);
    brief.push('');
    brief.push(`No existing dialogue found for "${character}". This is a new voice — build from scratch.`);
  }

  // Scene context
  brief.push('');
  brief.push('### Scene Context');
  brief.push('');
  for (const scene of targetScenes) {
    brief.push(`**${scene.heading}**`);
    const characters = scene.characters.join(', ') || 'none';
    brief.push(`Characters present: ${characters}`);

    // Action lines for context
    const actions: string[] = [];
    for (const el of scene.elements) {
      if (el.type === 'action') {
        actions.push(el.text.split('\n')[0]);
      }
    }
    if (actions.length > 0) {
      brief.push(`Scene action: ${actions.slice(0, 3).join(' | ')}`);
    }

    // Preceding dialogue (last 3 blocks before where new dialogue would go)
    const dialogueBlocks: string[] = [];
    let lastChar: string | null = null;
    for (const el of scene.elements) {
      if (el.type === 'character') {
        lastChar = el.text;
      } else if (el.type === 'dialogue' && lastChar) {
        dialogueBlocks.push(`${lastChar}: ${el.text.slice(0, 60)}${el.text.length > 60 ? '...' : ''}`);
      }
    }
    if (dialogueBlocks.length > 0) {
      brief.push('');
      brief.push('Recent dialogue in scene:');
      for (const db of dialogueBlocks.slice(-3)) {
        brief.push(`  ${db}`);
      }
    }
    brief.push('');
  }

  // Direction
  if (direction) {
    brief.push('### Creative Direction');
    brief.push('');
    brief.push(direction);
    brief.push('');
  }

  brief.push('---');
  brief.push('Use `edit_scene` or `insert_scene` to write the new dialogue based on this brief.');

  return { result: brief.join('\n') };
}

function executeDialogueRewrite(
  parsed: Screenplay,
  targetScenes: Scene[],
  character: string,
  direction?: string,
): ToolResult {
  // Get dialogue in the target scenes
  const sceneDialogue = extractCharacterDialogue(parsed, targetScenes, character);

  // Find the character's lines (case-insensitive)
  let targetLines: string[] = [];
  let resolvedName = character.toUpperCase();
  for (const [name, lines] of Array.from(sceneDialogue)) {
    if (name.toLowerCase() === character.toLowerCase()) {
      targetLines = lines;
      resolvedName = name;
      break;
    }
  }

  if (targetLines.length === 0) {
    return { result: `No dialogue found for "${character}" in the specified scene(s).` };
  }

  // Build voice profile from ALL screenplay dialogue for this character
  const allDialogue = extractCharacterDialogue(parsed, parsed.scenes, character);
  let allLines: string[] = [];
  for (const [name, lines] of Array.from(allDialogue)) {
    if (name.toLowerCase() === character.toLowerCase()) {
      allLines = lines;
      break;
    }
  }

  const brief: string[] = ['## Dialogue Rewrite Brief', ''];

  // Original dialogue to rewrite
  brief.push('### Original Dialogue');
  brief.push('');
  brief.push(`**${resolvedName}** in target scene(s):`);
  for (const line of targetLines) {
    brief.push(`> ${line}`);
  }
  brief.push('');

  // Voice profile
  if (allLines.length > 0) {
    const profile = buildCharacterProfile(resolvedName, allLines);
    brief.push('### Voice Profile');
    brief.push('');
    brief.push(`- **Avg words/block**: ${profile.avgWordsPerBlock}`);
    brief.push(`- **Avg sentence length**: ${profile.avgSentenceLength} words`);
    brief.push(`- **Rhythm**: ${profile.sentenceLengthVariance > 15 ? 'Varied' : 'Uniform'}`);
    brief.push(`- **Question tendency**: ${Math.round(profile.questionRatio * 100)}%`);
    if (profile.topVocab.length > 0) {
      brief.push(`- **Signature words**: ${profile.topVocab.slice(0, 5).map(([w]) => `"${w}"`).join(', ')}`);
    }
    brief.push('');
  }

  // Direction
  if (direction) {
    brief.push('### Creative Direction');
    brief.push('');
    brief.push(direction);
    brief.push('');
  }

  brief.push('---');
  brief.push('Use `replace_text` or `edit_scene` to apply the rewritten dialogue.');

  return { result: brief.join('\n') };
}

// ---------------------------------------------------------------------------
// Read-only tool filtering for writers-room mode
// ---------------------------------------------------------------------------

const READ_ONLY_TOOLS = new Set([
  'read_screenplay', 'read_scene', 'search_screenplay',
  'get_outline', 'get_characters', 'get_statistics',
  'validate_format', 'dialogue', 'get_story_bible',
  'get_structure', 'read_act', 'get_act_analysis', 'analyze_narrative_arc', 'compare_structure',
]);

/**
 * Return the tool definitions available for the given AI mode.
 *
 * In writers-room mode, only read-only and analytical tools are available.
 * All other modes have access to the full tool set.
 */
export function getToolsForMode(mode: string): ToolDefinition[] {
  if (mode === 'writers-room') {
    return SCREENPLAY_TOOLS.filter((t) => READ_ONLY_TOOLS.has(t.name));
  }
  return SCREENPLAY_TOOLS;
}
