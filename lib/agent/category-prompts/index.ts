// ---------------------------------------------------------------------------
// Category Prompts - Index
// ---------------------------------------------------------------------------
//
// Exports all category-specific prompt builders for use in the main
// prompt assembly system.
// ---------------------------------------------------------------------------

export { buildWritingPrompt } from './writing';
export { buildAnalysisPrompt } from './analysis';
export { buildDevelopmentPrompt } from './development';
export { buildEditingPrompt } from './editing';

import type { VoiceProfile } from '../voices';
import type { IntentCategory, SubIntent } from '../dispatcher';
import { buildWritingPrompt } from './writing';
import { buildAnalysisPrompt } from './analysis';
import { buildDevelopmentPrompt } from './development';
import { buildEditingPrompt } from './editing';

/**
 * Build the category-specific prompt section based on the classified intent.
 *
 * This is the main entry point for adding intent-aware prompts to the
 * system prompt assembly.
 */
export function buildCategoryPrompt(
  category: IntentCategory,
  subIntent: SubIntent,
  voice: VoiceProfile,
): string {
  switch (category) {
    case 'writing':
      return buildWritingPrompt(voice, subIntent);
    case 'analysis':
      return buildAnalysisPrompt(voice, subIntent);
    case 'development':
      return buildDevelopmentPrompt(voice, subIntent);
    case 'editing':
      return buildEditingPrompt(voice, subIntent);
    default:
      // Default to writing if unknown category
      return buildWritingPrompt(voice, 'rewrite');
  }
}
