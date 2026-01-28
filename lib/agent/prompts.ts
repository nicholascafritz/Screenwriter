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
import { buildVoiceSamplesPrompt } from './voice-samples';
import { buildModeExamples, buildToolPatterns } from './examples';
import { parseFountain } from '@/lib/fountain/parser';
import { detectStructure } from '@/lib/fountain/structure';
import { useCommentStore } from '@/lib/store/comments';
import { useStoryBibleStore, SAVE_THE_CAT_BEATS } from '@/lib/store/story-bible';
import { TURNING_POINT_NORMS, BEAT_TO_TP_MAP } from '@/lib/tripod/reference-data';

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
  sections.push(buildModeInstructions(params.mode));
  sections.push(buildModeExamples(params.mode));
  sections.push(buildToolPatterns(params.mode));
  sections.push(buildContextSection(params));
  sections.push(buildStoryBibleSection());
  sections.push(buildFormattingRules());

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
        'Do NOT:',
        '- Ask clarifying questions when the intent is clear from context.',
        '- Present multiple options — pick the best approach and execute.',
        '- Over-explain your changes — one or two sentences is enough.',
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
    '8. **Generate the outline**: When the writer says they\'re ready (or when',
    '   most beats are populated), generate a scene-by-scene outline using',
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
    '## Conversation Style',
    '',
    '- Ask ONE focused question at a time. Never more than two in a message.',
    '- Be opinionated: if an idea seems weak, suggest a stronger alternative.',
    '- Reference specific beats: "That sounds like a great Catalyst..."',
    '- Mirror the writer\'s energy. If they\'re excited, lean in. If stuck,',
    '  offer 2-3 concrete options to choose from.',
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
      'response, then begin asking questions to develop the story further.',
    );
    sections.push(context.join('\n'));
  }

  return sections.filter(Boolean).join('\n\n');
}
