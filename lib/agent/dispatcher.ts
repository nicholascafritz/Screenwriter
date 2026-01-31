// ---------------------------------------------------------------------------
// AI Agent -- Intent Dispatcher
// ---------------------------------------------------------------------------
//
// Classifies user messages into intent categories to route them to
// specialized prompts. This enables more focused voice reinforcement
// based on what type of task the user is requesting.
//
// Intent Categories:
//   - writing: Creating or rewriting screenplay content
//   - analysis: Examining structure, dialogue, characters
//   - development: Brainstorming, story building, outlining
//   - editing: Polish, format fixes, minor corrections
//
// Usage:
//   import { classifyIntent, IntentCategory } from '@/lib/agent/dispatcher';
//   const intent = classifyIntent(userMessage, conversationContext);
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IntentCategory = 'writing' | 'analysis' | 'development' | 'editing';

export type WritingSubIntent =
  | 'scene_draft'
  | 'dialogue_write'
  | 'action_write'
  | 'rewrite'
  | 'continuation';

export type AnalysisSubIntent =
  | 'structure_analysis'
  | 'dialogue_analysis'
  | 'character_analysis'
  | 'pacing_analysis'
  | 'general_analysis';

export type DevelopmentSubIntent =
  | 'brainstorm'
  | 'beat_development'
  | 'outline_generation'
  | 'character_development'
  | 'theme_exploration';

export type EditingSubIntent =
  | 'polish'
  | 'format_fix'
  | 'continuity_check'
  | 'typo_fix'
  | 'trim';

export type SubIntent =
  | WritingSubIntent
  | AnalysisSubIntent
  | DevelopmentSubIntent
  | EditingSubIntent;

import type { TurningPointKey } from '@/lib/tripod/types';
import type { ChunkType } from '@/lib/tripod/vector-store';

/** Configuration for semantic retrieval of TRIPOD examples. */
export interface RetrievalConfig {
  /** Types of chunks to retrieve (turning_point, scene, dialogue_excerpt). */
  chunkTypes: ChunkType[];
  /** Filter to a specific turning point label. */
  turningPointFilter?: TurningPointKey;
  /** Number of examples to retrieve. */
  topK: number;
}

export interface DispatchResult {
  /** The primary intent category. */
  category: IntentCategory;

  /** More specific sub-intent within the category. */
  subIntent: SubIntent;

  /** Confidence score 0-1 for the classification. */
  confidence: number;

  /** Tools most likely needed for this intent. */
  suggestedTools: string[];

  /** Voice reinforcement intensity (1 = light, 2 = moderate, 3 = strong). */
  voiceIntensity: 1 | 2 | 3;

  /** Configuration for retrieving relevant TRIPOD examples. */
  retrievalConfig?: RetrievalConfig;
}

// ---------------------------------------------------------------------------
// Intent Classification Patterns
// ---------------------------------------------------------------------------

