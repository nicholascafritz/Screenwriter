// ---------------------------------------------------------------------------
// AI Agent -- Structural Navigation Tools
// ---------------------------------------------------------------------------
//
// Five read-only tools that give the AI structural awareness of the
// screenplay: acts, sequences, narrative arcs, and TRIPOD-backed
// structural comparison against professional film norms.
//
// Usage:
//   import { STRUCTURE_TOOLS, executeStructureToolCall } from './structure-tools';
// ---------------------------------------------------------------------------

import { parseFountain } from '@/lib/fountain/parser';
import { detectStructure } from '@/lib/fountain/structure';
import { analyzeScreenplayStructure, formatTripodComparison } from '@/lib/tripod/analysis';
import type { ToolDefinition, ToolResult } from './tools';

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

export const STRUCTURE_TOOLS: ToolDefinition[] = [
  // 1. get_structure
  {
    name: 'get_structure',
    description:
      'Get the high-level structure of the screenplay: acts, sequences, and narrative flow. ' +
      'Shows how scenes are organized into larger dramatic units.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  // 2. read_act
  {
    name: 'read_act',
    description:
      'Read all scenes within a specific act. Returns scene headings, character lists, and ' +
      'summaries for every scene in the act.',
    input_schema: {
      type: 'object',
      properties: {
        actNumber: {
          type: 'number',
          description: 'The act number (1-based).',
        },
      },
      required: ['actNumber'],
    },
  },

  // 3. get_act_analysis
  {
    name: 'get_act_analysis',
    description:
      'Analyze a specific act for pacing, character distribution, location variety, and ' +
      'dramatic arc. Returns structured diagnostics.',
    input_schema: {
      type: 'object',
      properties: {
        actNumber: {
          type: 'number',
          description: 'The act number to analyze.',
        },
      },
      required: ['actNumber'],
    },
  },

  // 4. analyze_narrative_arc (TRIPOD-enhanced)
  {
    name: 'analyze_narrative_arc',
    description:
      'Map the narrative arc across the full screenplay using empirical turning point data ' +
      'from 84 professionally produced films. Detects all five turning points (Opportunity, ' +
      'Change of Plans, Point of No Return, Major Setback, Climax) and compares their positions ' +
      'against professional norms. Identifies structural strengths and weaknesses with data-backed analysis.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  // 5. compare_structure (new — TRIPOD comparison)
  {
    name: 'compare_structure',
    description:
      'Compare the screenplay\'s structural pacing against empirical turning point data ' +
      'from 84 professionally produced films. Returns a detailed comparison showing where ' +
      'each turning point falls vs. the expected range, with diagnostic flags and examples ' +
      'from similar films. Use this when the writer asks about pacing, structure, or act balance.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
];

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

/**
 * Execute a structure-related tool call.  All tools are read-only.
 */
export function executeStructureToolCall(
  name: string,
  input: Record<string, unknown>,
  screenplay: string,
): ToolResult {
  const parsed = parseFountain(screenplay);
  const structure = detectStructure(parsed);

  switch (name) {
    case 'get_structure':
      return executeGetStructure(parsed, structure);
    case 'read_act':
      return executeReadAct(parsed, structure, input);
    case 'get_act_analysis':
      return executeGetActAnalysis(parsed, structure, input);
    case 'analyze_narrative_arc':
      return executeAnalyzeNarrativeArc(parsed, structure);
    case 'compare_structure':
      return executeCompareStructure(parsed);
    default:
      return { result: `Unknown structure tool: ${name}` };
  }
}

// ---------------------------------------------------------------------------
// Individual tool implementations
// ---------------------------------------------------------------------------

function executeGetStructure(
  parsed: ReturnType<typeof parseFountain>,
  structure: ReturnType<typeof detectStructure>,
): ToolResult {
  if (parsed.scenes.length === 0) {
    return { result: 'No scenes found in the screenplay.' };
  }

  const lines: string[] = [
    '## Screenplay Structure',
    '',
    `**Detection**: ${structure.detectionMethod}`,
    `**Total scenes**: ${structure.sceneCount}`,
    '',
  ];

  // Acts
  if (structure.acts.length > 0) {
    lines.push('### Acts');
    lines.push('');
    for (const act of structure.acts) {
      lines.push(
        `**${act.label}** (${act.source}) — ${act.sceneIndices.length} scene(s), ` +
          `lines ${act.startLine}-${act.endLine}`,
      );

      // List scenes briefly
      for (const si of act.sceneIndices) {
        const scene = parsed.scenes[si];
        const charCount = scene.characters.length;
        lines.push(
          `  ${si + 1}. ${scene.heading} [${charCount} character(s)]`,
        );
      }
      lines.push('');
    }
  }

  // Sequences
  if (structure.sequences.length > 0) {
    lines.push('### Sequences');
    lines.push('');
    for (const seq of structure.sequences) {
      lines.push(
        `- **${seq.label}** (Act ${seq.actNumber}, ${seq.sceneIndices.length} scene(s)) — ` +
          `lines ${seq.startLine}-${seq.endLine}`,
      );
    }
  }

  return { result: lines.join('\n') };
}

function executeReadAct(
  parsed: ReturnType<typeof parseFountain>,
  structure: ReturnType<typeof detectStructure>,
  input: Record<string, unknown>,
): ToolResult {
  const actNumber = input.actNumber as number;

  const act = structure.acts.find((a) => a.number === actNumber);
  if (!act) {
    return {
      result: `Act ${actNumber} not found. Available acts: ${structure.acts.map((a) => a.number).join(', ') || 'none'}`,
    };
  }

  const lines: string[] = [
    `## ${act.label}`,
    '',
    `**Source**: ${act.source} detection`,
    `**Scenes**: ${act.sceneIndices.length}`,
    `**Lines**: ${act.startLine}-${act.endLine}`,
    '',
  ];

  for (const si of act.sceneIndices) {
    const scene = parsed.scenes[si];
    lines.push(`### Scene ${si + 1}: ${scene.heading}`);
    lines.push(`Lines ${scene.startLine}-${scene.endLine}`);
    lines.push(`Characters: ${scene.characters.join(', ') || 'none'}`);
    lines.push(`Elements: ${scene.elements.length}`);

    // First action line as summary.
    let summary = '';
    for (const el of scene.elements) {
      if (el.type === 'action') {
        summary = el.text.split('\n')[0];
        if (summary.length > 100) {
          summary = summary.slice(0, 97) + '...';
        }
        break;
      }
    }
    if (summary) {
      lines.push(`Summary: ${summary}`);
    }
    lines.push('');
  }

  return { result: lines.join('\n') };
}

function executeGetActAnalysis(
  parsed: ReturnType<typeof parseFountain>,
  structure: ReturnType<typeof detectStructure>,
  input: Record<string, unknown>,
): ToolResult {
  const actNumber = input.actNumber as number;

  const act = structure.acts.find((a) => a.number === actNumber);
  if (!act) {
    return {
      result: `Act ${actNumber} not found. Available acts: ${structure.acts.map((a) => a.number).join(', ') || 'none'}`,
    };
  }

  const scenes = act.sceneIndices.map((si) => parsed.scenes[si]);
  const lines: string[] = [
    `## ${act.label} — Analysis`,
    '',
  ];

  // Scene lengths
  const sceneLengths = scenes.map((s) => s.endLine - s.startLine + 1);
  const totalLines = sceneLengths.reduce((a, b) => a + b, 0);
  const avgLength = sceneLengths.length > 0
    ? totalLines / sceneLengths.length
    : 0;
  const estimatedPages = Math.max(1, Math.ceil(totalLines / 56));

  lines.push('### Pacing');
  lines.push('');
  lines.push(`- **Scenes**: ${scenes.length}`);
  lines.push(`- **Total lines**: ${totalLines}`);
  lines.push(`- **Estimated pages**: ~${estimatedPages}`);
  lines.push(`- **Avg scene length**: ~${Math.round(avgLength)} lines`);

  // Longest and shortest scenes
  if (scenes.length > 0) {
    let longestIdx = 0;
    let shortestIdx = 0;
    for (let i = 1; i < sceneLengths.length; i++) {
      if (sceneLengths[i] > sceneLengths[longestIdx]) longestIdx = i;
      if (sceneLengths[i] < sceneLengths[shortestIdx]) shortestIdx = i;
    }
    lines.push(`- **Longest scene**: "${scenes[longestIdx].heading}" (${sceneLengths[longestIdx]} lines)`);
    lines.push(`- **Shortest scene**: "${scenes[shortestIdx].heading}" (${sceneLengths[shortestIdx]} lines)`);

    // Pacing flag
    if (sceneLengths[longestIdx] > avgLength * 2.5) {
      lines.push(`- **Flag**: Longest scene is >2.5x average — potential pacing drag.`);
    }
  }
  lines.push('');

  // Dialogue-to-action balance
  let totalDialogue = 0;
  let totalAction = 0;
  for (const scene of scenes) {
    for (const el of scene.elements) {
      if (el.type === 'dialogue') totalDialogue++;
      if (el.type === 'action') totalAction++;
    }
  }
  const ratio = totalAction > 0 ? (totalDialogue / totalAction).toFixed(2) : 'all dialogue';

  lines.push('### Dialogue/Action Balance');
  lines.push('');
  lines.push(`- **Dialogue blocks**: ${totalDialogue}`);
  lines.push(`- **Action blocks**: ${totalAction}`);
  lines.push(`- **Ratio**: ${ratio}`);
  lines.push('');

  // Character distribution
  const charSceneCount = new Map<string, number>();
  for (const scene of scenes) {
    for (const charName of scene.characters) {
      charSceneCount.set(charName, (charSceneCount.get(charName) ?? 0) + 1);
    }
  }

  const sortedChars = Array.from(charSceneCount.entries())
    .sort((a, b) => b[1] - a[1]);

  lines.push('### Character Distribution');
  lines.push('');
  for (const [name, count] of sortedChars.slice(0, 10)) {
    const pct = Math.round((count / scenes.length) * 100);
    lines.push(`- **${name}**: ${count}/${scenes.length} scenes (${pct}%)`);
  }
  lines.push('');

  // INT/EXT ratio
  let intCount = 0;
  let extCount = 0;
  for (const scene of scenes) {
    if (scene.intExt === 'INT') intCount++;
    else if (scene.intExt === 'EXT') extCount++;
  }

  lines.push('### Location Variety');
  lines.push('');
  lines.push(`- **Interior**: ${intCount} scene(s)`);
  lines.push(`- **Exterior**: ${extCount} scene(s)`);

  const uniqueLocations = new Set(scenes.map((s) => s.location));
  lines.push(`- **Unique locations**: ${uniqueLocations.size}`);

  if (uniqueLocations.size === 1 && scenes.length > 3) {
    lines.push(`- **Flag**: All scenes in the same location — consider adding visual variety.`);
  }

  return { result: lines.join('\n') };
}

// ---------------------------------------------------------------------------
// TRIPOD-Enhanced Narrative Arc Analysis
// ---------------------------------------------------------------------------

function executeAnalyzeNarrativeArc(
  parsed: ReturnType<typeof parseFountain>,
  structure: ReturnType<typeof detectStructure>,
): ToolResult {
  if (parsed.scenes.length === 0) {
    return { result: 'No scenes found in the screenplay.' };
  }

  // Run TRIPOD-enhanced analysis
  const comparison = analyzeScreenplayStructure(parsed);
  const tripodReport = formatTripodComparison(comparison);

  const totalScenes = parsed.scenes.length;
  const lines: string[] = [tripodReport];

  // -----------------------------------------------------------------------
  // Additional structural diagnostics (retained from original)
  // -----------------------------------------------------------------------
  lines.push('### Additional Diagnostics');
  lines.push('');

  // Act balance
  if (structure.acts.length >= 2) {
    const actSizes = structure.acts.map((a) => a.sceneIndices.length);
    const maxAct = Math.max(...actSizes);
    const minAct = Math.min(...actSizes);

    if (maxAct > minAct * 3) {
      lines.push(`- **Imbalanced acts**: Largest act has ${maxAct} scenes vs smallest with ${minAct}. Consider rebalancing.`);
    } else {
      lines.push(`- **Act balance**: Reasonable distribution across ${structure.acts.length} acts.`);
    }
  }

  // Character throughline
  const mainCharScenes = new Map<string, number>();
  for (const scene of parsed.scenes) {
    for (const charName of scene.characters) {
      mainCharScenes.set(charName, (mainCharScenes.get(charName) ?? 0) + 1);
    }
  }

  const sortedByPresence = Array.from(mainCharScenes.entries())
    .sort((a, b) => b[1] - a[1]);

  if (sortedByPresence.length > 0) {
    const [protagonist, presenceCount] = sortedByPresence[0];
    const presencePct = Math.round((presenceCount / totalScenes) * 100);
    lines.push(`- **Protagonist**: "${protagonist}" appears in ${presenceCount}/${totalScenes} scenes (${presencePct}%)`);

    if (presencePct < 50) {
      lines.push(`  Note: Protagonist presence below 50% — consider whether the story has a clear lead or is an ensemble.`);
    }
  }

  // Location variety
  const allLocations = new Set(parsed.scenes.map((s) => s.location));
  lines.push(`- **Location variety**: ${allLocations.size} unique locations across ${totalScenes} scenes.`);

  // Pacing rhythm
  const sceneLengths = parsed.scenes.map((s) => s.endLine - s.startLine + 1);
  const avgLength = sceneLengths.reduce((a, b) => a + b, 0) / sceneLengths.length;
  const variance = sceneLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sceneLengths.length;
  const stdDev = Math.sqrt(variance);

  lines.push(`- **Pacing rhythm**: Avg scene length ~${Math.round(avgLength)} lines (std dev: ${Math.round(stdDev)})`);
  if (stdDev > avgLength) {
    lines.push(`  Note: High scene length variance — pacing may feel uneven.`);
  } else if (stdDev < avgLength * 0.3) {
    lines.push(`  Note: Very uniform scene lengths — consider varying rhythm for dramatic effect.`);
  }

  return { result: lines.join('\n') };
}

// ---------------------------------------------------------------------------
// TRIPOD Structure Comparison Tool
// ---------------------------------------------------------------------------

function executeCompareStructure(
  parsed: ReturnType<typeof parseFountain>,
): ToolResult {
  if (parsed.scenes.length === 0) {
    return { result: 'No scenes found in the screenplay.' };
  }

  const comparison = analyzeScreenplayStructure(parsed);
  return { result: formatTripodComparison(comparison) };
}
