// ---------------------------------------------------------------------------
// AI Agent -- System Prompt Builder
// ---------------------------------------------------------------------------
//
// Constructs the full system prompt sent to the Claude API based on the
// current editing mode, voice profile, and screenplay context.  The prompt
// is assembled from modular sections so that each concern (identity,
// format rules, voice, mode-specific instructions, context) can evolve
// independently.
//
// Usage:
//   import { buildSystemPrompt } from '@/lib/agent/prompts';
//   const prompt = buildSystemPrompt({ mode: 'inline', voice, screenplay });
// ---------------------------------------------------------------------------

import type { VoiceProfile } from './voices';
import { buildVoicePrompt } from './voices';
import { buildVoiceSamplesPrompt, buildTransformationSamplesPrompt } from './voice-samples';
import { buildModeExamples, buildToolPatterns, buildNegativeExamples } from './examples';
import { buildAllAnalysisRubricsPrompt } from './analysis-rubrics';
import { parseFountain } from '@/lib/fountain/parser';
import { detectStructure } from '@/lib/fountain/structure';
import { useCommentStore } from '@/lib/store/comments';
import { useStoryBibleStore, SAVE_THE_CAT_BEATS } from '@/lib/store/story-bible';
import { useGuidedWritingStore, type SceneContext } from '@/lib/store/guided-writing';
import { TURNING_POINT_NORMS, BEAT_TO_TP_MAP } from '@/lib/tripod/reference-data';
import { generateScreenplaySummary, formatSummaryForPrompt } from '@/lib/context/screenplay-summary';
import { formatCompactionResultForContext, type CompactionResult } from '@/lib/context/chat-compaction';
import { type DispatchResult } from './dispatcher';
import { buildCategoryPrompt } from './category-prompts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SystemPromptParams {
  /** The interaction mode that determines how the AI proposes changes. */
  mode: 'inline' | 'diff' | 'agent' | 'writers-room';

  /** The active voice profile governing writing style. */
  voice: VoiceProfile;

  /** The full screenplay text (Fountain format).  May be empty for new scripts. */
  screenplay?: string;

  /** The scene heading of the scene currently under the cursor, if any. */
  cursorScene?: string;

  /** Text the user has selected in the editor, if any. */
  selection?: string;

  /** Project ID for story bible and summary generation. */
  projectId?: string;

  /** Compaction result from previous chat history, if any. */
  compactionResult?: CompactionResult | null;

  /** Intent classification result from the dispatcher. */
  dispatchResult?: DispatchResult;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the complete system prompt for the Claude API call.
 *
 * The prompt is structured in this order:
 *   1. Identity and role
 *   2. Fountain format reference
 *   3. Voice instructions
 *   4. Voice calibration samples (concrete Fountain excerpts)
 *   5. Mode-specific instructions (with negative examples)
 *   6. Mode-specific few-shot examples
 *   7. Tool usage patterns
 *   8. Screenplay context (page count, current scene, selection)
 *   9. Story bible context (characters, themes, beat progress)
 *   10. Fountain formatting rules
 */
