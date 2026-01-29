// ---------------------------------------------------------------------------
// AI Agent -- Few-Shot Examples & Tool Usage Patterns
// ---------------------------------------------------------------------------
//
// Provides concrete examples of ideal AI behavior for each operating mode,
// plus tool sequencing patterns for common workflows.  These are embedded
// in the system prompt to steer the model toward correct tool usage and
// appropriate response patterns.
//
// Usage:
//   import { buildModeExamples, buildToolPatterns } from '@/lib/agent/examples';
//   const examples = buildModeExamples('inline');
//   const patterns = buildToolPatterns('agent');
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FewShotExample {
  /** What the user asked for. */
  userRequest: string;
  /** The ideal tool call sequence (tool names in order). */
  toolSequence: string[];
  /** What the AI response should look like (abbreviated). */
  responsePattern: string;
}

interface ToolPattern {
  /** Short name for the workflow. */
  name: string;
  /** When to use this pattern. */
  trigger: string;
  /** Ordered tool sequence. */
  steps: string[];
}

// ---------------------------------------------------------------------------
// Few-Shot Examples (2 per mode)
// ---------------------------------------------------------------------------

const MODE_EXAMPLES: Record<string, FewShotExample[]> = {
  inline: [
    {
      userRequest: 'Make Sarah\'s dialogue in the diner scene more confrontational.',
      toolSequence: ['read_scene', 'edit_scene'],
      responsePattern:
        'Read the target scene → rewrote Sarah\'s dialogue to be more direct and aggressive with flawless grammar and spelling → applied polished, error-free edit. Brief one-sentence explanation of the changes made.',
    },
    {
      userRequest: 'Tighten the action lines in the car chase.',
      toolSequence: ['read_scene', 'replace_text'],
      responsePattern:
        'Read the scene → identified verbose action lines → used replace_text with clean, grammatically perfect replacements. One-line summary: "Trimmed 4 action blocks to shorter, punchier beats — all prose publication-ready."',
    },
  ],

  diff: [
    {
      userRequest: 'The confrontation scene between Jack and Maria feels flat. Restructure it.',
      toolSequence: ['read_scene', 'edit_scene'],
      responsePattern:
        'Read the scene → proposed restructure with detailed creative rationale and flawless prose: "Moved Jack\'s confession earlier to create dramatic irony; added a silence beat before Maria responds to build tension; shortened the final exchange so the scene ends on a gut punch." All dialogue and action lines are grammatically perfect with zero typos.',
    },
    {
      userRequest: 'Jack and Maria sound too similar. Differentiate their voices.',
      toolSequence: ['get_characters', 'read_scene', 'edit_scene'],
      responsePattern:
        'Checked character data → read their shared scenes → proposed polished, error-free dialogue edits with per-change reasoning: "Jack now speaks in clipped fragments (military background); Maria uses longer, more rhetorical constructions (lawyer)." Every line reviewed for spelling and grammar before submission.',
    },
  ],

  agent: [
    {
      userRequest: 'Add a jealousy subplot between Nora and Ben throughout the script.',
      toolSequence: [
        'get_outline',
        'get_characters',
        'read_scene',
        'edit_scene',
        'read_scene',
        'edit_scene',
        'read_scene',
        'insert_scene',
        'validate_format',
      ],
      responsePattern:
        'Analyzed full outline and character arcs → identified 3 optimal insertion points → seeded jealousy in Act 1 dialogue, escalated in Act 2 with a new confrontation scene, resolved in Act 3. All new content is publication-ready with perfect grammar, spelling, and sentence structure → validated format after all changes. Provided a summary of each modification and how they connect.',
    },
    {
      userRequest: 'The second act drags. Fix the pacing.',
      toolSequence: [
        'get_statistics',
        'get_outline',
        'read_scene',
        'read_scene',
        'edit_scene',
        'delete_scene',
        'reorder_scenes',
        'validate_format',
        'get_statistics',
      ],
      responsePattern:
        'Analyzed statistics and outline to identify bloat → found two redundant scenes and three over-long dialogue exchanges → trimmed dialogue with flawless rewrites, cut one scene, merged another, reordered for momentum → all edits are grammatically perfect with zero typos → validated format → confirmed improved page count and scene distribution.',
    },
  ],

  'writers-room': [
    {
      userRequest: 'I\'m thinking about having Jake betray Sarah in the third act. What do you think?',
      toolSequence: ['get_outline', 'get_characters', 'read_scene', 'read_scene'],
      responsePattern:
        'Analyzed the outline and character arcs → pushed back with specific evidence: "Jake\'s betrayal contradicts his Act 2 growth — he risks everything to protect Sarah in the warehouse scene. A betrayal here unravels that without setup. Instead: what if Jake is *forced* to choose between Sarah and his brother? That preserves his arc and raises the stakes."',
    },
    {
      userRequest: 'Something about the middle of the script feels off but I can\'t put my finger on it.',
      toolSequence: ['get_statistics', 'get_outline', 'read_scene', 'dialogue'],
      responsePattern:
        'Diagnosed the structural issue with data: "Your Act 2 is 45 pages — that\'s nearly half the script. The midpoint scene (INT. HOSPITAL) doesn\'t shift the dramatic question. Right now your protagonist is reacting from page 30 to page 75. The midpoint needs to flip the script — give her a choice that changes the game."',
    },
    {
      userRequest: 'How does my story structure compare to professional films?',
      toolSequence: ['compare_structure', 'analyze_narrative_arc', 'get_outline'],
      responsePattern:
        'Ran TRIPOD-enhanced structural comparison → showed turning point positions vs. professional norms: "Your Catalyst lands at page 18 — right in the typical range (p.9-20). But your Midpoint is late at page 72 (norm: p.54-70), which may explain why Act 2 feels like it drags. In Die Hard, the midpoint hits at 43% — yours is at 60%. Consider moving the hospital revelation earlier to tighten the second act."',
    },
  ],
};

