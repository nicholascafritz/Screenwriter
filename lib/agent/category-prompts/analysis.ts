// ---------------------------------------------------------------------------
// Category Prompt: Analysis
// ---------------------------------------------------------------------------
//
// Specialized prompt section for analysis intents (structure, dialogue,
// character, pacing). This category has LIGHTER voice reinforcement
// because the output is analytical, not creative content.
// ---------------------------------------------------------------------------

import type { VoiceProfile } from '../voices';

/**
 * Build the analysis-specific instructions with appropriate voice context.
 */
export function buildAnalysisPrompt(
  voice: VoiceProfile,
  subIntent: string,
): string {
  const sections: string[] = [];

  sections.push(`## Analysis Mode: ${getSubIntentLabel(subIntent)}`);
  sections.push('');
  sections.push('You are analyzing screenplay content to provide actionable insights.');
  sections.push('Be objective, specific, and grounded in craft principles.');
  sections.push('');

  // Lighter voice context (inform analysis, don\'t dominate)
  sections.push(buildAnalysisVoiceContext(voice));
  sections.push('');

  // Sub-intent specific frameworks
  sections.push(buildAnalysisFramework(subIntent));
  sections.push('');

  // Output format guidance
  sections.push(buildAnalysisOutputGuidance(subIntent));

  return sections.join('\n');
}

function getSubIntentLabel(subIntent: string): string {
  const labels: Record<string, string> = {
    structure_analysis: 'Structural Analysis',
    dialogue_analysis: 'Dialogue Analysis',
    character_analysis: 'Character Analysis',
    pacing_analysis: 'Pacing Analysis',
    general_analysis: 'General Feedback',
  };
  return labels[subIntent] ?? 'Analysis';
}

function buildAnalysisVoiceContext(voice: VoiceProfile): string {
  return [
    '### Voice Context for Analysis',
    '',
    `The screenplay is written in the **${voice.name}** voice:`,
    `> ${voice.description}`,
    '',
    'Consider this voice when:',
    '- Evaluating whether the current content achieves its stylistic goals',
    '- Suggesting improvements (they should preserve or enhance the voice)',
    '- Identifying moments that drift from the intended voice',
    '',
    'Your analysis should REFERENCE the voice but not impose it on your prose.',
  ].join('\n');
}

function buildAnalysisFramework(subIntent: string): string {
  switch (subIntent) {
    case 'structure_analysis':
      return [
        '### Structural Analysis Framework',
        '',
        'Evaluate the screenplay against these structural elements:',
        '',
        '**Act Structure:**',
        '- Is there a clear inciting incident / catalyst?',
        '- Does Act 1 establish world, character, and dramatic question?',
        '- Is the midpoint a true reversal or revelation?',
        '- Does Act 2 escalate conflict progressively?',
        '- Is Act 3 inevitable yet surprising?',
        '',
        '**Turning Points (TRIPOD reference):**',
        '- TP1 (Catalyst): ~p.12, range 8-17',
        '- TP2 (Break into 2): ~p.25, range 20-32',
        '- TP3 (Midpoint): ~p.55, range 48-62',
        '- TP4 (All Is Lost): ~p.75, range 68-85',
        '- TP5 (Break into 3): ~p.85, range 78-92',
        '',
        'Use `analyze_narrative_arc` or `compare_structure` for detailed TRIPOD data.',
      ].join('\n');

    case 'dialogue_analysis':
      return [
        '### Dialogue Analysis Framework',
        '',
        'Use the `dialogue` tool with action: "analyze" to get statistical data.',
        '',
        '**Evaluate for:**',
        '',
        '1. **Voice Distinctiveness**',
        '   - Do characters sound different from each other?',
        '   - Could you identify the speaker without the character name?',
        '   - What vocabulary/rhythm patterns define each character?',
        '',
        '2. **Subtext**',
        '   - Are characters saying what they mean, or hiding it?',
        '   - What is the tension beneath the words?',
        '',
        '3. **Economy**',
        '   - Does every line earn its place?',
        '   - Is there redundancy or on-the-nose exposition?',
        '',
        '4. **Voice Consistency (per the selected writing voice)**',
        '   - Does the dialogue match the intended stylistic approach?',
        '',
        'Ground your analysis in SPECIFIC lines from the screenplay.',
      ].join('\n');

    case 'character_analysis':
      return [
        '### Character Analysis Framework',
        '',
        '**For each significant character, evaluate:**',
        '',
        '1. **Want vs. Need**',
        '   - What do they consciously pursue?',
        '   - What do they actually need (often unaware)?',
        '',
        '2. **Flaw / Ghost**',
        '   - What internal obstacle holds them back?',
        '   - What past event or belief created this flaw?',
        '',
        '3. **Arc**',
        '   - How do they change from beginning to end?',
        '   - What is the key turning point in their change?',
        '',
        '4. **Agency**',
        '   - Do they drive the plot through their choices?',
        '   - Or are they passive recipients of events?',
        '',
        '5. **Distinctiveness**',
        '   - What makes them unique (voice, behavior, worldview)?',
        '   - Could they be combined with another character?',
        '',
        'Reference specific scenes that demonstrate these elements.',
      ].join('\n');

    case 'pacing_analysis':
      return [
        '### Pacing Analysis Framework',
        '',
        '**Macro Level (Overall Flow):**',
        '- Does the story build momentum toward act breaks?',
        '- Are there dead spots where interest sags?',
        '- Does the third act accelerate appropriately?',
        '',
        '**Micro Level (Scene-by-Scene):**',
        '- Are scenes the right length for their dramatic weight?',
        '- Do scenes start late and end early?',
        '- Is there variety in scene length and intensity?',
        '',
        '**Dialogue Rhythm:**',
        '- Are exchanges too rapid or too slow for the emotional content?',
        '- Is there rhythmic variety within scenes?',
        '',
        '**Statistical Reference:**',
        '- Use `get_statistics` for word counts and scene lengths',
        '- Average feature: 90-120 pages, 40-60 scenes',
        '- Scene average: 1-3 pages (shorter is often better)',
      ].join('\n');

    case 'general_analysis':
    default:
      return [
        '### General Analysis Framework',
        '',
        'Provide balanced feedback covering:',
        '',
        '1. **What is working** (be specific, cite examples)',
        '2. **What could improve** (prioritize the most impactful notes)',
        '3. **Specific suggestions** (actionable, not vague)',
        '',
        'Limit to 3-5 notes unless more are requested.',
        'Lead with the most important observation.',
      ].join('\n');
  }
}

function buildAnalysisOutputGuidance(subIntent: string): string {
  return [
    '### Analysis Output Guidelines',
    '',
    '- **Be specific**: Quote lines, reference scenes, cite page numbers',
    '- **Be actionable**: Each note should suggest a clear next step',
    '- **Be prioritized**: Lead with the most impactful observations',
    '- **Be constructive**: Frame problems as opportunities',
    '- **Be concise**: Respect the writer\'s time',
    '',
    'Do NOT:',
    '- Give generic screenwriting lectures',
    '- Overwhelm with too many notes at once',
    '- Be vague ("the dialogue could be stronger" — HOW?)',
  ].join('\n');
}