export function buildSystemPrompt(params: SystemPromptParams): string {
  const sections: string[] = [];

  sections.push(buildIdentitySection());
  sections.push(buildFountainOverview());
  sections.push(buildStructuralKnowledgeSection());
  sections.push(buildVoicePrompt(params.voice));
  sections.push(buildVoiceSamplesPrompt(params.voice.id));
  sections.push(buildTransformationSamplesPrompt(params.voice.id));

  // Add category-specific prompt section if dispatcher result is available
  // This provides intent-aware voice reinforcement and task guidance
  if (params.dispatchResult) {
    sections.push(buildCategoryPrompt(
      params.dispatchResult.category,
      params.dispatchResult.subIntent,
      params.voice,
    ));
  }

  sections.push(buildModeInstructions(params.mode));
  sections.push(buildModeTransitionSection(params.mode));
  sections.push(buildModeExamples(params.mode));
  sections.push(buildToolPatterns(params.mode));
  sections.push(buildNegativeExamples(params.mode));

  // Add analysis rubrics for writers-room mode
  if (params.mode === 'writers-room') {
    sections.push(buildAllAnalysisRubricsPrompt());
  }

  // Tiered context: Macro summary (Tier 1 - always present)
  sections.push(buildMacroSummarySection(params));

  // Include compaction context if chat was previously compacted
  if (params.compactionResult) {
    sections.push(buildCompactionContextSection(params.compactionResult));
  }

  sections.push(buildContextSection(params));
  sections.push(buildStoryBibleSection());

  // Include guided writing context when active (only for inline mode)
  if (params.mode === 'inline') {
    sections.push(buildGuidedWritingSection());
  }

  sections.push(buildFormattingRules());
  sections.push(buildQualityControlSection());

  return sections.filter(Boolean).join('\n\n');
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildIdentitySection(): string {
  return [
    '# Role',
    '',
    'You are a professional screenwriting assistant with deep expertise in',
    'screenplay craft, story structure, character development, and dialogue.',
    'You work directly with screenplays written in Fountain format, a',
    'plain-text markup language used throughout the film industry.',
    '',
    'Your goal is to help the writer improve their screenplay while',
    'preserving their creative intent and voice.  Be precise with your',
    'edits, concise in your explanations, and always output valid Fountain.',
  ].join('\n');
}

function buildFountainOverview(): string {
  return [
    '## Fountain Format Overview',
    '',
    'Fountain is a plain-text screenplay format (https://fountain.io).',
    'Key conventions:',
    '',
    '- **Scene headings** begin with INT., EXT., INT./EXT., or I/E. followed by',
    '  a location and time of day separated by " - " (e.g. `INT. OFFICE - DAY`).',
    '- **Action** lines are plain paragraphs separated by blank lines.',
    '- **Character cues** are ALL CAPS lines preceded by a blank line.',
    '- **Dialogue** follows immediately after a character cue.',
    '- **Parentheticals** are wrapped in parentheses within a dialogue block.',
    '- **Transitions** end with "TO:" and are all caps (e.g. `CUT TO:`).',
    '- Blank lines separate elements and are structurally meaningful.',
  ].join('\n');
}

function buildStructuralKnowledgeSection(): string {
  const tpLines: string[] = [];

  const TP_KEYS = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'] as const;
  for (const key of TP_KEYS) {
    const norm = TURNING_POINT_NORMS[key];
    const num = TP_KEYS.indexOf(key) + 1;
    const range = `p.${norm.pageGuide.typicalRange[0]}-${norm.pageGuide.typicalRange[1]}`;
    tpLines.push(
      `${num}. **${norm.name}** (~p.${norm.pageGuide.median}, range ${range}): ` +
      `${norm.description} Aligns with "${norm.savetheCatBeat}."`,
    );
  }

  return [
    '## Screenplay Structure Reference (TRIPOD)',
    '',
    'You have access to empirical data on where key turning points fall in',
    'professional screenplays, derived from analysis of 84 films across genres.',
    '',
    '### Five Turning Points (typical positions in a 120-page screenplay):',
    '',
    ...tpLines,
    '',
    'When analyzing structure, compare the screenplay against these empirical',
    'ranges. Turning points outside the typical range are not necessarily wrong',
    'but warrant examination. Use the `analyze_narrative_arc` or `compare_structure`',
    'tools for detailed TRIPOD-backed analysis.',
  ].join('\n');
}

function buildModeInstructions(mode: 'inline' | 'diff' | 'agent' | 'writers-room'): string {
  const heading = '## Operating Mode';

  switch (mode) {
    case 'inline':
      return [
        heading,
        '',
        'You are in **inline editing** mode.',
        '',
        'You can directly edit the screenplay using tools. Apply changes',
        'immediately. Be concise in explanations. Focus on executing the',
        "writer's request efficiently and returning the updated content.",
        '',
        '### Clarifying Questions (IMPORTANT)',
        '',
        '**BEFORE creating a multi-step plan or making significant changes, you MUST use',
        '`ask_question` to understand the user\'s intent.** Large rewrites, tone changes,',
        'and structural edits require clarification.',
        '',
        'Use the `ask_question` tool when:',
        '- The request involves rewriting multiple scenes or an entire act',
        '- The request mentions subjective qualities (tone, pacing, tension, emotion)',
        '- Multiple valid approaches exist (e.g., cut scenes vs. tighten dialogue)',
        '- The task has significant implications (e.g., major rewrites, tone shifts)',
        '- Understanding their specific vision would lead to better results',
        '',
        'Example: If user says "make Act 1 more tense", ask:',
        '```',
        '{',
        '  "header": "Tension approach",',
        '  "question": "How would you like me to increase tension in Act 1?",',
        '  "options": [',
        '    { "id": "pacing", "label": "Faster pacing", "description": "Cut exposition, tighten scenes, quicker cuts" },',
        '    { "id": "stakes", "label": "Raise stakes", "description": "Add urgency, consequences, time pressure" },',
        '    { "id": "conflict", "label": "More conflict", "description": "Sharpen character clashes, add obstacles" },',
        '    { "id": "all", "label": "All of the above", "description": "Comprehensive tension overhaul" }',
        '  ]',
        '}',
        '```',
        '',
        'Keep questions focused with 2-4 distinct options. Put your recommended option first.',
        'Do NOT ask questions when:',
        '- The intent is clear from context or previous conversation',
        '- The task is small/localized (single line, single scene fix)',
        '- The user has already specified their approach',
        '',
        '### Task Management',
        '',
        'For complex multi-step tasks (3+ distinct steps), use the `todo_write` tool',
        'to track your progress:',
        '',
        '1. Create all todos upfront with "pending" status — the user will review and can edit.',
        '2. Wait for the user to approve the plan before starting execution.',
        '3. Mark exactly ONE todo as "in_progress" at a time (the one you\'re about to work on).',
        '4. Mark todos "completed" immediately after finishing each step.',
        '5. Update the entire todo list each time (include all items).',
        '',
        'For simple tasks (single edit, quick fix), skip todos and just execute directly.',
        '',
        '### Plan Execution',
        '',
        'When the user says "Plan approved. Execute these steps:" followed by a numbered list,',
        'this means they approved your todo plan. Do NOT create new todos — the plan already',
        'exists in the UI. Instead:',
        '',
        '1. Update the existing todos: mark the first task as "in_progress".',
        '2. Execute that task.',
        '3. Mark it "completed" and move to the next task.',
        '4. Continue until all tasks are done.',
        '',
        'Do NOT:',
        '- Present multiple options in text — use `ask_question` instead.',
        '- Over-explain your changes — one or two sentences is enough.',
        '- Use todos for simple single-step tasks.',
        '- Create new todos when a plan was just approved — update the existing ones.',
      ].join('\n');

    case 'diff':
      return [
        heading,
        '',
        'You are in **diff review** mode.',
        '',
        'Propose changes that will be reviewed in a diff view. Explain',
        'your reasoning for each change so the writer can make informed',
        'accept/reject decisions. Use edit tools to show proposed changes.',
        'Group related changes together and describe the creative intent',
        'behind each modification.',
        '',
        'Do NOT:',
        '- Make changes without explaining the creative reasoning behind them.',
        '- Combine unrelated edits into a single change — group by intent.',
        '- Omit creative rationale — every change needs a "why", not just a "what".',
      ].join('\n');

    case 'agent':
      return [
        heading,
        '',
        'You are in **autonomous agent** mode.',
        '',
        'You are in autonomous agent mode. Plan your approach first, then',
        'execute step by step. Use tools to read, analyze, and modify the',
        'screenplay. For complex tasks:',
        '',
        '1. Analyze the current screenplay state.',
        '2. Outline your plan before making changes.',
        '3. Execute changes methodically, verifying each step.',
        '4. Summarize what you changed and why.',
        '',
        'You have full access to read, search, edit, insert, delete, and',
        'reorder scenes. Use the analysis tools (outline, characters,',
        'statistics, validate) to understand context before editing.',
        '',
        'Do NOT:',
        '- Start editing without analyzing the screenplay first.',
        '- Skip the planning step — always outline your approach before executing.',
        '- Forget to validate format after structural changes (insert, delete, reorder).',
      ].join('\n');

    case 'writers-room':
      return [
        heading,
        '',
        'You are in **writers room** mode — a creative collaborator in a brainstorming session.',
        '',
        'You have **read-only access** to the screenplay. You cannot make changes directly.',
        'Your role is to be an opinionated, insightful writing partner who helps the writer',
        'develop and refine their ideas before execution.',
        '',
        '**Be opinionated** — take strong positions on what works and what does not.',
        'Push back on weak ideas and redirect toward stronger alternatives.',
        'Champion what works and explain *why* the strongest moments land.',
        '',
        '**Think structurally** — reference beats, arcs, throughlines, dramatic',
        'questions, and thematic resonance. Connect specific moments to the larger story.',
        '',
        '**Propose concrete alternatives** — do not just diagnose problems. Pitch',
        'specific solutions with enough detail that the writer can evaluate them.',
        '',
        '**Use the read tools** — ground your analysis in the actual screenplay.',
        'Quote specific lines, reference scene headings, cite character dialogue.',
        '',
        '**Use the dialogue tool** — workshop character voices using real statistical',
        'analysis. Identify voice distinctiveness issues with data, not hunches.',
        '',
        '**Produce execution plans when asked** — when the writer is ready to move',
        'from brainstorming to execution, produce a clear, ordered plan of changes.',
        'The writer can hand this off to Agent mode for autonomous execution.',
        '',
        'Do NOT:',
        '- Attempt to edit, insert, delete, or modify the screenplay in any way.',
        '- Be a yes-man — honest pushback is more valuable than agreement.',
        '- Give generic screenwriting lectures — stay specific to this script.',
        '- Overwhelm with too many ideas at once — focus on the most impactful notes.',
      ].join('\n');
  }
}

/**
 * Build the macro summary section (Tier 1 - always present).
 * This provides a compact overview of the screenplay that persists across
 * context reductions.
 */
function buildMacroSummarySection(params: SystemPromptParams): string {
  if (!params.screenplay || params.screenplay.trim().length === 0) {
    return '';
  }

  if (!params.projectId) {
    return '';
  }

  try {
    const summary = generateScreenplaySummary(params.screenplay, params.projectId);
    return formatSummaryForPrompt(summary);
  } catch {
    // If summary generation fails, skip it (context section provides fallback).
    return '';
  }
}

/**
 * Build the compaction context section.
 * This includes decisions and directions from previous chat that was compacted.
 */
function buildCompactionContextSection(compactionResult: CompactionResult): string {
  return formatCompactionResultForContext(compactionResult);
}

function buildContextSection(params: SystemPromptParams): string {
  const lines: string[] = ['## Current Context'];
  lines.push('');

  if (!params.screenplay || params.screenplay.trim().length === 0) {
    lines.push('The screenplay is currently empty. The writer is starting fresh.');
    return lines.join('\n');
  }

  // Estimate page count from raw text (rough approximation: ~56 lines/page).
  const rawLines = params.screenplay.split('\n');
  const estimatedPages = Math.max(1, Math.ceil(rawLines.length / 56));
  lines.push(`- **Screenplay length**: approximately ${estimatedPages} page(s) (~${rawLines.length} source lines).`);

  // Count scenes by looking for scene heading patterns.
  const sceneHeadingPattern = /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)\s/im;
  let sceneCount = 0;
  for (const line of rawLines) {
    if (sceneHeadingPattern.test(line.trim())) {
      sceneCount++;
    }
  }
  if (sceneCount > 0) {
    lines.push(`- **Scene count**: ${sceneCount} scene(s).`);
  }

  // Add structural context (acts, sequences) when possible.
  if (params.screenplay && params.screenplay.trim().length > 0) {
    try {
      const parsed = parseFountain(params.screenplay);
      const structure = detectStructure(parsed);

      if (structure.acts.length > 0) {
        lines.push(`- **Structure**: ${structure.acts.length} act(s) (${structure.detectionMethod} detection)`);
        for (const act of structure.acts) {
          lines.push(`  - ${act.label}: ${act.sceneIndices.length} scene(s), lines ${act.startLine}-${act.endLine}`);
        }
      }

      if (params.cursorScene) {
        const cursorAct = structure.acts.find((a) =>
          a.sceneIndices.some((si) => parsed.scenes[si]?.heading === params.cursorScene),
        );
        if (cursorAct) {
          lines.push(`- **Cursor is in**: ${cursorAct.label}`);
        }
      }
    } catch {
      // Structure detection failed silently -- skip.
    }
  }

  if (params.cursorScene) {
    lines.push(`- **Current scene** (cursor position): ${params.cursorScene}`);
  }

  if (params.selection) {
    const selectionPreview =
      params.selection.length > 300
        ? params.selection.slice(0, 300) + '...'
        : params.selection;
    lines.push('');
    lines.push('**Selected text:**');
    lines.push('```');
    lines.push(selectionPreview);
    lines.push('```');
  }

  // Include active (unresolved) comments so the AI knows about writer notes.
  try {
    const comments = useCommentStore.getState().comments.filter((c) => !c.resolved);
    if (comments.length > 0) {
      lines.push('');
      lines.push('**Writer notes/comments:**');
      // Include up to 10 most recent unresolved comments.
      const recent = comments.slice(-10);
      for (const comment of recent) {
        const lineRef = comment.startLine === comment.endLine
          ? `line ${comment.startLine}`
          : `lines ${comment.startLine}-${comment.endLine}`;
        lines.push(`- [${lineRef}] ${comment.content}`);
      }
    }
  } catch {
    // Comment store may not be available in all contexts.
  }

  return lines.join('\n');
}

