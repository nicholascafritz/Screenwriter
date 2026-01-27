// ---------------------------------------------------------------------------
// Fountain Screenplay Format -- Library Barrel Export
// ---------------------------------------------------------------------------

// Types
export type {
  ElementType,
  IntExt,
  Scene,
  ScriptElement,
  Screenplay,
  ScreenplayAnalytics,
  ValidationIssue,
  ValidationSeverity,
} from './types';

// Parser
export { parseFountain } from './parser';

// Serializer
export {
  serializeElements,
  serializeFountain,
  serializeTitlePage,
} from './serializer';

// Validator
export { validateScreenplay } from './validator';

// Analytics
export {
  analyzeScreenplay,
  getCharacterDialogueCounts,
  getCharacters,
  getDialogueToActionRatio,
  getLocations,
  getPageCount,
  getSceneCount,
} from './analytics';
