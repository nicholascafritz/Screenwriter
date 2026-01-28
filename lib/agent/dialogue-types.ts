// ---------------------------------------------------------------------------
// Dialogue Analysis Types
// ---------------------------------------------------------------------------
//
// Type definitions for the reframed dialogue analysis system that presents
// findings as investigation prompts rather than warnings.
// ---------------------------------------------------------------------------

/**
 * Types of patterns that can be detected in dialogue analysis.
 */
export type DialoguePatternType =
  | 'vocabulary_overlap'
  | 'rhythm_similarity'
  | 'sentence_structure'
  | 'formality_match'
  | 'word_choice_pattern'
  | 'punctuation_style';

/**
 * Configuration for how a pattern type should be presented.
 */
export interface PatternConfig {
  /** Human-readable name of the pattern. */
  label: string;
  /** Investigation question framing. */
  questionTemplate: string;
  /** What to look for when this pattern is detected. */
  investigationFocus: string;
}

/**
 * Pattern configuration lookup.
 */
export const PATTERN_CONFIG: Record<DialoguePatternType, PatternConfig> = {
  vocabulary_overlap: {
    label: 'Vocabulary Overlap',
    questionTemplate: 'Do these characters share vocabulary intentionally?',
    investigationFocus:
      'Look for shared unusual words, catchphrases, or terminology that might indicate relationship, background, or intentional similarity.',
  },
  rhythm_similarity: {
    label: 'Similar Speech Rhythm',
    questionTemplate: 'Is the similar sentence length/rhythm intentional?',
    investigationFocus:
      'Compare average sentence lengths and variation. Similar rhythms can indicate shared background or unintentional uniformity.',
  },
  sentence_structure: {
    label: 'Sentence Structure',
    questionTemplate: 'Are similar sentence constructions serving the story?',
    investigationFocus:
      'Look for repeated grammatical patterns (e.g., both characters ask lots of questions, or both favor declarative statements).',
  },
  formality_match: {
    label: 'Formality Level',
    questionTemplate: "Does matching formality fit these characters' relationship?",
    investigationFocus:
      'Compare use of contractions, slang, complete sentences. Characters from different backgrounds often have different formality levels.',
  },
  word_choice_pattern: {
    label: 'Word Choice Patterns',
    questionTemplate: 'Are similar word preferences character-appropriate?',
    investigationFocus:
      'Look for shared preferences in adjectives, intensifiers, or filler words that might not match character backgrounds.',
  },
  punctuation_style: {
    label: 'Punctuation Style',
    questionTemplate: 'Does the punctuation reflect intentional speech patterns?',
    investigationFocus:
      'Compare use of ellipses, exclamations, dashes. Punctuation often reflects speech cadence and emotional expression.',
  },
};

/**
 * A distinctive feature observed in a character's dialogue.
 */
export interface DistinctiveFeature {
  /** Short description of what's working. */
  observation: string;
  /** Example dialogue line demonstrating the feature. */
  example?: string;
}

/**
 * An investigation prompt for a detected pattern.
 */
export interface InvestigationPrompt {
  /** The type of pattern detected. */
  patternType: DialoguePatternType;
  /** The investigation question. */
  question: string;
  /** What to investigate. */
  focus: string;
  /** Example dialogue showing the pattern (optional). */
  examples?: Array<{
    character: string;
    line: string;
  }>;
  /** Numeric metric if available (e.g., overlap percentage). */
  metric?: number;
  /** Metric label (e.g., "vocabulary overlap"). */
  metricLabel?: string;
}

/**
 * Comparison between two characters' dialogue.
 */
export interface CharacterComparison {
  /** First character name. */
  characterA: string;
  /** Second character name. */
  characterB: string;
  /** What's working for character A. */
  distinctiveFeaturesA: DistinctiveFeature[];
  /** What's working for character B. */
  distinctiveFeaturesB: DistinctiveFeature[];
  /** Investigation prompts (potential areas to explore). */
  investigationPrompts: InvestigationPrompt[];
  /** Overall assessment. */
  assessment: 'distinct' | 'some_overlap' | 'similar';
  /** Assessment description. */
  assessmentDescription: string;
}

/**
 * Summary statistics for the analysis.
 */
export interface AnalysisSummary {
  /** Total characters analyzed. */
  charactersAnalyzed: number;
  /** Number of pairs with distinct voices. */
  distinctPairs: number;
  /** Number of pairs with some overlap. */
  overlapPairs: number;
  /** Number of pairs with similar voices. */
  similarPairs: number;
  /** Top strengths observed. */
  topStrengths: string[];
}

/**
 * Complete dialogue analysis result.
 */
export interface DialogueAnalysisResult {
  /** Summary statistics. */
  summary: AnalysisSummary;
  /** Per-pair comparisons. */
  comparisons: CharacterComparison[];
  /** Timestamp of the analysis. */
  timestamp: number;
  /** Project ID this analysis belongs to. */
  projectId?: string;
}

/**
 * A dismissed pattern that should be hidden in future analyses.
 */
export interface DialoguePatternDismissal {
  /** Unique dismissal ID. */
  id: string;
  /** Project ID. */
  projectId: string;
  /** First character in the pair. */
  characterA: string;
  /** Second character in the pair. */
  characterB: string;
  /** The pattern type being dismissed. */
  patternType: DialoguePatternType;
  /** Optional reason for dismissal. */
  reason?: string;
  /** Timestamp when dismissed. */
  dismissedAt: number;
}

/**
 * Helper to check if a pattern is intentional based on common scenarios.
 */
export function suggestIntentionalityCheck(
  patternType: DialoguePatternType,
  characterA: string,
  characterB: string
): string[] {
  const checks: string[] = [];

  switch (patternType) {
    case 'vocabulary_overlap':
      checks.push(
        `Are ${characterA} and ${characterB} from the same profession or social circle?`,
        'Do they share a secret language or inside jokes?',
        'Is one mimicking the other intentionally?'
      );
      break;
    case 'rhythm_similarity':
      checks.push(
        'Are they in sync emotionally in this scene?',
        'Is one echoing the other for dramatic effect?',
        'Do they have similar educational backgrounds?'
      );
      break;
    case 'formality_match':
      checks.push(
        'Is the scene formal/informal by design?',
        'Are they code-switching based on context?',
        'Should their formality differ based on status?'
      );
      break;
    default:
      checks.push(
        'Is this similarity serving the story?',
        'Should these characters sound more different?'
      );
  }

  return checks;
}