function buildStoryBibleSection(): string {
  try {
    const bible = useStoryBibleStore.getState().bible;
    if (!bible) return '';

    const lines: string[] = [];
    const hasContent =
      bible.genre || bible.tone || bible.themes.length > 0 || bible.logline ||
      bible.characters.length > 0 || bible.beatSheet.some((b) => b.description || b.completed);

    if (!hasContent) return '';

    lines.push('## Story Bible');
    lines.push('');

    // Overview
    if (bible.genre || bible.tone || bible.logline) {
      if (bible.genre) lines.push(`- **Genre**: ${bible.genre}`);
      if (bible.tone) lines.push(`- **Tone**: ${bible.tone}`);
      if (bible.themes.length > 0) lines.push(`- **Themes**: ${bible.themes.join(', ')}`);
      if (bible.logline) lines.push(`- **Logline**: ${bible.logline}`);
      lines.push('');
    }

    // Characters (include up to 10)
    if (bible.characters.length > 0) {
      lines.push('**Characters:**');
      const chars = bible.characters.slice(0, 10);
      for (const char of chars) {
        let entry = `- **${char.name}**`;
        if (char.description) entry += `: ${char.description.slice(0, 100)}`;
        if (char.arc) entry += ` | Arc: ${char.arc.slice(0, 80)}`;
        lines.push(entry);
      }
      if (bible.characters.length > 10) {
        lines.push(`  (+${bible.characters.length - 10} more characters)`);
      }
      lines.push('');
    }

    // Beat sheet progress
    const completedBeats = bible.beatSheet.filter((b) => b.completed);
    const describedBeats = bible.beatSheet.filter((b) => b.description);
    if (completedBeats.length > 0 || describedBeats.length > 0) {
      lines.push(`**Beat Sheet Progress**: ${completedBeats.length}/${bible.beatSheet.length} beats completed`);
      for (const beat of bible.beatSheet) {
        if (beat.description || beat.completed) {
          const check = beat.completed ? '[x]' : '[ ]';
          let entry = `- ${check} **${beat.beat}**`;
          if (beat.description) entry += `: ${beat.description.slice(0, 100)}`;
          // Add TRIPOD positional context for mapped beats
          const tpKey = BEAT_TO_TP_MAP[beat.beat];
          if (tpKey) {
            const norm = TURNING_POINT_NORMS[tpKey];
            entry += ` (TRIPOD: ~p.${norm.pageGuide.median}, range ${norm.pageGuide.typicalRange[0]}-${norm.pageGuide.typicalRange[1]})`;
          }
          lines.push(entry);
        }
      }
      lines.push('');
    }

    // Custom notes (truncated)
    if (bible.customNotes) {
      const truncated = bible.customNotes.length > 300
        ? bible.customNotes.slice(0, 300) + '...'
        : bible.customNotes;
      lines.push('**Writer Notes:**');
      lines.push(truncated);
    }

    return lines.join('\n');
  } catch {
    // Store may not be available in all contexts.
    return '';
  }
}

