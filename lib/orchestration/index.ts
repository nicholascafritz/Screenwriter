// ---------------------------------------------------------------------------
// Orchestration Layer -- Public API
// ---------------------------------------------------------------------------
//
// This module exports all orchestration functions that compose store primitives
// into higher-level operations. Components should prefer these orchestrated
// functions over direct store calls when operations span multiple stores.
// ---------------------------------------------------------------------------

// Content pipeline
export {
  setContentWithReconciliation,
  applyAIToolResult,
  loadSampleScriptWithReconciliation,
  parseAndReconcile,
  getSceneIdForLine,
  addCommentWithSceneId,
} from './content-pipeline';

// AI tool pipeline
export {
  applyAIToolResult as applyAIResult,
  withAIEditing,
  type AIToolResult,
} from './ai-tool-pipeline';
