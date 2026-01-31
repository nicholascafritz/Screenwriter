// ---------------------------------------------------------------------------
// AI Agent -- Voice Reinforcement System
// ---------------------------------------------------------------------------
//
// Addresses voice drift by injecting voice reminders at strategic points
// in the conversation. The problem: voice instructions at the START of
// the system prompt lose influence as context grows. This module provides
// mechanisms to reinforce voice throughout the conversation.
//
// Reinforcement Points:
//   1. System prompt (handled by existing buildVoicePrompt)
//   2. Category-specific prompts (handled by category-prompts/)
//   3. Mid-conversation injection (this module)
//   4. Tool result context (this module)
//
// Usage:
//   import { getVoiceReinforcement, shouldInjectReinforcement } from '@/lib/agent/voice-reinforcement';
// ---------------------------------------------------------------------------

import type { VoiceProfile } from './voices';
import type { IntentCategory } from './dispatcher';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReinforcementContext {
  /** The current voice profile. */
  voice: VoiceProfile;

  /** The classified intent category. */
  intentCategory: IntentCategory;

  /** Number of conversation turns so far. */
  turnCount: number;

  /** Whether the last response contained screenplay content. */
  lastResponseHadContent: boolean;

  /** Whether voice drift has been detected. */
  driftDetected?: boolean;
}

export interface VoiceReinforcementResult {
  /** The reinforcement text to inject. */
  text: string;

  /** Priority level (affects placement in context). */
  priority: 'critical' | 'high' | 'normal';

  /** Type of reinforcement for logging/analytics. */
  type: 'periodic' | 'pre-writing' | 'post-drift' | 'tool-context';
}

// ---------------------------------------------------------------------------
// Reinforcement Logic
// ---------------------------------------------------------------------------

/**
 * Determine if voice reinforcement should be injected at this point.
 *
 * Triggers:
 * - Every N turns (periodic refresh)
 * - Before writing tasks
 * - After detected drift
 */
export function shouldInjectReinforcement(context: ReinforcementContext): boolean {
  // Always reinforce on drift detection
  if (context.driftDetected) {
    return true;
  }

  // Always reinforce before writing tasks
  if (context.intentCategory === 'writing') {
    return true;
  }

  // Periodic reinforcement every 3 turns after turn 2
  if (context.turnCount > 2 && context.turnCount % 3 === 0) {
    return true;
  }

  // Reinforce after any turn that generated content (to prep for potential follow-up)
  if (context.lastResponseHadContent) {
    return true;
  }

  return false;
}

/**
 * Generate the voice reinforcement text based on context.
 */
export function getVoiceReinforcement(
  context: ReinforcementContext,
): VoiceReinforcementResult {
  const { voice, intentCategory, driftDetected } = context;

  // Critical reinforcement for drift or writing tasks
  if (driftDetected) {
    return {
      text: buildDriftRecoveryReinforcement(voice),
      priority: 'critical',
      type: 'post-drift',
    };
  }

  if (intentCategory === 'writing') {
    return {
      text: buildPreWritingReinforcement(voice),
      priority: 'high',
      type: 'pre-writing',
    };
  }

  // Normal periodic reinforcement
  return {
    text: buildPeriodicReinforcement(voice),
    priority: 'normal',
    type: 'periodic',
  };
}

/**
 * Build a compact voice reminder for tool result context.
 * This is injected into tool results that will be followed by writing.
 */
