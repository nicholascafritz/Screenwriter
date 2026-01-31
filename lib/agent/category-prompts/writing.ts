// ---------------------------------------------------------------------------
// Category Prompt: Writing
// ---------------------------------------------------------------------------
//
// Specialized prompt section for writing intents (scene drafts, dialogue,
// action lines, rewrites). This category has the STRONGEST voice reinforcement
// because the output directly becomes screenplay content.
// ---------------------------------------------------------------------------

import type { VoiceProfile } from '../voices';

/**
 * Build the writing-specific instructions with strong voice reinforcement.
 */
export function buildWritingPrompt(
  voice: VoiceProfile,
  subIntent: string,
): string {
  const sections: string[] = [];

  sections.push(`## Writing Mode: ${getSubIntentLabel(subIntent)}`);
  sections.push('');
  sections.push('You are generating screenplay content that will become part of the script.');
  sections.push('Voice consistency is CRITICAL in this mode.');
  sections.push('');

  // Strong voice reminder at the start
  sections.push(buildVoiceReminder(voice));
  sections.push('');

  // Sub-intent specific guidance
  sections.push(buildSubIntentGuidance(subIntent));
  sections.push('');

  // Voice checklist before output
  sections.push(buildVoiceChecklist(voice));

  return sections.join('\n');
}

function getSubIntentLabel(subIntent: string): string {
  const labels: Record<string, string> = {
    scene_draft: 'Scene Drafting',
    dialogue_write: 'Dialogue Writing',
    action_write: 'Action Description',
    rewrite: 'Rewriting',
    continuation: 'Continuation',
  };
  return labels[subIntent] ?? 'General Writing';
}

function buildVoiceReminder(voice: VoiceProfile): string {
  const lines: string[] = [];

  lines.push('### Voice Reminder (CRITICAL)');
  lines.push('');
  lines.push(`You are writing in the **${voice.name}** voice.`);
  lines.push('');
  lines.push(`> ${voice.description}`);
  lines.push('');
  lines.push('Channel this voice in EVERY line you write:');

  for (const component of voice.components) {
    const intensity = component.weight >= 0.8 ? 'STRONGLY' : component.weight >= 0.5 ? 'moderately' : 'lightly';
    lines.push(`- ${component.aspect}: ${intensity} ${component.style}`);
  }

  return lines.join('\n');
}

function buildSubIntentGuidance(subIntent: string): string {
  switch (subIntent) {
    case 'scene_draft':
      return [
        '### Scene Drafting Guidelines',
        '',
        '1. Start with a clear, specific scene heading (INT./EXT., location, time)',
        '2. Open with action that establishes visual context',
        '3. Introduce characters through behavior, not exposition',
        '4. Let dialogue emerge naturally from the dramatic situation',
        '5. End the scene with momentum (action, decision, or revelation)',
        '',
        'Remember: Every scene needs a clear objective and obstacle.',
      ].join('\n');

    case 'dialogue_write':
      return [
        '### Dialogue Writing Guidelines',
        '',
        '1. Each character must have a DISTINCT voice',
        '2. Subtext is more powerful than direct statements',
        '3. Use pauses, interruptions, and non-sequiturs strategically',
        '4. Dialogue reveals character through word choice, rhythm, and what they avoid',
        '5. Every line should either advance plot or deepen character (ideally both)',
        '',
        'Test: Could you tell who is speaking without the character name?',
      ].join('\n');

    case 'action_write':
      return [
        '### Action Description Guidelines',
        '',
        '1. Write in present tense, active voice',
        '2. Be specific and visual - what does the camera see?',
        '3. Use rhythm: short sentences for tension, longer for atmosphere',
        '4. Avoid camera directions unless essential',
        '5. Focus on meaningful details that reveal character or advance story',
        '',
        'Remember: Action lines set tone and pace. They ARE the movie.',
      ].join('\n');

    case 'rewrite':
      return [
        '### Rewriting Guidelines',
        '',
        '1. Understand the INTENT of the original before changing it',
        '2. Preserve what works while improving what does not',
        '3. Maintain continuity with surrounding content',
        '4. Elevate - do not just change for the sake of change',
        '5. Ask: Does this rewrite better serve the story?',
        '',
        'CRITICAL: Maintain the established voice while improving the craft.',
      ].join('\n');

    case 'continuation':
      return [
        '### Continuation Guidelines',
        '',
        '1. Read the preceding content carefully for tone and momentum',
        '2. Continue seamlessly - no jarring shifts',
        '3. Escalate or develop - do not repeat or plateau',
        '4. Honor any setups or promises in the preceding content',
        '5. Maintain character voices established earlier',
        '',
        'The continuation should feel like the same writer wrote it.',
      ].join('\n');

    default:
      return '';
  }
}

function buildVoiceChecklist(voice: VoiceProfile): string {
  const lines: string[] = [];

  lines.push('### Pre-Output Voice Check');
  lines.push('');
  lines.push('BEFORE submitting any Fountain content, verify:');
  lines.push('');
  lines.push(`- [ ] Does this SOUND like ${voice.name}?`);
  lines.push('- [ ] Would this feel at home in a screenplay described as:');
  lines.push(`      "${voice.description}"?`);

  // Add aspect-specific checks
  const dialogueComponent = voice.components.find((c) => c.aspect === 'dialogue');
  if (dialogueComponent && dialogueComponent.weight >= 0.7) {
    lines.push(`- [ ] Is the dialogue ${dialogueComponent.style}?`);
  }

  const actionComponent = voice.components.find((c) => c.aspect === 'action');
  if (actionComponent && actionComponent.weight >= 0.7) {
    lines.push(`- [ ] Are action lines ${actionComponent.style}?`);
  }

  const toneComponent = voice.components.find((c) => c.aspect === 'tone');
  if (toneComponent && toneComponent.weight >= 0.7) {
    lines.push(`- [ ] Is the overall tone ${toneComponent.style}?`);
  }

  lines.push('');
  lines.push('If ANY check fails, revise before outputting.');

  return lines.join('\n');
}