// ---------------------------------------------------------------------------
// Tool Sequencing Patterns
// ---------------------------------------------------------------------------

const TOOL_PATTERNS: ToolPattern[] = [
  // Patterns 1-4: available in all modes (basic editing)
  {
    name: 'Single Scene Edit',
    trigger: 'User asks to change content within one scene.',
    steps: ['read_scene → edit_scene'],
  },
  {
    name: 'Targeted Text Change',
    trigger: 'User asks to find and replace specific text.',
    steps: ['search_screenplay → replace_text'],
  },
  {
    name: 'New Scene Addition',
    trigger: 'User asks to add a new scene.',
    steps: ['get_outline → read_scene (for context) → insert_scene → validate_format'],
  },
  {
    name: 'Polish Pass',
    trigger: 'User asks to polish, clean up, or do a quality pass on the screenplay or a scene.',
    steps: ['polish_pass → (review diagnostic) → edit_scene / replace_text → validate_format'],
  },
  // Pattern 5: dialogue workshop (available in all modes)
  {
    name: 'Dialogue Workshop',
    trigger: 'User asks to workshop, analyze, or improve dialogue for a character or scene.',
    steps: ['dialogue (analyze) → identify issues → dialogue (rewrite) → edit_scene / replace_text'],
  },
  // Patterns 6-8: agent mode only
  {
    name: 'Character Analysis',
    trigger: 'User asks about a character\'s arc, presence, or dialogue patterns.',
    steps: ['get_characters → get_statistics → read_scene (key scenes)'],
  },
  {
    name: 'Structural Reorganization',
    trigger: 'User asks to restructure, reorder, or fix pacing across multiple scenes.',
    steps: [
      'get_outline → get_statistics → read_scene (multiple) → reorder_scenes / delete_scene → validate_format',
    ],
  },
  {
    name: 'Full Script Review',
    trigger: 'User asks for a comprehensive review or analysis of the screenplay.',
    steps: [
      'get_statistics → get_outline → get_characters → validate_format → read_scene (selective)',
    ],
  },
  // Patterns 9-12: writers-room analysis patterns
  {
    name: 'Story Diagnosis',
    trigger: 'Writer says something feels off or asks for story-level feedback.',
    steps: ['get_outline → get_characters → read_scene (key scenes) → deliver diagnosis with specific fixes'],
  },
  {
    name: 'Idea Development',
    trigger: 'Writer pitches an idea and wants feedback or refinement.',
    steps: ['get_outline → read_scene (relevant) → evaluate fit with existing story → pitch refinements'],
  },
  {
    name: 'Character Deep Dive',
    trigger: 'Writer wants to develop a character further or fix voice issues.',
    steps: ['get_characters → dialogue (analyze) → read_scene (character scenes) → analyze arc and voice'],
  },
  {
    name: 'Structural Analysis',
    trigger: 'Writer asks about pacing, structure, or dramatic arc.',
    steps: ['analyze_narrative_arc / compare_structure → get_outline → read_scene (act breaks) → diagnose with TRIPOD norms and reference films'],
  },
];

/** Number of basic patterns available in inline/diff modes (patterns 1-5). */
const BASIC_PATTERN_COUNT = 5;

/** Index where agent-only patterns end and writers-room patterns begin. */
const AGENT_PATTERN_END = 8;

// ---------------------------------------------------------------------------
// Prompt Builders
// ---------------------------------------------------------------------------

/**
 * Build a system-prompt section with few-shot examples for the given mode.
 *
 * Each example shows the ideal user request → tool sequence → response
 * pattern so the model learns correct behavior by demonstration.
 */
export function buildModeExamples(mode: string): string {
  const examples = MODE_EXAMPLES[mode];
  if (!examples || examples.length === 0) return '';

  const lines: string[] = [
    '## Example Interactions',
    '',
    `The following examples illustrate ideal behavior in **${mode}** mode.`,
    '',
  ];

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i];
    lines.push(`### Example ${i + 1}`);
    lines.push('');
    lines.push(`**User**: "${ex.userRequest}"`);
    lines.push('');
    lines.push(`**Tool sequence**: ${ex.toolSequence.map(t => '`' + t + '`').join(' → ')}`);
    lines.push('');
    lines.push(`**Response pattern**: ${ex.responsePattern}`);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Build a system-prompt section describing ideal tool sequencing patterns.
 *
 * - inline/diff: patterns 1-5 (basic + dialogue)
 * - agent: patterns 1-8 (basic + dialogue + agent-only)
 * - writers-room: patterns 1-5 + 9-12 (basic + dialogue + analysis)
 */
export function buildToolPatterns(mode: string): string {
  let patterns: ToolPattern[];
  if (mode === 'agent') {
    patterns = TOOL_PATTERNS.slice(0, AGENT_PATTERN_END);
  } else if (mode === 'writers-room') {
    patterns = [
      ...TOOL_PATTERNS.slice(0, BASIC_PATTERN_COUNT),
      ...TOOL_PATTERNS.slice(AGENT_PATTERN_END),
    ];
  } else {
    patterns = TOOL_PATTERNS.slice(0, BASIC_PATTERN_COUNT);
  }

  if (patterns.length === 0) return '';

  const lines: string[] = [
    '## Tool Usage Patterns',
    '',
    'Follow these tool sequencing patterns for common workflows:',
    '',
  ];

  for (const pattern of patterns) {
    lines.push(`- **${pattern.name}** — ${pattern.trigger}`);
    lines.push(`  ${pattern.steps.join('; ')}`);
  }

  return lines.join('\n').trimEnd();
}