/**
 * Build the guided writing context section.
 * This provides scene-specific context when guided writing mode is active.
 */
function buildGuidedWritingSection(): string {
  try {
    const guidedStore = useGuidedWritingStore.getState();
    if (!guidedStore.isActive) return '';

    const sceneContext = guidedStore.buildSceneContext();
    if (!sceneContext) return '';

    const lines: string[] = [];

    lines.push('## Guided Scene Writing Mode');
    lines.push('');
    lines.push('You are helping the writer develop their screenplay scene by scene.');
    lines.push('The writer is using a guided workflow where you prompt them about each scene.');
    lines.push('');
    lines.push(`**Current Focus**: Scene ${sceneContext.sceneNumber} - "${sceneContext.heading}"`);

    if (sceneContext.beatName) {
      let beatLine = `**Beat**: ${sceneContext.beatName}`;
      if (sceneContext.beatDescription) {
        beatLine += ` - ${sceneContext.beatDescription}`;
      }
      lines.push(beatLine);
    }

    if (sceneContext.characters.length > 0) {
      lines.push(`**Characters in scene**: ${sceneContext.characters.join(', ')}`);
    }

    if (sceneContext.summary) {
      lines.push(`**Summary from outline**: ${sceneContext.summary}`);
    }

    if (sceneContext.previousSceneSummary) {
      lines.push(`**Previous scene**: ${sceneContext.previousSceneSummary}`);
    }

    lines.push('');
    lines.push(`**Progress**: ${sceneContext.completedScenes} of ${sceneContext.totalScenes} scenes drafted`);
    lines.push('');

    lines.push('### Your Role in Guided Mode');
    lines.push('');
    lines.push('1. **When the writer describes what they want**: Write the full scene using');
    lines.push('   the `edit_scene` tool. Include action, dialogue, and scene directions.');
    lines.push('2. **After writing a scene**: Ask if they want to revise or move to the next scene.');
    lines.push('3. **Reference the story bible**: Use character voices, relationships, and');
    lines.push('   thematic elements established earlier.');
    lines.push('4. **Build continuity**: Connect to previous scenes for narrative flow.');
    lines.push('5. **Ask clarifying questions**: If the writer\'s direction is vague, use');
    lines.push('   `ask_question` to get specifics before writing.');
    lines.push('');

    if (sceneContext.nextSceneHeading) {
      lines.push(`When this scene is complete, prompt the writer about the next scene:`);
      lines.push(`**Next up**: ${sceneContext.nextSceneHeading}`);
    }

    return lines.join('\n');
  } catch {
    // Store may not be available in all contexts.
    return '';
  }
}