interface IntentPattern {
  category: IntentCategory;
  subIntent: SubIntent;
  patterns: RegExp[];
  keywords: string[];
  suggestedTools: string[];
  voiceIntensity: 1 | 2 | 3;
  retrievalConfig?: RetrievalConfig;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // Writing intents (highest voice intensity)
  {
    category: 'writing',
    subIntent: 'scene_draft',
    patterns: [
      /\b(write|draft|create|compose)\s+(a\s+)?(new\s+)?scene/i,
      /\bwrite\s+(?:the\s+)?(?:next\s+)?scene/i,
      /\bnew\s+scene\b/i,
    ],
    keywords: ['write scene', 'draft scene', 'create scene', 'new scene', 'opening scene'],
    suggestedTools: ['insert_scene', 'edit_scene'],
    voiceIntensity: 3,
    retrievalConfig: {
      chunkTypes: ['scene', 'dialogue_excerpt'],
      topK: 3,
    },
  },
  {
    category: 'writing',
    subIntent: 'dialogue_write',
    patterns: [
      /\b(write|add|create)\s+(some\s+)?dialogue/i,
      /\bgive\s+\w+\s+(a\s+)?line/i,
      /\bwhat\s+(would|should|does)\s+\w+\s+say/i,
    ],
    keywords: ['dialogue', 'conversation', 'exchange', 'lines for', 'what would they say'],
    suggestedTools: ['dialogue', 'edit_scene'],
    voiceIntensity: 3,
    retrievalConfig: {
      chunkTypes: ['dialogue_excerpt'],
      topK: 3,
    },
  },
  {
    category: 'writing',
    subIntent: 'action_write',
    patterns: [
      /\b(write|add|create)\s+(an?\s+)?action/i,
      /\bdescribe\s+(?:the\s+)?(?:scene|action|moment)/i,
      /\bwrite\s+(?:the\s+)?description/i,
    ],
    keywords: ['action lines', 'describe', 'description', 'visual', 'atmosphere'],
    suggestedTools: ['edit_scene', 'replace_text'],
    voiceIntensity: 3,
  },
  {
    category: 'writing',
    subIntent: 'rewrite',
    patterns: [
      /\b(rewrite|rework|revise|redo)\s/i,
      /\bmake\s+(?:it|this|the\s+\w+)\s+(more|less|better)/i,
      /\bchange\s+(?:it|this|the\s+\w+)\s+to/i,
      /\btry\s+(?:it|this)\s+again/i,
    ],
    keywords: ['rewrite', 'revise', 'rework', 'redo', 'make it', 'try again', 'another version'],
    suggestedTools: ['edit_scene', 'replace_text', 'dialogue'],
    voiceIntensity: 3,
    retrievalConfig: {
      chunkTypes: ['scene', 'dialogue_excerpt'],
      topK: 2,
    },
  },
  {
    category: 'writing',
    subIntent: 'continuation',
    patterns: [
      /\bcontinue\b/i,
      /\bkeep\s+going/i,
      /\bwhat\s+happens\s+next/i,
      /\band\s+then\s*\?/i,
    ],
    keywords: ['continue', 'keep going', 'next', 'and then', 'go on'],
    suggestedTools: ['edit_scene', 'insert_scene'],
    voiceIntensity: 3,
  },

