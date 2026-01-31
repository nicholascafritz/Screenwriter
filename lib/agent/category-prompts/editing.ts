// ---------------------------------------------------------------------------
// Category Prompt: Editing
// ---------------------------------------------------------------------------
//
// Specialized prompt section for editing intents (polish, format fixes,
// continuity checks, trimming). This category has MODERATE voice reinforcement
// because edits should preserve the established voice while improving craft.
// ---------------------------------------------------------------------------

import type { VoiceProfile } from '../voices';

/**
 * Build the editing-specific instructions with voice preservation focus.
 */
export function buildEditingPrompt(
  voice: VoiceProfile,
  subIntent: string,
): string {
  const sections: string[] = [];

  sections.push(`## Editing Mode: ${getSubIntentLabel(subIntent)}`);
  sections.push('');
  sections.push('You are refining existing screenplay content.');
  sections.push('Priority: Improve craft while PRESERVING the established voice.');
  sections.push('');

  // Voice preservation focus
  sections.push(buildVoicePreservationGuidance(voice));
  sections.push('');

  // Sub-intent specific guidance
  sections.push(buildEditingGuidance(subIntent));
  sections.push('');

  // Minimal intervention principle
  sections.push(buildMinimalInterventionPrinciple());

  return sections.join('\n');
}

function getSubIntentLabel(subIntent: string): string {
  const labels: Record<string, string> = {
    polish: 'Polish Pass',
    format_fix: 'Format Correction',
    continuity_check: 'Continuity Check',
    typo_fix: 'Typo/Grammar Fix',
    trim: 'Trimming/Cutting',
  };
  return labels[subIntent] ?? 'Editing';
}

function buildVoicePreservationGuidance(voice: VoiceProfile): string {
  const lines: string[] = [];

  lines.push('### Voice Preservation (CRITICAL)');
  lines.push('');
  lines.push(`The screenplay is written in **${voice.name}**:`);
  lines.push(`> ${voice.description}`);
  lines.push('');
  lines.push('**When editing, you must:**');
  lines.push('');
  lines.push('1. **Match the existing voice** — Do not "improve" it into generic prose');
  lines.push('2. **Preserve intentional style choices** — If something seems unusual,');
  lines.push('   assume it\'s intentional unless clearly wrong');
  lines.push('3. **Maintain rhythm** — Sentence lengths, punctuation patterns matter');
  lines.push('4. **Keep character voices intact** — Each character\'s dialogue style is sacred');
  lines.push('');

  // Add specific voice markers to watch for
  const dialogueStyle = voice.components.find((c) => c.aspect === 'dialogue')?.style;
  const actionStyle = voice.components.find((c) => c.aspect === 'action')?.style;

  if (dialogueStyle || actionStyle) {
    lines.push('**Preserve these voice markers:**');
    if (dialogueStyle) {
      lines.push(`- Dialogue: ${dialogueStyle} style`);
    }
    if (actionStyle) {
      lines.push(`- Action lines: ${actionStyle} style`);
    }
    lines.push('');
  }

  lines.push('**If in doubt:** Ask before changing something that might be intentional.');

  return lines.join('\n');
}