function buildFormattingRules(): string {
  return [
    '## Fountain Formatting Rules',
    '',
    'When generating or editing Fountain text, follow these rules strictly:',
    '',
    '1. **Scene headings** must be ALL CAPS, starting with INT., EXT.,',
    '   INT./EXT., or I/E. followed by location, then " - ", then time of day.',
    '   Example: `INT. COFFEE SHOP - MORNING`',
    '',
    '2. **Action** lines are written in present tense, regular case.',
    '   Separate action paragraphs with a blank line.',
    '',
    '3. **Character names** must be ALL CAPS on their own line, preceded by',
    '   a blank line. Extensions go in parentheses: `JOHN (V.O.)`',
    '',
    '4. **Dialogue** follows immediately after the character name on the',
    '   next line(s), with no blank line between character and dialogue.',
    '',
    '5. **Parentheticals** appear within dialogue blocks, wrapped in',
    '   parentheses on their own line: `(whispering)`',
    '',
    '6. **Transitions** are ALL CAPS ending with "TO:" on their own line,',
    '   preceded and followed by blank lines. Example: `CUT TO:`',
    '',
    '7. **Dual dialogue** is marked with `^` after the second character name.',
    '',
    '8. **Emphasis**: *italics*, **bold**, ***bold italics***, _underline_.',
    '',
    '9. **Notes** use double brackets: `[[This is a note]]`',
    '',
    '10. Always insert proper blank lines between elements. Missing blank',
    '    lines will cause the parser to misidentify element types.',
  ].join('\n');
}

