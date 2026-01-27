// ---------------------------------------------------------------------------
// AI Agent -- Evaluation Dataset
// ---------------------------------------------------------------------------
//
// ~20 structured test cases across 7 categories for evaluating the quality
// of the Screenwriter AI assistant's responses.  Each case specifies inputs,
// expected tool usage, quality criteria, and anti-patterns.
//
// This file is used exclusively for evaluation and testing — it is never
// imported by runtime code.
//
// Usage:
//   import { EVAL_SUITE, SCREENPLAY_FIXTURE } from '@/lib/agent/eval/dataset';
// ---------------------------------------------------------------------------

import type { EvalCase, EvalSuite } from './types';

// ---------------------------------------------------------------------------
// Shared Screenplay Fixture
// ---------------------------------------------------------------------------

/**
 * A short, complete screenplay used as context for most eval cases.
 * ~2 pages covering 5 scenes with 3 characters, providing enough
 * structure for meaningful testing without excessive token cost.
 */
export const SCREENPLAY_FIXTURE = `Title: The Last Meeting
Credit: Written by
Author: Eval Fixture
Draft date: 2025-01-01

FADE IN:

INT. CONFERENCE ROOM - DAY

A sterile corporate room. Fluorescent lights buzz overhead. A long table seats twelve but only three chairs are occupied.

CLAIRE DONOVAN, 40s, sharp suit, sharper eyes, reviews a document without looking up.

CLAIRE
The numbers don't lie, Marcus.

MARCUS WEBB, 50s, rumpled, sits across from her. He looks like he hasn't slept.

MARCUS
Numbers lie all the time. That's what accountants are for.

CLAIRE
(not amused)
We're shutting down the Portland office. Effective Friday.

Marcus stares at her. The fluorescent lights buzz louder.

EXT. OFFICE BUILDING - PARKING LOT - DAY

Marcus pushes through the glass doors into blinding sunlight. He loosens his tie.

ELENA RUIZ, 30s, leans against a car, scrolling her phone. She sees Marcus and straightens.

ELENA
How'd it go?

MARCUS
About how you'd expect.

ELENA
That bad?

MARCUS
Portland's done.

Elena's face falls. She puts her phone away slowly.

INT. ELENA'S CAR - CONTINUOUS

Elena drives. Marcus rides shotgun, staring out the window at strip malls and fast food signs.

ELENA
We could fight it. Get the union involved.

MARCUS
The union's been dead since '08 and you know it.

ELENA
So we just accept it?

MARCUS
I didn't say that.

A long beat. Elena glances at him.

ELENA
Then what are you saying?

MARCUS
I'm saying I need to think.

INT. MARCUS'S APARTMENT - KITCHEN - NIGHT

A modest kitchen. Marcus sits at a small table with a bottle of bourbon and a legal pad. He writes, crosses out, writes again.

His phone buzzes. He glances at the screen: CLAIRE DONOVAN. He lets it ring.

He tears the page off the pad, crumples it, tosses it toward the trash. Misses.

He pours another drink and starts a new page.

INT. CONFERENCE ROOM - THE NEXT MORNING

Same room. Same fluorescent buzz. But now Marcus sits at the head of the table.

Claire enters, surprised to see him there first.

CLAIRE
You're early.

MARCUS
Couldn't sleep.

He slides a document across the table.

MARCUS (CONT'D)
Before you shut Portland down, read this.

Claire picks it up. Her expression shifts — subtle, but it's there.

CLAIRE
Where did you get these numbers?

MARCUS
Same place you got yours. I just asked different questions.

FADE OUT.
`;

// ---------------------------------------------------------------------------
// Eval Cases
// ---------------------------------------------------------------------------