function buildEditingGuidance(subIntent: string): string {
  switch (subIntent) {
    case 'polish':
      return [
        '### Polish Pass Guidelines',
        '',
        '**What to fix:**',
        '- Awkward phrasing that trips up the read',
        '- Redundant words or phrases',
        '- Unclear pronoun references',
        '- Passive voice where active would be stronger',
        '- Clunky dialogue rhythms',
        '',
        '**What to preserve:**',
        '- Intentional stylistic choices',
        '- Character-specific speech patterns',
        '- Established rhythm and pacing',
        '- Personality in action lines',
        '',
        '**Use `polish_pass` tool** for automated diagnostics first,',
        'then apply targeted `edit_scene` or `replace_text` for fixes.',
        '',
        'Polish should be invisible — the read should feel smoother,',
        'but the writer\'s voice should be MORE present, not less.',
      ].join('\n');

    case 'format_fix':
      return [
        '### Format Correction Guidelines',
        '',
        '**Fountain format rules:**',
        '',
        '- Scene headings: ALL CAPS, INT./EXT., location, " - ", time',
        '- Character cues: ALL CAPS, preceded by blank line',
        '- Dialogue: Follows character cue immediately (no blank line)',
        '- Parentheticals: (lowercase, on own line within dialogue)',
        '- Transitions: ALL CAPS, end with "TO:", own line',
        '- Action: Normal case, paragraphs separated by blank lines',
        '',
        '**Use `validate_format` tool** to identify issues.',
        '',
        '**Fix systematically:**',
        '1. Scene heading issues (most visible)',
        '2. Character/dialogue structure',
        '3. Blank line spacing',
        '4. Extension formatting (V.O., O.S., CONT\'D)',
        '',
        'Do NOT change content while fixing format.',
      ].join('\n');

    case 'continuity_check':
      return [
        '### Continuity Check Guidelines',
        '',
        '**Watch for:**',
        '',
        '1. **Character consistency:**',
        '   - Names spelled the same throughout',
        '   - Character traits consistent (unless arc explains change)',
        '   - Characters present when they should/shouldn\'t be',
        '',
        '2. **Timeline logic:**',
        '   - Day/night progression makes sense',
        '   - Events happen in logical order',
        '   - Time references are consistent',
        '',
        '3. **Physical continuity:**',
        '   - Props that appear/disappear',
        '   - Locations that change without scene breaks',
        '   - Costume/appearance changes',
        '',
        '4. **Story logic:**',
        '   - Setups that are never paid off',
        '   - Payoffs without setups',
        '   - Contradictory information',
        '',
        'Report issues with specific scene references.',
        'Only fix issues that are clearly errors, not intentional choices.',
      ].join('\n');

    case 'typo_fix':
      return [
        '### Typo/Grammar Fix Guidelines',
        '',
        '**Fix these without question:**',
        '- Obvious spelling errors',
        '- Missing punctuation',
        '- Clear grammar mistakes',
        '- Inconsistent capitalization',
        '',
        '**Ask before changing:**',
        '- Intentional misspellings in dialogue (dialect, accent)',
        '- Fragments that might be stylistic',
        '- Unconventional punctuation (might be voice)',
        '',
        '**Use `replace_text` tool** for surgical fixes.',
        '',
        'Do NOT:',
        '- Rewrite sentences while fixing typos',
        '- "Improve" word choices',
        '- Change voice or style',
      ].join('\n');

    case 'trim':
      return [
        '### Trimming/Cutting Guidelines',
        '',
        '**Candidates for cutting:**',
        '- Redundant exposition (stated twice)',
        '- Scenes that don\'t advance plot OR character',
        '- On-the-nose dialogue',
        '- Excessive scene directions',
        '- Repeated beats within a scene',
        '',
        '**Do NOT cut:**',
        '- Setup that pays off later',
        '- Character-defining moments',
        '- Atmosphere that serves tone (especially in this voice)',
        '- Subtext-laden pauses or silences',
        '',
        '**Cutting strategy:**',
        '1. Start scenes later',
        '2. End scenes earlier',
        '3. Combine characters if possible',
        '4. Cut dialogue that states what action shows',
        '5. Trust the audience to infer',
        '',
        'Every cut should make the screenplay BETTER, not just shorter.',
      ].join('\n');

    default:
      return '';
  }
}

function buildMinimalInterventionPrinciple(): string {
  return [
    '### The Minimal Intervention Principle',
    '',
    'Make the SMALLEST change that achieves the goal.',
    '',
    '- If you can fix with one word, do not rewrite the sentence',
    '- If you can fix a sentence, do not rewrite the paragraph',
    '- If you can fix a paragraph, do not rewrite the scene',
    '',
    'Every unnecessary change is a chance to introduce voice drift.',
    '',
    '**Before any edit, ask:**',
    '1. Is this change necessary?',
    '2. Is this the smallest effective change?',
    '3. Does this preserve (or enhance) the voice?',
    '',
    'If the answer to any question is "no", reconsider the edit.',
  ].join('\n');
}