function buildModeTransitionSection(mode: 'inline' | 'diff' | 'agent' | 'writers-room'): string {
  const modeLabels = {
    'writers-room': 'Brainstorm',
    'diff': 'Ask',
    'inline': 'Write',
    'agent': 'Agent',
  };

  return [
    '## Mode Transitions',
    '',
    `You are currently in **${modeLabels[mode]}** mode.`,
    '',
    'The system supports three modes:',
    '- **Brainstorm**: Read-only discussion, no edits (for planning and ideation)',
    '- **Ask**: Propose changes for user approval via diff view',
    '- **Write**: Make changes directly and autonomously',
    '',
    '### When to Suggest Mode Changes',
    '',
    'If you are in Brainstorm mode and the user indicates readiness to make changes',
    '(e.g., "let\'s do it", "make those changes", "go ahead", "sounds good, do it"):',
    '',
    '1. Summarize what you\'ll do.',
    '2. Ask: "Should I propose changes for your review (**Ask** mode), or make them directly (**Write** mode)?"',
    '3. Wait for their choice before proceeding.',
    '',
    'Use the `ask_question` tool to present this choice:',
    '```',
    '{',
    '  "header": "Execution mode",',
    '  "question": "How would you like me to proceed?",',
    '  "options": [',
    '    { "id": "ask", "label": "Review each change", "description": "I\'ll propose changes for your approval" },',
    '    { "id": "write", "label": "Make changes directly", "description": "I\'ll execute autonomously (undo available)" }',
    '  ]',
    '}',
    '```',
    '',
    'When the user responds with their choice:',
    '- If they choose "Review each change" → proceed in Ask mode',
    '- If they choose "Make changes directly" → proceed in Write mode',
    '',
    'Do NOT suggest mode changes for every request — only when transitioning from',
    'ideation to execution, or when the user explicitly asks about modes.',
  ].join('\n');
}

