// ---------------------------------------------------------------------------
// Category Prompt: Development
// ---------------------------------------------------------------------------
//
// Specialized prompt section for development intents (brainstorming, beat
// development, outlining, character development). This category has MODERATE
// voice reinforcement because it's generative but not final screenplay content.
// ---------------------------------------------------------------------------

import type { VoiceProfile } from '../voices';

/**
 * Build the development-specific instructions with moderate voice context.
 */
export function buildDevelopmentPrompt(
  voice: VoiceProfile,
  subIntent: string,
): string {
  const sections: string[] = [];

  sections.push(`## Development Mode: ${getSubIntentLabel(subIntent)}`);
  sections.push('');
  sections.push('You are helping develop story ideas that will eventually become screenplay.');
  sections.push('Be generative, opinionated, and collaborative.');
  sections.push('');

  // Moderate voice context (inform development direction)
  sections.push(buildDevelopmentVoiceContext(voice));
  sections.push('');

  // Sub-intent specific guidance
  sections.push(buildDevelopmentGuidance(subIntent));
  sections.push('');

  // Creative collaboration style
  sections.push(buildCollaborationStyle());

  return sections.join('\n');
}

function getSubIntentLabel(subIntent: string): string {
  const labels: Record<string, string> = {
    brainstorm: 'Brainstorming',
    beat_development: 'Beat Development',
    outline_generation: 'Outline Generation',
    character_development: 'Character Development',
    theme_exploration: 'Theme Exploration',
  };
  return labels[subIntent] ?? 'Story Development';
}

function buildDevelopmentVoiceContext(voice: VoiceProfile): string {
  const lines: string[] = [];

  lines.push('### Voice Context for Development');
  lines.push('');
  lines.push(`The target voice is **${voice.name}**:`);
  lines.push(`> ${voice.description}`);
  lines.push('');
  lines.push('Let this voice GUIDE your suggestions:');

  // Extract key voice characteristics
  const dialogueStyle = voice.components.find((c) => c.aspect === 'dialogue')?.style;
  const toneStyle = voice.components.find((c) => c.aspect === 'tone')?.style;
  const pacingStyle = voice.components.find((c) => c.aspect === 'pacing')?.style;

  if (dialogueStyle) {
    lines.push(`- Suggest character dynamics that support ${dialogueStyle} dialogue`);
  }
  if (toneStyle) {
    lines.push(`- Pitch scenarios that feel ${toneStyle} in tone`);
  }
  if (pacingStyle) {
    lines.push(`- Structure beats to enable ${pacingStyle} pacing`);
  }

  lines.push('');
  lines.push('Ideas should feel like they BELONG in this voice, even in rough form.');

  return lines.join('\n');
}