  // Analysis intents (lower voice intensity - focus on accuracy)
  {
    category: 'analysis',
    subIntent: 'structure_analysis',
    patterns: [
      /\b(analyze|check|review)\s+(?:the\s+)?structure/i,
      /\bhow\s+is\s+(?:the\s+)?(?:pacing|structure)/i,
      /\bare\s+(?:the\s+)?(?:acts?|beats?)\s+working/i,
    ],
    keywords: ['structure', 'acts', 'beats', 'turning points', 'midpoint', 'pacing'],
    suggestedTools: ['get_structure', 'analyze_narrative_arc', 'compare_structure'],
    voiceIntensity: 1,
  },
  {
    category: 'analysis',
    subIntent: 'dialogue_analysis',
    patterns: [
      /\b(analyze|check|review)\s+(?:the\s+)?dialogue/i,
      /\bdo\s+(?:the\s+)?characters?\s+sound\s+distinct/i,
      /\bhow\s+is\s+\w+(?:'s)?\s+voice/i,
    ],
    keywords: ['dialogue analysis', 'character voice', 'distinct', 'sounds like'],
    suggestedTools: ['dialogue'],
    voiceIntensity: 1,
  },
  {
    category: 'analysis',
    subIntent: 'character_analysis',
    patterns: [
      /\b(analyze|examine)\s+(?:the\s+)?character/i,
      /\bwho\s+is\s+\w+/i,
      /\bwhat\s+(?:is|are)\s+\w+(?:'s)?\s+(?:motivation|flaw|arc|goal)/i,
    ],
    keywords: ['character analysis', 'motivation', 'arc', 'flaw', 'goal', 'want', 'need'],
    suggestedTools: ['get_characters', 'read_screenplay', 'dialogue'],
    voiceIntensity: 1,
  },
  {
    category: 'analysis',
    subIntent: 'pacing_analysis',
    patterns: [
      /\b(analyze|check)\s+(?:the\s+)?pacing/i,
      /\bis\s+(?:it|this)\s+(?:too\s+)?(?:slow|fast)/i,
      /\bhow\s+(?:is\s+the\s+)?(?:rhythm|flow)/i,
    ],
    keywords: ['pacing', 'rhythm', 'flow', 'too slow', 'too fast', 'drags'],
    suggestedTools: ['get_statistics', 'read_act', 'get_act_analysis'],
    voiceIntensity: 1,
  },
  {
    category: 'analysis',
    subIntent: 'general_analysis',
    patterns: [
      /\bwhat\s+(?:do\s+you\s+)?think/i,
      /\bhow\s+(?:does\s+this|is\s+this)\s+(?:look|read|work)/i,
      /\bgive\s+me\s+(?:your\s+)?(?:thoughts|feedback|notes)/i,
    ],
    keywords: ['feedback', 'thoughts', 'notes', 'what do you think', 'review'],
    suggestedTools: ['read_scene', 'get_outline'],
    voiceIntensity: 1,
  },

  // Development intents (moderate voice intensity)
  {
    category: 'development',
    subIntent: 'brainstorm',
    patterns: [
      /\bbrainstorm/i,
      /\blet(?:'s)?\s+(?:think|explore|discuss)/i,
      /\bwhat\s+if/i,
      /\bideas?\s+for/i,
    ],
    keywords: ['brainstorm', 'ideas', 'what if', 'explore', 'possibilities', 'options'],
    suggestedTools: ['read_screenplay', 'get_outline'],
    voiceIntensity: 2,
  },
  {
    category: 'development',
    subIntent: 'beat_development',
    patterns: [
      /\bdevelop\s+(?:the\s+)?(?:beat|midpoint|climax)/i,
      /\bwhat\s+(?:is|should\s+be)\s+(?:the\s+)?(?:catalyst|inciting)/i,
      /\bfigure\s+out\s+(?:the\s+)?(?:act|beat)/i,
    ],
    keywords: ['beat', 'catalyst', 'midpoint', 'climax', 'inciting incident', 'break into'],
    suggestedTools: ['update_beat', 'get_structure'],
    voiceIntensity: 2,
    retrievalConfig: {
      chunkTypes: ['turning_point'],
      topK: 5,
    },
  },
  {
    category: 'development',
    subIntent: 'outline_generation',
    patterns: [
      /\b(create|generate|build)\s+(?:an?\s+)?outline/i,
      /\boutline\s+(?:the\s+)?(?:story|screenplay|script)/i,
      /\bscene\s+(?:by\s+)?scene\s+breakdown/i,
    ],
    keywords: ['outline', 'breakdown', 'scene list', 'structure it'],
    suggestedTools: ['generate_scene_outline', 'get_outline'],
    voiceIntensity: 2,
  },
  {
    category: 'development',
    subIntent: 'character_development',
    patterns: [
      /\bdevelop\s+(?:the\s+)?character/i,
      /\bflesh\s+out\s+\w+/i,
      /\bwho\s+should\s+\w+\s+be/i,
    ],
    keywords: ['develop character', 'flesh out', 'backstory', 'who is'],
    suggestedTools: ['add_character', 'get_characters'],
    voiceIntensity: 2,
  },
  {
    category: 'development',
    subIntent: 'theme_exploration',
    patterns: [
      /\bwhat(?:'s|\s+is)\s+(?:the\s+)?theme/i,
      /\bthematic/i,
      /\bwhat\s+is\s+(?:this|the\s+story)\s+about/i,
    ],
    keywords: ['theme', 'thematic', 'about', 'meaning', 'message'],
    suggestedTools: ['add_theme', 'read_screenplay'],
    voiceIntensity: 2,
  },

  // Editing intents (focus on precision, moderate voice)
  {
    category: 'editing',
    subIntent: 'polish',
    patterns: [
      /\bpolish/i,
      /\bclean\s+up/i,
      /\btighten/i,
      /\bsmooth\s+out/i,
    ],
    keywords: ['polish', 'clean up', 'tighten', 'smooth', 'refine'],
    suggestedTools: ['polish_pass', 'edit_scene'],
    voiceIntensity: 2,
  },
  {
    category: 'editing',
    subIntent: 'format_fix',
    patterns: [
      /\bfix\s+(?:the\s+)?format/i,
      /\bformat(?:ting)?\s+(?:issues?|errors?|problems?)/i,
      /\bfountain\s+(?:syntax|format)/i,
    ],
    keywords: ['format', 'formatting', 'syntax', 'fountain'],
    suggestedTools: ['validate_format', 'polish_pass'],
    voiceIntensity: 1,
  },
  {
    category: 'editing',
    subIntent: 'continuity_check',
    patterns: [
      /\bcontinuity/i,
      /\bcheck\s+(?:for\s+)?(?:errors?|mistakes?|inconsistenc)/i,
      /\bdoes\s+(?:this|it)\s+(?:make\s+)?sense/i,
    ],
    keywords: ['continuity', 'consistency', 'check', 'errors', 'mistakes'],
    suggestedTools: ['read_screenplay', 'validate_format'],
    voiceIntensity: 1,
  },
  {
    category: 'editing',
    subIntent: 'typo_fix',
    patterns: [
      /\bfix\s+(?:the\s+)?(?:typo|spelling|grammar)/i,
      /\btypo/i,
      /\bspelling/i,
    ],
    keywords: ['typo', 'spelling', 'grammar', 'mistake'],
    suggestedTools: ['replace_text', 'polish_pass'],
    voiceIntensity: 1,
  },
  {
    category: 'editing',
    subIntent: 'trim',
    patterns: [
      /\b(cut|trim|shorten|reduce)/i,
      /\btoo\s+(?:long|wordy|verbose)/i,
      /\bcut\s+(?:this|it)\s+down/i,
    ],
    keywords: ['cut', 'trim', 'shorten', 'reduce', 'too long', 'wordy'],
    suggestedTools: ['edit_scene', 'delete_scene'],
    voiceIntensity: 2,
  },
];

// ---------------------------------------------------------------------------
// Classification Functions
// ---------------------------------------------------------------------------

/**
 * Classify a user message into an intent category.
 *
 * This is a fast, deterministic classification based on pattern matching.
 * For edge cases, the default is 'writing' (the most common intent).
 */
export function classifyIntent(
  userMessage: string,
  _conversationContext?: string,
): DispatchResult {
  const normalizedMessage = userMessage.toLowerCase().trim();

  // Score each pattern
  let bestMatch: IntentPattern | null = null;
  let bestScore = 0;

  for (const pattern of INTENT_PATTERNS) {
    let score = 0;

    // Check regex patterns (high weight)
    for (const regex of pattern.patterns) {
      if (regex.test(userMessage)) {
        score += 3;
      }
    }

    // Check keywords (lower weight)
    for (const keyword of pattern.keywords) {
      if (normalizedMessage.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = pattern;
    }
  }

  // Default to writing if no strong match
  if (!bestMatch || bestScore < 1) {
    return {
      category: 'writing',
      subIntent: 'rewrite',
      confidence: 0.5,
      suggestedTools: ['edit_scene', 'read_scene'],
      voiceIntensity: 3,
    };
  }

  // Calculate confidence (rough heuristic)
  const confidence = Math.min(1, bestScore / 5);

  return {
    category: bestMatch.category,
    subIntent: bestMatch.subIntent,
    confidence,
    suggestedTools: bestMatch.suggestedTools,
    voiceIntensity: bestMatch.voiceIntensity,
    retrievalConfig: bestMatch.retrievalConfig,
  };
}

/**
 * Get the recommended tools for an intent category.
 */
export function getToolsForIntent(intent: DispatchResult): string[] {
  return intent.suggestedTools;
}

/**
 * Determine if this intent should have strong voice reinforcement.
 */
export function shouldReinforceVoice(intent: DispatchResult): boolean {
  return intent.voiceIntensity >= 2;
}

/**
 * Get voice reinforcement level description.
 */
export function getVoiceIntensityLabel(intensity: 1 | 2 | 3): string {
  switch (intensity) {
    case 1:
      return 'light';
    case 2:
      return 'moderate';
    case 3:
      return 'strong';
  }
}