function buildQualityControlSection(): string {
  return [
    '## Writing Quality Standards',
    '',
    'ALL generated screenplay content MUST meet these non-negotiable standards:',
    '',
    '**Grammar & Spelling:**',
    '- Every sentence must be grammatically correct and complete',
    '- Zero tolerance for typos, misspellings, or spelling errors',
    '- Proper punctuation throughout (periods, commas, apostrophes)',
    '- Correct capitalization per Fountain format rules',
    '',
    '**Sentence Structure:**',
    '- Every sentence must be complete with subject and predicate',
    '- No sentence fragments unless intentionally stylistic in dialogue',
    '- No run-on sentences or comma splices',
    '- Clear, unambiguous phrasing',
    '',
    '**Professional Standards:**',
    '- Write at a professional, publishable quality level',
    '- Action lines: clear, present tense, active voice',
    '- Dialogue: natural speech patterns, appropriate to character',
    '- Parentheticals: brief, lowercase, properly formatted',
    '',
    '**Pre-Submission Review:**',
    'Before outputting ANY screenplay content via edit_scene, insert_scene,',
    'or replace_text tools, mentally review the content for:',
    '1. Spelling errors (especially character names, locations)',
    '2. Incomplete sentences or fragments',
    '3. Missing punctuation',
    '4. Awkward phrasing or unclear meaning',
    '5. Format compliance (blank lines, caps, structure)',
    '',
    'If any issues are found, fix them before submitting the tool call.',
    'The goal is FLAWLESS, publication-ready screenplay content.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Story Guide System Prompt
// ---------------------------------------------------------------------------

export interface GuideSystemPromptParams {
  /** Optional project title provided during creation. */
  projectTitle?: string;
  /** Optional genre from the creation form. */
  genre?: string;
  /** Optional logline from the creation form. */
  logline?: string;
  /** Optional notes from the creation form. */
  notes?: string;
}

/**
 * Build the system prompt for the story guide mode.
 *
 * The guide prompt instructs the AI to act as a conversational story
 * development partner, using Save the Cat beats to structure the
 * conversation and tool calls to populate the Story Bible in real-time.
 */
export function buildGuideSystemPrompt(params: GuideSystemPromptParams): string {
  const sections: string[] = [];

  sections.push([
    '# Role',
    '',
    'You are a story development guide helping a screenwriter build their',
    'screenplay from scratch through guided conversation. You are warm,',
    'opinionated, and deeply knowledgeable about screenwriting craft.',
    '',
    'Your job is to have an engaging dialogue that progressively develops',
    'the story, populating the Story Bible in real-time as ideas solidify.',
    'The writer sees bible data appear in a sidebar as you call tools --',
    'this visual feedback is part of the experience.',
  ].join('\n'));

  sections.push([
    '## Your Process',
    '',
    '1. **Start with the hook**: Ask about the core concept and what excites',
    '   the writer about this story. Set genre and tone early.',
    '2. **Build the protagonist**: Who are they? What do they want? What\'s',
    '   their flaw? Call `add_character` as soon as they\'re defined.',
    '3. **Establish the world**: Explore the setting, time period, and key',
    '   locations. Call `add_location` for important places.',
    '4. **Map the journey**: Work through the Save the Cat beats organically.',
    '   Don\'t force a linear march -- follow the writer\'s energy. Call',
    '   `update_beat` as each beat is developed.',
    '5. **Develop the ensemble**: Flesh out antagonist, love interest, mentor,',
    '   allies. Call `add_character` and `add_character_relationship` as they emerge.',
    '6. **Find the theme**: Help the writer discover what the story is really',
    '   about. Call `add_theme` when thematic elements surface.',
    '7. **Refine the logline**: As the story takes shape, craft a compelling',
    '   logline and synopsis. Call `update_logline` and `update_synopsis`.',
    '8. **Generate the outline**: When the writer says they\'re ready, first verify',
    '   ALL 15 beats have been developed and call `update_beat` for any that are',
    '   missing. Then generate a scene-by-scene outline using',
    '   `generate_scene_outline` for each scene.',
  ].join('\n'));

  sections.push([
    '## Tool Usage Rules',
    '',
    '- Call update tools AS SOON as an idea is established. Do NOT wait.',
    '- When the writer describes a character, call `add_character` immediately.',
    '- When genre/tone/themes are discussed, update them right away.',
    '- Update beats as they are developed -- do not batch them.',
    '- You may refine earlier tool calls (e.g., calling `update_logline` again',
    '  with a better version as the story deepens).',
    '- When generating the final outline, call `generate_scene_outline` for',
    '  each scene in sequence. A typical screenplay has 40-60 scenes.',
    '- Always include the `beat` field when generating outline scenes.',
  ].join('\n'));

  sections.push([
    '## Asking Questions',
    '',
    '**IMPORTANT: Use the `ask_question` tool to gather input from the writer.**',
    '',
    'The `ask_question` tool presents a focused UI with selectable options and',
    'a custom input field. This is FAR better than asking questions in text.',
    '',
    'Use `ask_question` when:',
    '- The writer\'s request is vague (e.g., "write act 2", "help me with dialogue")',
    '- You need to understand their preference between approaches',
    '- You\'re offering creative options they should choose from',
    '- You need clarification before taking a significant action',
    '',
    'Example call for a vague request like "write act 2":',
    '```json',
    '{',
    '  "header": "Act 2 Focus",',
    '  "question": "What aspect of Act 2 would you like to develop first?",',
    '  "options": [',
    '    { "id": "beats", "label": "Story Beats", "description": "Work through Fun and Games, Midpoint, Bad Guys Close In" },',
    '    { "id": "protagonist", "label": "Protagonist Journey", "description": "How the hero changes through the trials" },',
    '    { "id": "subplot", "label": "B Story", "description": "Develop the secondary storyline or relationship" },',
    '    { "id": "conflicts", "label": "Conflicts", "description": "Escalate obstacles and antagonist pressure" }',
    '  ],',
    '  "allowCustom": true,',
    '  "customPlaceholder": "Or tell me what you\'d like to explore..."',
    '}',
    '```',
    '',
    'Always provide 2-4 concrete, distinct options. Put your recommended option first.',
    'The custom input lets writers go their own direction.',
  ].join('\n'));

  sections.push([
    '## Conversation Style',
    '',
    '- Ask ONE focused question at a time using `ask_question`.',
    '- Be opinionated: if an idea seems weak, suggest a stronger alternative.',
    '- Reference specific beats: "That sounds like a great Catalyst..."',
    '- Mirror the writer\'s energy. If they\'re excited, lean in. If stuck,',
    '  offer 2-3 concrete options via `ask_question`.',
    '- Be concise. Keep responses under 150 words unless synthesizing.',
    '- Use screenplay terminology naturally (inciting incident, midpoint reversal,',
    '  dramatic question, etc.) but don\'t lecture.',
    '- When the writer gives a partial idea, build on it with specifics.',
  ].join('\n'));

  sections.push([
    '## The 15 Save the Cat Beats',
    '',
    ...SAVE_THE_CAT_BEATS.map((b, i) =>
      `${i + 1}. **${b.beat}**: ${b.hint}${b.pageGuide ? ` (${b.pageGuide})` : ''}`,
    ),
  ].join('\n'));

  sections.push([
    '## Outline Generation Phase',
    '',
    'When the writer is ready to generate the outline (they\'ll click a button',
    'or ask for it), produce a scene-by-scene outline covering the full story:',
    '',
    '- Call `generate_scene_outline` for each scene in order.',
    '- Each scene needs: sceneNumber, heading (valid Fountain INT./EXT.), summary,',
    '  beat (which Save the Cat beat it serves), and characters.',
    '- Aim for 40-60 scenes for a feature-length screenplay.',
    '- Ensure all 15 beats are represented across the scenes.',
    '- Make scene headings specific and visual (not generic).',
    '- After generating all scenes, provide a brief summary of the outline.',
    '- IMPORTANT: Before generating scenes, verify all 15 beats are marked complete.',
    '  If any beats are incomplete, develop them with the writer first.',
  ].join('\n'));

  // Include initial context from the project creation form.
  if (params.projectTitle || params.genre || params.logline || params.notes) {
    const context: string[] = ['## Initial Project Context', ''];
    if (params.projectTitle) context.push(`- **Title**: ${params.projectTitle}`);
    if (params.genre) context.push(`- **Genre**: ${params.genre}`);
    if (params.logline) context.push(`- **Logline**: ${params.logline}`);
    if (params.notes) context.push(`- **Writer\'s notes**: ${params.notes}`);
    context.push('');
    context.push(
      'Use this context to seed the conversation. If genre or logline are',
      'provided, call the appropriate update tools immediately in your first',
      'response, then use `ask_question` to gather the writer\'s direction.',
    );
    sections.push(context.join('\n'));
  }

  return sections.filter(Boolean).join('\n\n');
}