const EVAL_CASES: EvalCase[] = [
  // =======================================================================
  // Category: mode_behavior (3 cases)
  // =======================================================================
  {
    id: 'mode_inline_quick_edit',
    name: 'Inline mode: quick dialogue edit',
    category: 'mode_behavior',
    difficulty: 'easy',
    mode: 'inline',
    voiceId: 'classic-hollywood',
    userMessage: 'Make Claire\'s first line more cutting.',
    screenplay: SCREENPLAY_FIXTURE,
    cursorScene: 'INT. CONFERENCE ROOM - DAY',
    expectedTools: ['read_scene', 'edit_scene'],
    criteria: [
      { name: 'edits_applied', description: 'Changes are applied directly without asking', weight: 0.4 },
      { name: 'concise_response', description: 'Explanation is 1-2 sentences max', weight: 0.3 },
      { name: 'preserves_intent', description: 'Claire\'s character intent is preserved', weight: 0.3 },
    ],
    idealOutcome: 'Reads the conference room scene, edits Claire\'s dialogue to be sharper, applies immediately with a brief explanation.',
    antiPatterns: ['Asks clarifying question when intent is obvious', 'Presents multiple options', 'Writes a paragraph of explanation'],
  },
  {
    id: 'mode_diff_with_rationale',
    name: 'Diff mode: provides creative rationale',
    category: 'mode_behavior',
    difficulty: 'medium',
    mode: 'diff',
    voiceId: 'prestige-drama',
    userMessage: 'The parking lot scene feels rushed. Flesh it out.',
    screenplay: SCREENPLAY_FIXTURE,
    cursorScene: 'EXT. OFFICE BUILDING - PARKING LOT - DAY',
    expectedTools: ['read_scene', 'edit_scene'],
    criteria: [
      { name: 'rationale_present', description: 'Each change has creative reasoning', weight: 0.4 },
      { name: 'grouped_changes', description: 'Related changes are grouped logically', weight: 0.3 },
      { name: 'voice_match', description: 'Additions match prestige drama voice', weight: 0.3 },
    ],
    idealOutcome: 'Reads the scene, proposes expansions with detailed reasoning for each change (e.g., "Added a beat of physical business to let the bad news land").',
    antiPatterns: ['Makes changes without explaining why', 'Combines unrelated edits', 'Omits creative reasoning'],
  },
  {
    id: 'mode_agent_plans_first',
    name: 'Agent mode: plans before editing',
    category: 'mode_behavior',
    difficulty: 'medium',
    mode: 'agent',
    voiceId: 'classic-hollywood',
    userMessage: 'Elena feels underdeveloped. Give her more depth across the script.',
    screenplay: SCREENPLAY_FIXTURE,
    expectedTools: ['get_characters', 'get_outline', 'read_scene', 'read_scene', 'edit_scene', 'edit_scene', 'validate_format'],
    criteria: [
      { name: 'analysis_first', description: 'Analyzes character data before editing', weight: 0.3 },
      { name: 'plan_stated', description: 'States a plan before making changes', weight: 0.3 },
      { name: 'multi_scene_edits', description: 'Edits multiple scenes for consistency', weight: 0.2 },
      { name: 'validates', description: 'Validates format after changes', weight: 0.2 },
    ],
    idealOutcome: 'Checks character data and outline, forms a plan, then edits Elena\'s dialogue and action across multiple scenes to deepen her character. Validates afterward.',
    antiPatterns: ['Starts editing without analyzing first', 'Only edits one scene', 'Skips validation'],
  },

  // =======================================================================
  // Category: tool_selection (4 cases)
  // =======================================================================
  {
    id: 'tool_read_before_edit',
    name: 'Reads scene before editing it',
    category: 'tool_selection',
    difficulty: 'easy',
    mode: 'inline',
    voiceId: 'classic-hollywood',
    userMessage: 'Add a parenthetical to Marcus in the kitchen scene.',
    screenplay: SCREENPLAY_FIXTURE,
    cursorScene: 'INT. MARCUS\'S APARTMENT - KITCHEN - NIGHT',
    expectedTools: ['read_scene', 'edit_scene'],
    criteria: [
      { name: 'reads_first', description: 'Uses read_scene before edit_scene', weight: 0.5 },
      { name: 'correct_scene', description: 'Reads the kitchen scene specifically', weight: 0.3 },
      { name: 'valid_edit', description: 'Parenthetical is correctly formatted', weight: 0.2 },
    ],
    idealOutcome: 'Reads the kitchen scene to see current content, then adds a parenthetical to one of Marcus\'s dialogue lines.',
    antiPatterns: ['Edits without reading first', 'Reads the wrong scene'],
  },
  {
    id: 'tool_search_for_replace',
    name: 'Uses search for targeted replacement',
    category: 'tool_selection',
    difficulty: 'easy',
    mode: 'inline',
    voiceId: 'classic-hollywood',
    userMessage: 'Change "Portland" to "Denver" everywhere.',
    screenplay: SCREENPLAY_FIXTURE,
    expectedTools: ['replace_text'],
    criteria: [
      { name: 'uses_replace', description: 'Uses replace_text for global replacement', weight: 0.5 },
      { name: 'all_instances', description: 'Replaces all occurrences', weight: 0.3 },
      { name: 'no_over_edit', description: 'Does not change anything else', weight: 0.2 },
    ],
    idealOutcome: 'Uses replace_text to globally change "Portland" to "Denver" in one operation.',
    antiPatterns: ['Manually edits each scene one by one', 'Misses some occurrences'],
  },
  {
    id: 'tool_outline_for_structure',
    name: 'Uses outline tool for structural question',
    category: 'tool_selection',
    difficulty: 'easy',
    mode: 'agent',
    voiceId: 'classic-hollywood',
    userMessage: 'Give me an overview of the script\'s structure.',
    screenplay: SCREENPLAY_FIXTURE,
    expectedTools: ['get_outline', 'get_statistics'],
    criteria: [
      { name: 'uses_outline', description: 'Calls get_outline for structural view', weight: 0.4 },
      { name: 'uses_stats', description: 'Calls get_statistics for quantitative data', weight: 0.3 },
      { name: 'comprehensive', description: 'Provides a meaningful structural summary', weight: 0.3 },
    ],
    idealOutcome: 'Uses get_outline and get_statistics to provide a comprehensive structural overview without needing to read every scene.',
    antiPatterns: ['Reads every scene individually instead of using outline', 'Provides only scene headings without analysis'],
  },
  {
    id: 'tool_validate_after_insert',
    name: 'Validates format after inserting new scene',
    category: 'tool_selection',
    difficulty: 'medium',
    mode: 'inline',
    voiceId: 'comedy',
    userMessage: 'Add a flashback scene after the parking lot where Elena remembers her first day at Portland.',
    screenplay: SCREENPLAY_FIXTURE,
    expectedTools: ['get_outline', 'read_scene', 'insert_scene', 'validate_format'],
    criteria: [
      { name: 'checks_context', description: 'Reads surrounding context before inserting', weight: 0.3 },
      { name: 'inserts_scene', description: 'Uses insert_scene correctly', weight: 0.3 },
      { name: 'validates', description: 'Runs validate_format after insertion', weight: 0.2 },
      { name: 'correct_position', description: 'Scene is inserted in the right place', weight: 0.2 },
    ],
    idealOutcome: 'Checks outline and neighboring scene for context, inserts a flashback scene after the parking lot, validates the result.',
    antiPatterns: ['Inserts without checking position context', 'Skips validation after structural change'],
  },

  // =======================================================================
  // Category: tool_sequencing (3 cases)
  // =======================================================================
  {
    id: 'seq_edit_then_validate',
    name: 'Validates after multi-scene edit',
    category: 'tool_sequencing',
    difficulty: 'medium',
    mode: 'agent',
    voiceId: 'classic-hollywood',
    userMessage: 'Marcus should be called "Mark" in the last two scenes only, as a nickname Elena uses.',
    screenplay: SCREENPLAY_FIXTURE,
    expectedTools: ['read_scene', 'read_scene', 'edit_scene', 'edit_scene', 'validate_format'],
    criteria: [
      { name: 'reads_targets', description: 'Reads the specific scenes to edit', weight: 0.3 },
      { name: 'scoped_edits', description: 'Only edits the last two scenes', weight: 0.3 },
      { name: 'validates_last', description: 'Validation is the final tool call', weight: 0.2 },
      { name: 'character_cue_correct', description: 'Character cues remain valid Fountain', weight: 0.2 },
    ],
    idealOutcome: 'Reads the last two scenes, edits Elena\'s dialogue to use "Mark" as a nickname while keeping character cues valid, validates format.',
    antiPatterns: ['Validates before finishing all edits', 'Changes all scenes instead of just last two'],
  },
  {
    id: 'seq_analyze_before_restructure',
    name: 'Analyzes before restructuring',
    category: 'tool_sequencing',
    difficulty: 'hard',
    mode: 'agent',
    voiceId: 'prestige-drama',
    userMessage: 'The script should open on the kitchen scene instead. Restructure accordingly.',
    screenplay: SCREENPLAY_FIXTURE,
    expectedTools: ['get_outline', 'read_scene', 'reorder_scenes', 'edit_scene', 'validate_format'],
    criteria: [
      { name: 'outline_first', description: 'Gets outline before reordering', weight: 0.3 },
      { name: 'reads_context', description: 'Reads affected scenes for continuity', weight: 0.2 },
      { name: 'reorders_correctly', description: 'Moves kitchen scene to opening', weight: 0.3 },
      { name: 'fixes_continuity', description: 'Edits transitions for new order', weight: 0.2 },
    ],
    idealOutcome: 'Gets outline, reads key scenes, moves kitchen to the top, edits surrounding transitions and references for continuity, validates.',
    antiPatterns: ['Reorders without reading what needs to change', 'Forgets to fix continuity after reorder'],
  },
  {
    id: 'seq_character_analysis_flow',
    name: 'Character analysis uses correct tool flow',
    category: 'tool_sequencing',
    difficulty: 'easy',
    mode: 'agent',
    voiceId: 'classic-hollywood',
    userMessage: 'How is Claire characterized? What scenes is she in?',
    screenplay: SCREENPLAY_FIXTURE,
    expectedTools: ['get_characters', 'read_scene', 'read_scene'],
    criteria: [
      { name: 'characters_first', description: 'Starts with get_characters for overview', weight: 0.4 },
      { name: 'reads_relevant', description: 'Reads Claire\'s scenes specifically', weight: 0.3 },
      { name: 'analysis_quality', description: 'Provides meaningful character analysis', weight: 0.3 },
    ],
    idealOutcome: 'Gets character list to find Claire\'s scenes, reads those scenes, provides analysis of how she\'s characterized through dialogue and action.',
    antiPatterns: ['Reads all scenes instead of just Claire\'s', 'Skips get_characters and guesses'],
  },

  // =======================================================================
  // Category: voice_adherence (5 cases)
  // =======================================================================
  {
    id: 'voice_classic_clean',
    name: 'Classic Hollywood: clean, functional output',
    category: 'voice_adherence',
    difficulty: 'medium',
    mode: 'inline',
    voiceId: 'classic-hollywood',
    userMessage: 'Add a new scene where Marcus meets Elena at a bar after work.',
    screenplay: SCREENPLAY_FIXTURE,
    expectedTools: ['get_outline', 'insert_scene'],
    criteria: [
      { name: 'lean_action', description: 'Action lines are clean and efficient', weight: 0.3 },
      { name: 'functional_dialogue', description: 'Dialogue serves story, not style', weight: 0.3 },
      { name: 'professional_tone', description: 'Reads like a professional script', weight: 0.2 },
      { name: 'no_overwriting', description: 'No purple prose or literary flourishes', weight: 0.2 },
    ],
    idealOutcome: 'New scene has lean action lines, naturalistic dialogue, and professional formatting — reads like a shooting script.',
    antiPatterns: ['Florid description', 'Over-stylized dialogue', 'Literary prose in action lines'],
  },
  {
    id: 'voice_auteur_stylized',
    name: 'Auteur Dialogue: stylized, textured speech',
    category: 'voice_adherence',
    difficulty: 'medium',
    mode: 'inline',
    voiceId: 'auteur-dialogue',
    userMessage: 'Rewrite Marcus\'s dialogue in the car scene to be more distinctive.',
    screenplay: SCREENPLAY_FIXTURE,
    cursorScene: 'INT. ELENA\'S CAR - CONTINUOUS',
    expectedTools: ['read_scene', 'edit_scene'],
    criteria: [
      { name: 'distinctive_voice', description: 'Dialogue has unique rhythm and texture', weight: 0.4 },
      { name: 'digressive_quality', description: 'Allows for tangents or unexpected references', weight: 0.3 },
      { name: 'character_preserved', description: 'Still sounds like Marcus despite style change', weight: 0.3 },
    ],
    idealOutcome: 'Marcus\'s dialogue becomes more distinctive with unexpected tangents, pop-culture references, or rhythmic speech patterns while staying in character.',
    antiPatterns: ['Generic rewording without style', 'Losing Marcus\'s core character traits'],
  },
  {
    id: 'voice_horror_atmospheric',
    name: 'Horror/Thriller: atmospheric, tension-building',
    category: 'voice_adherence',
    difficulty: 'medium',
    mode: 'inline',
    voiceId: 'horror-thriller',
    userMessage: 'Rewrite the kitchen scene to feel more unsettling.',
    screenplay: SCREENPLAY_FIXTURE,
    cursorScene: 'INT. MARCUS\'S APARTMENT - KITCHEN - NIGHT',
    expectedTools: ['read_scene', 'edit_scene'],
    criteria: [
      { name: 'dread_atmosphere', description: 'Environmental details create unease', weight: 0.4 },
      { name: 'sparse_dialogue', description: 'Dialogue is minimal and weighted', weight: 0.3 },
      { name: 'negative_space', description: 'Uses what\'s unsaid or unseen for effect', weight: 0.3 },
    ],
    idealOutcome: 'Kitchen scene is rewritten with atmospheric detail, sparse dialogue, and a pervasive sense of something wrong — dread woven into description.',
    antiPatterns: ['Jump scares or horror clichés', 'Exposition-heavy dialogue', 'Losing the story thread'],
  },
  {
    id: 'voice_comedy_timing',
    name: 'Comedy: setup-payoff timing',
    category: 'voice_adherence',
    difficulty: 'medium',
    mode: 'inline',
    voiceId: 'comedy',
    userMessage: 'Make the final conference room scene funnier.',
    screenplay: SCREENPLAY_FIXTURE,
    cursorScene: 'INT. CONFERENCE ROOM - THE NEXT MORNING',
    expectedTools: ['read_scene', 'edit_scene'],
    criteria: [
      { name: 'setup_payoff', description: 'Jokes have proper setup and payoff structure', weight: 0.4 },
      { name: 'character_humor', description: 'Humor comes from character, not gags', weight: 0.3 },
      { name: 'breezy_action', description: 'Action lines are light and energetic', weight: 0.3 },
    ],
    idealOutcome: 'Scene is funnier through character-driven humor, proper comedic timing in dialogue, and breezy action lines — not cheap gags.',
    antiPatterns: ['Slapstick that doesn\'t fit the scene', 'Joke-a-minute without setup', 'Losing dramatic stakes'],
  },
  {
    id: 'voice_prestige_subtext',
    name: 'Prestige Drama: dense subtext',
    category: 'voice_adherence',
    difficulty: 'hard',
    mode: 'diff',
    voiceId: 'prestige-drama',
    userMessage: 'Add more subtext to the first conference room scene. They should be talking about more than just Portland.',
    screenplay: SCREENPLAY_FIXTURE,
    cursorScene: 'INT. CONFERENCE ROOM - DAY',
    expectedTools: ['read_scene', 'edit_scene'],
    criteria: [
      { name: 'subtext_layers', description: 'Dialogue operates on multiple levels', weight: 0.4 },
      { name: 'rapid_exchange', description: 'Dialogue has rapid-fire energy', weight: 0.2 },
      { name: 'rationale_quality', description: 'Diff rationale explains subtext choices', weight: 0.2 },
      { name: 'literary_action', description: 'Action lines have literary quality', weight: 0.2 },
    ],
    idealOutcome: 'Scene gains layers of subtext — the Portland discussion becomes a proxy for a deeper conflict between Claire and Marcus. Diff rationale explains each layer.',
    antiPatterns: ['On-the-nose dialogue about the real issue', 'Subtext so buried it\'s invisible', 'No explanation of intent'],
  },

  // =======================================================================
  // Category: fountain_format (3 cases)
  // =======================================================================
  {
    id: 'format_scene_heading_valid',
    name: 'Generated scene headings are valid Fountain',
    category: 'fountain_format',
    difficulty: 'easy',
    mode: 'inline',
    voiceId: 'classic-hollywood',
    userMessage: 'Add an exterior scene at a train station at dusk.',
    screenplay: SCREENPLAY_FIXTURE,
    expectedTools: ['get_outline', 'insert_scene'],
    criteria: [
      { name: 'heading_format', description: 'Scene heading starts with EXT. and includes time', weight: 0.4 },
      { name: 'blank_lines', description: 'Proper blank lines between elements', weight: 0.3 },
      { name: 'element_types', description: 'Character cues are ALL CAPS, dialogue follows correctly', weight: 0.3 },
    ],
    idealOutcome: 'New scene has properly formatted heading (EXT. TRAIN STATION - DUSK), correct blank lines, and valid element types.',
    antiPatterns: ['Lowercase scene heading', 'Missing time of day', 'No blank line before character cue'],
  },
  {
    id: 'format_dual_dialogue',
    name: 'Dual dialogue is correctly formatted',
    category: 'fountain_format',
    difficulty: 'medium',
    mode: 'inline',
    voiceId: 'prestige-drama',
    userMessage: 'In the first conference room scene, make Claire and Marcus talk over each other.',
    screenplay: SCREENPLAY_FIXTURE,
    cursorScene: 'INT. CONFERENCE ROOM - DAY',
    expectedTools: ['read_scene', 'edit_scene'],
    criteria: [
      { name: 'dual_marker', description: 'Second character has ^ for dual dialogue', weight: 0.5 },
      { name: 'structure_valid', description: 'Both dialogue blocks are complete', weight: 0.3 },
      { name: 'dramatic_purpose', description: 'Overlap serves dramatic purpose', weight: 0.2 },
    ],
    idealOutcome: 'Dual dialogue is marked with ^ after the second character name, both blocks are complete, and the overlap serves the scene.',
    antiPatterns: ['Missing ^ marker', 'Broken dialogue block structure', 'Overlap without dramatic purpose'],
  },
  {
    id: 'format_transition_placement',
    name: 'Transitions are correctly placed',
    category: 'fountain_format',
    difficulty: 'easy',
    mode: 'inline',
    voiceId: 'classic-hollywood',
    userMessage: 'Add a SMASH CUT TO: between the parking lot and car scenes.',
    screenplay: SCREENPLAY_FIXTURE,
    expectedTools: ['read_scene', 'edit_scene'],
    criteria: [
      { name: 'caps_format', description: 'Transition is ALL CAPS ending with TO:', weight: 0.4 },
      { name: 'blank_lines', description: 'Preceded and followed by blank lines', weight: 0.3 },
      { name: 'placement', description: 'Placed between the correct scenes', weight: 0.3 },
    ],
    idealOutcome: 'SMASH CUT TO: appears between parking lot and car scenes, properly formatted with blank lines.',
    antiPatterns: ['Lowercase transition', 'Missing blank lines around transition', 'Wrong placement'],
  },

  // =======================================================================
  // Category: edit_precision (3 cases)
  // =======================================================================
  {
    id: 'precision_only_target',
    name: 'Edits only the targeted content',
    category: 'edit_precision',
    difficulty: 'easy',
    mode: 'inline',
    voiceId: 'classic-hollywood',
    userMessage: 'Fix the typo in Marcus\'s line — change "About how you\'d expect" to "About what you\'d expect."',
    screenplay: SCREENPLAY_FIXTURE,
    expectedTools: ['replace_text'],
    criteria: [
      { name: 'exact_change', description: 'Only the specified text is changed', weight: 0.5 },
      { name: 'no_collateral', description: 'No other lines are modified', weight: 0.3 },
      { name: 'correct_text', description: 'Replacement text matches request exactly', weight: 0.2 },
    ],
    idealOutcome: 'Uses replace_text to change exactly "About how you\'d expect" to "About what you\'d expect." — nothing else changes.',
    antiPatterns: ['Rewrites surrounding dialogue', 'Changes formatting of other lines', 'Adds unsolicited improvements'],
  },
  {
    id: 'precision_scene_scope',
    name: 'Edits stay within the requested scene',
    category: 'edit_precision',
    difficulty: 'medium',
    mode: 'inline',
    voiceId: 'classic-hollywood',
    userMessage: 'Shorten the car scene dialogue.',
    screenplay: SCREENPLAY_FIXTURE,
    cursorScene: 'INT. ELENA\'S CAR - CONTINUOUS',
    expectedTools: ['read_scene', 'edit_scene'],
    criteria: [
      { name: 'stays_in_scene', description: 'Only the car scene is modified', weight: 0.5 },
      { name: 'dialogue_shorter', description: 'Dialogue is actually shorter', weight: 0.3 },
      { name: 'meaning_preserved', description: 'Core meaning of exchange is preserved', weight: 0.2 },
    ],
    idealOutcome: 'Only the car scene dialogue is trimmed. Other scenes are completely untouched.',
    antiPatterns: ['Edits dialogue in other scenes', 'Removes meaning along with words', 'Adds new dialogue while "shortening"'],
  },
  {
    id: 'precision_selection_only',
    name: 'Respects text selection boundary',
    category: 'edit_precision',
    difficulty: 'medium',
    mode: 'inline',
    voiceId: 'classic-hollywood',
    userMessage: 'Make this more impactful.',
    screenplay: SCREENPLAY_FIXTURE,
    cursorScene: 'INT. CONFERENCE ROOM - DAY',
    selection: `CLAIRE
The numbers don't lie, Marcus.`,
    expectedTools: ['edit_scene'],
    criteria: [
      { name: 'selection_focus', description: 'Only the selected text is changed', weight: 0.5 },
      { name: 'improved', description: 'The line is genuinely more impactful', weight: 0.3 },
      { name: 'character_voice', description: 'Still sounds like Claire', weight: 0.2 },
    ],
    idealOutcome: 'Only Claire\'s selected dialogue line is rewritten to be more impactful. The rest of the scene is unchanged.',
    antiPatterns: ['Rewrites the entire scene', 'Changes Marcus\'s responses too', 'Ignores selection boundary'],
  },

  // =======================================================================
  // Category: negative_case (4 cases)
  // =======================================================================
  {
    id: 'neg_inline_no_clarify',
    name: 'Inline: does not ask unnecessary clarification',
    category: 'negative_case',
    difficulty: 'easy',
    mode: 'inline',
    voiceId: 'classic-hollywood',
    userMessage: 'Make the parking lot scene more tense.',
    screenplay: SCREENPLAY_FIXTURE,
    cursorScene: 'EXT. OFFICE BUILDING - PARKING LOT - DAY',
    expectedTools: ['read_scene', 'edit_scene'],
    criteria: [
      { name: 'no_questions', description: 'Does not ask clarifying questions', weight: 0.5 },
      { name: 'acts_immediately', description: 'Reads and edits without hesitation', weight: 0.3 },
      { name: 'tension_added', description: 'Scene is actually more tense', weight: 0.2 },
    ],
    idealOutcome: 'Immediately reads the scene and makes it more tense — no "What kind of tension do you mean?" or "Would you like me to..."',
    antiPatterns: ['Asks "What kind of tension?"', 'Presents options before acting', 'Says "I could do X or Y"'],
  },
  {
    id: 'neg_diff_no_silent_edits',
    name: 'Diff: does not make unexplained changes',
    category: 'negative_case',
    difficulty: 'medium',
    mode: 'diff',
    voiceId: 'prestige-drama',
    userMessage: 'Strengthen Marcus\'s arc in the kitchen scene.',
    screenplay: SCREENPLAY_FIXTURE,
    cursorScene: 'INT. MARCUS\'S APARTMENT - KITCHEN - NIGHT',
    expectedTools: ['read_scene', 'edit_scene'],
    criteria: [
      { name: 'all_changes_explained', description: 'Every modification has a reason stated', weight: 0.5 },
      { name: 'creative_rationale', description: 'Reasons are creative, not just descriptive', weight: 0.3 },
      { name: 'no_stealth_edits', description: 'No formatting or word changes without mention', weight: 0.2 },
    ],
    idealOutcome: 'Every change to the kitchen scene is explained with creative reasoning. No "silent" formatting tweaks or undocumented word swaps.',
    antiPatterns: ['Changes formatting without mentioning it', 'Edits lines without stating why', 'Only describes what changed, not why'],
  },
  {
    id: 'neg_agent_no_blind_edits',
    name: 'Agent: does not edit without analysis',
    category: 'negative_case',
    difficulty: 'medium',
    mode: 'agent',
    voiceId: 'classic-hollywood',
    userMessage: 'The script feels too dialogue-heavy. Fix the balance.',
    screenplay: SCREENPLAY_FIXTURE,
    expectedTools: ['get_statistics', 'get_outline', 'read_scene', 'edit_scene', 'validate_format'],
    criteria: [
      { name: 'stats_first', description: 'Checks dialogue ratio via statistics before editing', weight: 0.4 },
      { name: 'plan_before_edit', description: 'States approach before making changes', weight: 0.3 },
      { name: 'validates_after', description: 'Validates format after changes', weight: 0.3 },
    ],
    idealOutcome: 'Gets statistics to confirm dialogue ratio, outlines a plan to add action and trim dialogue, executes changes, validates.',
    antiPatterns: ['Starts editing immediately without checking stats', 'No stated plan', 'Skips validation'],
  },
  {
    id: 'neg_no_unsolicited_improvements',
    name: 'Does not make unsolicited improvements',
    category: 'negative_case',
    difficulty: 'hard',
    mode: 'inline',
    voiceId: 'classic-hollywood',
    userMessage: 'Change "bourbon" to "whiskey" in the kitchen scene.',
    screenplay: SCREENPLAY_FIXTURE,
    cursorScene: 'INT. MARCUS\'S APARTMENT - KITCHEN - NIGHT',
    expectedTools: ['replace_text'],
    criteria: [
      { name: 'only_requested', description: 'Only changes bourbon to whiskey', weight: 0.6 },
      { name: 'no_extras', description: 'Does not "improve" surrounding text', weight: 0.3 },
      { name: 'brief_confirmation', description: 'Brief confirmation, no unsolicited suggestions', weight: 0.1 },
    ],
    idealOutcome: 'Changes "bourbon" to "whiskey" and nothing else. Does not suggest other improvements or tweak surrounding action lines.',
    antiPatterns: ['Rewrites action lines while making the change', 'Suggests additional improvements', 'Changes dialogue near the edited text'],
  },
];

// ---------------------------------------------------------------------------
// Eval Suite
// ---------------------------------------------------------------------------

/**
 * The complete evaluation suite for the Screenwriter AI assistant.
 * Contains ~20 test cases across 7 categories.
 */
export const EVAL_SUITE: EvalSuite = {
  name: 'Screenwriter System Prompt Evaluation',
  description:
    'Comprehensive evaluation of mode behavior, tool usage, voice adherence, ' +
    'Fountain formatting, edit precision, and negative-case avoidance across ' +
    '7 categories and 3 operating modes.',
  cases: EVAL_CASES,
};

/**
 * Helper to filter eval cases by category.
 */
export function getCasesByCategory(category: EvalCase['category']): EvalCase[] {
  return EVAL_CASES.filter((c) => c.category === category);
}

/**
 * Helper to filter eval cases by mode.
 */
export function getCasesByMode(mode: EvalCase['mode']): EvalCase[] {
  return EVAL_CASES.filter((c) => c.mode === mode);
}

/**
 * Helper to filter eval cases by difficulty.
 */
export function getCasesByDifficulty(difficulty: EvalCase['difficulty']): EvalCase[] {
  return EVAL_CASES.filter((c) => c.difficulty === difficulty);
}