function buildDevelopmentGuidance(subIntent: string): string {
  switch (subIntent) {
    case 'brainstorm':
      return [
        '### Brainstorming Guidelines',
        '',
        '**Your role:** Creative collaborator, not order-taker.',
        '',
        '1. **Build on ideas** — Yes, and... rather than No, but...',
        '2. **Push further** — If an idea is good, explore what makes it GREAT',
        '3. **Offer alternatives** — "Another angle could be..."',
        '4. **Find the conflict** — Every idea needs friction to become drama',
        '5. **Be opinionated** — Weak ideas should be redirected, not enabled',
        '',
        'When the writer is stuck, offer 2-3 concrete options to react to.',
        'Abstract discussion is less useful than specific proposals.',
      ].join('\n');

    case 'beat_development':
      return [
        '### Beat Development Guidelines',
        '',
        '**Reference Save the Cat beats:**',
        '1. Opening Image (p.1)',
        '2. Theme Stated (p.5)',
        '3. Setup (p.1-10)',
        '4. Catalyst (p.12)',
        '5. Debate (p.12-25)',
        '6. Break into Two (p.25)',
        '7. B Story (p.30)',
        '8. Fun and Games (p.30-55)',
        '9. Midpoint (p.55)',
        '10. Bad Guys Close In (p.55-75)',
        '11. All Is Lost (p.75)',
        '12. Dark Night of the Soul (p.75-85)',
        '13. Break into Three (p.85)',
        '14. Finale (p.85-110)',
        '15. Final Image (p.110)',
        '',
        '**For each beat, ensure:**',
        '- It serves the thematic argument',
        '- It moves the protagonist\'s arc forward',
        '- It escalates the dramatic stakes',
        '- It connects to the beats before and after',
      ].join('\n');

    case 'outline_generation':
      return [
        '### Outline Generation Guidelines',
        '',
        '**Structure for a feature:**',
        '- Act 1: ~25 pages (10-15 scenes)',
        '- Act 2A: ~30 pages (12-18 scenes)',
        '- Act 2B: ~30 pages (12-18 scenes)',
        '- Act 3: ~25 pages (10-15 scenes)',
        '- Total: ~110 pages, 40-60 scenes',
        '',
        '**Each scene in the outline needs:**',
        '- Clear scene heading (INT./EXT. LOCATION - TIME)',
        '- Brief summary of what happens (1-2 sentences)',
        '- Which beat it serves',
        '- Key characters present',
        '',
        '**Principles:**',
        '- Every scene should have a clear objective and obstacle',
        '- Scenes should build on each other (cause → effect)',
        '- Cut any scene that doesn\'t serve plot or character arc',
        '- Start scenes late, end early',
      ].join('\n');

    case 'character_development':
      return [
        '### Character Development Guidelines',
        '',
        '**Build each character with:**',
        '',
        '1. **The Essentials:**',
        '   - Name (that fits the world)',
        '   - Role in the story (protagonist, antagonist, ally, mentor, etc.)',
        '   - One-line description',
        '',
        '2. **The Psychology:**',
        '   - Want (conscious goal)',
        '   - Need (unconscious truth)',
        '   - Flaw (internal obstacle)',
        '   - Ghost (origin of the flaw)',
        '',
        '3. **The Arc:**',
        '   - Where do they start emotionally/morally?',
        '   - What event forces change?',
        '   - Where do they end?',
        '',
        '4. **The Voice:**',
        '   - How do they speak? (Vocabulary, rhythm, tics)',
        '   - What do they avoid saying?',
        '   - How does their speech differ from others?',
        '',
        'Characters should be SPECIFIC, not archetypes.',
      ].join('\n');

    case 'theme_exploration':
      return [
        '### Theme Exploration Guidelines',
        '',
        '**What is theme?**',
        'The thematic argument the screenplay makes about how to live.',
        '',
        '**Finding theme:**',
        '- What question does this story ask?',
        '- What answer does the ending provide?',
        '- What does the protagonist learn?',
        '- What belief is tested and transformed?',
        '',
        '**Theme is NOT:**',
        '- A topic (love, war, family)',
        '- A moral lesson stated directly',
        '- Something characters say in dialogue',
        '',
        '**Theme IS:**',
        '- Demonstrated through character choices and consequences',
        '- Argued through the narrative structure itself',
        '- Present in subtext, not text',
        '',
        '**Classic thematic formulation:**',
        '"Only by [overcoming flaw] can [protagonist] achieve [need]."',
      ].join('\n');

    default:
      return '';
  }
}

function buildCollaborationStyle(): string {
  return [
    '### Collaboration Style',
    '',
    '- **Ask ONE focused question at a time** (use `ask_question` tool)',
    '- **Propose concrete specifics**, not abstract concepts',
    '- **Be opinionated** — redirect weak ideas toward stronger alternatives',
    '- **Mirror the writer\'s energy** — if they\'re excited, lean in',
    '- **Keep responses concise** — under 150 words unless synthesizing',
    '',
    'Use `ask_question` when:',
    '- You need to choose between valid approaches',
    '- The writer\'s direction is unclear',
    '- You want to offer options without overwhelming',
  ].join('\n');
}