export function buildToolContextReinforcement(voice: VoiceProfile): string {
  return [
    `<voice-context>`,
    `Writing voice: ${voice.name}`,
    `Style: ${voice.description}`,
    `Maintain this voice in any content you generate.`,
    `</voice-context>`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Reinforcement Builders
// ---------------------------------------------------------------------------

function buildPreWritingReinforcement(voice: VoiceProfile): string {
  const lines: string[] = [];

  lines.push('<voice-reinforcement priority="high">');
  lines.push('');
  lines.push(`## Voice Checkpoint: ${voice.name}`);
  lines.push('');
  lines.push('You are about to write screenplay content.');
  lines.push('Before writing, internalize this voice:');
  lines.push('');
  lines.push(`> ${voice.description}`);
  lines.push('');

  // Pull the highest-weighted components
  const sortedComponents = [...voice.components].sort((a, b) => b.weight - a.weight);
  const topComponents = sortedComponents.slice(0, 3);

  lines.push('**Key voice markers to embody:**');
  for (const comp of topComponents) {
    const intensityWord = comp.weight >= 0.8 ? 'strongly' : 'notably';
    lines.push(`- ${comp.aspect}: ${intensityWord} ${comp.style}`);
  }

  lines.push('');
  lines.push('**Before outputting Fountain:**');
  lines.push(`- Would this feel at home in a ${voice.name} screenplay?`);
  lines.push('- Does every line reflect this voice, not generic AI prose?');
  lines.push('');
  lines.push('</voice-reinforcement>');

  return lines.join('\n');
}

function buildDriftRecoveryReinforcement(voice: VoiceProfile): string {
  const lines: string[] = [];

  lines.push('<voice-reinforcement priority="critical">');
  lines.push('');
  lines.push(`## VOICE CORRECTION: Return to ${voice.name}`);
  lines.push('');
  lines.push('The previous output may have drifted from the target voice.');
  lines.push('Re-center on this voice before continuing:');
  lines.push('');
  lines.push(`**${voice.name}**: ${voice.description}`);
  lines.push('');

  // List ALL components with full descriptions
  lines.push('**Full voice profile:**');
  for (const comp of voice.components) {
    const intensity = comp.weight >= 0.8 ? 'STRONG' : comp.weight >= 0.5 ? 'moderate' : 'light';
    lines.push(`- ${comp.aspect} (${intensity}): ${comp.style}`);
  }

  lines.push('');
  lines.push('**For the next response:**');
  lines.push('1. Re-read this voice profile carefully');
  lines.push('2. Channel the voice DELIBERATELY');
  lines.push('3. Check output against voice markers before submitting');
  lines.push('');
  lines.push('Do NOT default to generic, safe prose. This voice has PERSONALITY.');
  lines.push('');
  lines.push('</voice-reinforcement>');

  return lines.join('\n');
}

function buildPeriodicReinforcement(voice: VoiceProfile): string {
  const lines: string[] = [];

  lines.push('<voice-reminder>');
  lines.push(`Current voice: **${voice.name}** — ${voice.description}`);

  // Brief reminder of key characteristics
  const dialogueComp = voice.components.find((c) => c.aspect === 'dialogue');
  const toneComp = voice.components.find((c) => c.aspect === 'tone');

  if (dialogueComp || toneComp) {
    const markers: string[] = [];
    if (dialogueComp) markers.push(`${dialogueComp.style} dialogue`);
    if (toneComp) markers.push(`${toneComp.style} tone`);
    lines.push(`Maintain: ${markers.join(', ')}`);
  }

  lines.push('</voice-reminder>');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Voice Drift Detection (Heuristic)
// ---------------------------------------------------------------------------

/**
 * Simple heuristic check for potential voice drift.
 * This is a fast check, not a full analysis.
 *
 * Signs of drift:
 * - Generic phrases appearing in output
 * - Dramatic changes in sentence length patterns
 * - Loss of distinctive markers
 */
export function detectPotentialDrift(
  generatedContent: string,
  voice: VoiceProfile,
): { drifted: boolean; signals: string[] } {
  const signals: string[] = [];

  // Check for generic AI phrases that indicate drift
  const genericPhrases = [
    /\bdelve into\b/i,
    /\blet me help you\b/i,
    /\bi'd be happy to\b/i,
    /\bgreat question\b/i,
    /\babsolutely\b/i, // when overused
    /\bdefinitely\b/i, // when overused
    /\bfascinating\b/i,
    /\binteresting\b/i,
  ];

  for (const phrase of genericPhrases) {
    if (phrase.test(generatedContent)) {
      signals.push(`Generic phrase detected: ${phrase.source}`);
    }
  }

  // Check if this looks like screenplay content
  const isScreenplayContent =
    /^(INT\.|EXT\.|[A-Z]{2,}(\s+\([^)]+\))?\n)/.test(generatedContent.trim());

  if (isScreenplayContent) {
    // Voice-specific checks for screenplay content
    const toneComp = voice.components.find((c) => c.aspect === 'tone');

    if (toneComp?.style === 'dread' || toneComp?.style === 'wry-uncanny') {
      // Dark/atmospheric voices shouldn't have upbeat action lines
      if (/\bsmiles brightly\b|\bcheerfully\b|\beagerly\b/i.test(generatedContent)) {
        signals.push('Tone mismatch: upbeat language in dark voice');
      }
    }

    if (toneComp?.style === 'comedic' || toneComp?.style === 'irreverent') {
      // Comedy voices shouldn't be overly formal
      if (/\bproceeds to\b|\bsubsequently\b|\bthereafter\b/i.test(generatedContent)) {
        signals.push('Tone mismatch: overly formal in comedic voice');
      }
    }
  }

  return {
    drifted: signals.length >= 2, // Need multiple signals to flag drift
    signals,
  };
}

// ---------------------------------------------------------------------------
// Message Injection Helpers
// ---------------------------------------------------------------------------

/**
 * Format the reinforcement for injection into the message stream.
 * This can be used as a system message or prepended to user messages.
 */
export function formatReinforcementForInjection(
  reinforcement: VoiceReinforcementResult,
): string {
  // Wrap in appropriate markers based on priority
  if (reinforcement.priority === 'critical') {
    return `\n\n${reinforcement.text}\n\n`;
  }

  return `\n${reinforcement.text}\n`;
}

/**
 * Create a lightweight voice fingerprint for quick reference.
 * Useful for including in streaming responses or logs.
 */
export function getVoiceFingerprint(voice: VoiceProfile): string {
  const topTraits = voice.components
    .filter((c) => c.weight >= 0.7)
    .map((c) => `${c.aspect}:${c.style}`)
    .slice(0, 3)
    .join(', ');

  return `[Voice: ${voice.name} | ${topTraits}]`;
}
