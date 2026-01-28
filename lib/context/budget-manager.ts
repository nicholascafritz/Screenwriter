// ---------------------------------------------------------------------------
// Context Budget Manager -- Token budget tracking and reduction
// ---------------------------------------------------------------------------
//
// Implements a three-tier context system:
//   Tier 1 (Always Present): Macro summary (~1-2K tokens, never truncated)
//   Tier 2 (Relevance-Filtered): Current scene, adjacent scenes, Story Bible
//   Tier 3 (On-Demand): Full screenplay via tool calls
//
// Tracks token usage and provides reduction strategies when over budget.
// ---------------------------------------------------------------------------

import {
  generateScreenplaySummary,
  formatSummaryForPrompt,
  type ScreenplayStateSummary,
} from './screenplay-summary';
import { parseFountain } from '@/lib/fountain/parser';
import { useStoryBibleStore } from '@/lib/store/story-bible';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Token estimation (rough approximation).
 * More accurate would use tiktoken, but this is close enough for budget management.
 */
export function estimateTokens(text: string): number {
  // Average: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

export interface ContextBudgetItem {
  category: string;
  tokens: number;
  /** Can this be reduced if over budget? */
  reducible: boolean;
  /** Priority for reduction (higher = reduce first) */
  reductionPriority: number;
  /** Description for UI */
  description?: string;
}

export interface ContextBudget {
  /** Maximum tokens available */
  total: number;
  /** Currently used tokens */
  used: number;
  /** Breakdown by category */
  breakdown: ContextBudgetItem[];
  /** Percentage used (0-100) */
  percentUsed: number;
  /** Is the budget over limit? */
  overBudget: boolean;
  /** Recommended actions if over budget */
  recommendations: string[];
}

export interface ContextComponents {
  /** Always-present macro summary (~1-2K tokens) */
  macroSummary: string;

  /** Full text of current scene */
  currentScene: string | null;

  /** Full text of adjacent scenes (±1) */
  adjacentScenes: string[];

  /** Relevance-filtered Story Bible content */
  storyBible: string;

  /** Recent chat history (potentially compacted) */
  chatHistory: string;

  /** System prompt sections (mode instructions, voice, etc.) */
  systemPromptBase: string;

  /** The budget breakdown */
  budget: ContextBudget;

  /** The underlying summary data (for reference) */
  summaryData: ScreenplayStateSummary;
}

export interface ContextBuilderOptions {
  screenplayText: string;
  projectId: string;
  /** Scene heading where cursor is located */
  cursorScene?: string;
  /** Chat messages to include */
  chatMessages: { role: 'user' | 'assistant' | 'system'; content: string }[];
  /** Base system prompt (without context) */
  systemPromptBase?: string;
  /** Maximum context tokens (default: 180K, leaving 20K for response) */
  maxTokens?: number;
}

// ---------------------------------------------------------------------------
// Main Context Builder
// ---------------------------------------------------------------------------

export function buildContextComponents(options: ContextBuilderOptions): ContextComponents {
  const {
    screenplayText,
    projectId,
    cursorScene,
    chatMessages,
    systemPromptBase = '',
    maxTokens = 180000,
  } = options;

  const breakdown: ContextBudgetItem[] = [];
  let used = 0;

  // 1. Generate and format macro summary (ALWAYS included)
  const summaryData = generateScreenplaySummary(screenplayText, projectId);
  const macroSummary = formatSummaryForPrompt(summaryData);
  const macroTokens = estimateTokens(macroSummary);
  breakdown.push({
    category: 'Macro summary',
    tokens: macroTokens,
    reducible: false,
    reductionPriority: 0,
    description: 'Story state overview (always included)',
  });
  used += macroTokens;

  // 2. System prompt base
  if (systemPromptBase) {
    const baseTokens = estimateTokens(systemPromptBase);
    breakdown.push({
      category: 'System instructions',
      tokens: baseTokens,
      reducible: false,
      reductionPriority: 0,
      description: 'Mode, voice, and tool instructions',
    });
    used += baseTokens;
  }

  // 3. Current scene (ALWAYS included if exists)
  const parsed = parseFountain(screenplayText);
  let currentScene: string | null = null;
  let currentSceneIndex = -1;

  if (cursorScene) {
    currentSceneIndex = parsed.scenes.findIndex((s) =>
      s.heading.toLowerCase().includes(cursorScene.toLowerCase())
    );
    if (currentSceneIndex >= 0) {
      currentScene = formatSceneForContext(parsed.scenes[currentSceneIndex]);
      const sceneTokens = estimateTokens(currentScene);
      breakdown.push({
        category: 'Current scene',
        tokens: sceneTokens,
        reducible: false,
        reductionPriority: 0,
        description: `Scene: ${parsed.scenes[currentSceneIndex].heading}`,
      });
      used += sceneTokens;
    }
  }

  // 4. Adjacent scenes (reducible)
  const adjacentScenes: string[] = [];
  if (currentSceneIndex >= 0) {
    const prevScene = parsed.scenes[currentSceneIndex - 1];
    const nextScene = parsed.scenes[currentSceneIndex + 1];

    if (prevScene) {
      adjacentScenes.push(formatSceneForContext(prevScene));
    }
    if (nextScene) {
      adjacentScenes.push(formatSceneForContext(nextScene));
    }

    if (adjacentScenes.length > 0) {
      const adjacentTokens = estimateTokens(adjacentScenes.join('\n\n'));
      breakdown.push({
        category: 'Adjacent scenes',
        tokens: adjacentTokens,
        reducible: true,
        reductionPriority: 3,
        description: '±1 scenes for context',
      });
      used += adjacentTokens;
    }
  }

  // 5. Story Bible (relevance-filtered, reducible)
  const storyBible = buildRelevantStoryBible(cursorScene, currentScene);
  const bibleTokens = estimateTokens(storyBible);
  if (bibleTokens > 0) {
    breakdown.push({
      category: 'Story Bible',
      tokens: bibleTokens,
      reducible: true,
      reductionPriority: 2,
      description: 'Characters, themes, notes',
    });
    used += bibleTokens;
  }

  // 6. Chat history (reducible, highest priority for reduction)
  const chatHistory = formatChatHistory(chatMessages);
  const historyTokens = estimateTokens(chatHistory);
  if (historyTokens > 0) {
    breakdown.push({
      category: 'Chat history',
      tokens: historyTokens,
      reducible: true,
      reductionPriority: 4,
      description: `${chatMessages.length} messages`,
    });
    used += historyTokens;
  }

  // Calculate budget
  const percentUsed = Math.round((used / maxTokens) * 100);
  const overBudget = used > maxTokens;

  // Generate recommendations if over budget
  const recommendations: string[] = [];
  if (overBudget) {
    const reducibleItems = breakdown
      .filter((b) => b.reducible)
      .sort((a, b) => b.reductionPriority - a.reductionPriority);

    for (const item of reducibleItems) {
      if (item.category === 'Chat history') {
        recommendations.push('Compact chat history to preserve key decisions only');
      } else if (item.category === 'Adjacent scenes') {
        recommendations.push('Remove adjacent scenes from context');
      } else if (item.category === 'Story Bible') {
        recommendations.push('Reduce Story Bible to essential characters only');
      }
    }
  } else if (percentUsed > 80) {
    recommendations.push('Context is getting large. Consider compacting chat history soon.');
  }

  const budget: ContextBudget = {
    total: maxTokens,
    used,
    breakdown,
    percentUsed,
    overBudget,
    recommendations,
  };

  return {
    macroSummary,
    currentScene,
    adjacentScenes,
    storyBible,
    chatHistory,
    systemPromptBase,
    budget,
    summaryData,
  };
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

interface SceneElement {
  type: string;
  text: string;
}

interface SceneForFormat {
  heading: string;
  elements: SceneElement[];
}

function formatSceneForContext(scene: SceneForFormat): string {
  const lines: string[] = [scene.heading, ''];

  for (const el of scene.elements) {
    switch (el.type) {
      case 'action':
        lines.push(el.text);
        lines.push('');
        break;
      case 'character':
        lines.push(el.text.toUpperCase());
        break;
      case 'dialogue':
        lines.push(el.text);
        lines.push('');
        break;
      case 'parenthetical':
        lines.push(`(${el.text})`);
        break;
      case 'transition':
        lines.push('');
        lines.push(el.text);
        lines.push('');
        break;
    }
  }

  return lines.join('\n').trim();
}

function buildRelevantStoryBible(
  cursorScene?: string,
  currentSceneText?: string | null
): string {
  const bible = useStoryBibleStore.getState().bible;
  if (!bible) return '';

  const lines: string[] = [];

  // Extract character names from current scene
  const sceneCharacters = new Set<string>();
  if (currentSceneText) {
    const matches = currentSceneText.match(/^[A-Z][A-Z\s]+$/gm) || [];
    for (const match of matches) {
      const trimmed = match.trim();
      if (
        !trimmed.startsWith('INT') &&
        !trimmed.startsWith('EXT') &&
        !trimmed.endsWith(':')
      ) {
        sceneCharacters.add(trimmed);
      }
    }
  }

  // Always include overview
  if (bible.genre || bible.tone || bible.logline) {
    lines.push('## Story Overview');
    if (bible.genre) lines.push(`Genre: ${bible.genre}`);
    if (bible.tone) lines.push(`Tone: ${bible.tone}`);
    if (bible.logline) lines.push(`Logline: ${bible.logline}`);
    if (bible.themes.length > 0) lines.push(`Themes: ${bible.themes.join(', ')}`);
    lines.push('');
  }

  // Characters in current scene (full detail)
  const relevantChars = bible.characters.filter((c) =>
    sceneCharacters.has(c.name.toUpperCase())
  );
  const otherChars = bible.characters.filter(
    (c) => !sceneCharacters.has(c.name.toUpperCase())
  );

  if (relevantChars.length > 0) {
    lines.push('## Characters in Scene');
    for (const char of relevantChars) {
      lines.push(`### ${char.name}`);
      if (char.description) lines.push(char.description);
      if (char.arc) lines.push(`Arc: ${char.arc}`);
      if (char.relationships.length > 0) {
        const rels = char.relationships
          .map((r) => {
            const related = bible.characters.find((c) => c.id === r.characterId);
            return related ? `${r.relationship} to ${related.name}` : null;
          })
          .filter(Boolean);
        if (rels.length > 0) lines.push(`Relationships: ${rels.join(', ')}`);
      }
      lines.push('');
    }
  }

  // Other characters (brief mention)
  if (otherChars.length > 0) {
    lines.push('## Other Characters');
    lines.push(otherChars.map((c) => c.name).join(', '));
    lines.push('');
  }

  // Custom notes (if any)
  if (bible.customNotes) {
    const truncated =
      bible.customNotes.length > 500
        ? bible.customNotes.slice(0, 500) + '...'
        : bible.customNotes;
    lines.push('## Writer Notes');
    lines.push(truncated);
  }

  return lines.join('\n');
}

function formatChatHistory(
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
): string {
  if (messages.length === 0) return '';

  const lines: string[] = ['## Recent Conversation'];

  for (const msg of messages) {
    const role =
      msg.role === 'user' ? 'Human' : msg.role === 'assistant' ? 'Assistant' : 'System';
    lines.push(`**${role}:** ${msg.content}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Context Reduction
// ---------------------------------------------------------------------------

/**
 * Reduce context components to fit within budget.
 * Returns new components with reduced content.
 */
export function reduceContextToBudget(
  components: ContextComponents,
  targetTokens?: number
): ContextComponents {
  const target = targetTokens ?? components.budget.total;

  if (components.budget.used <= target) {
    return components;
  }

  // Clone components
  const reduced = { ...components };
  let currentTokens = components.budget.used;

  // Reduction strategies in priority order

  // 1. Compact chat history first
  if (currentTokens > target && reduced.chatHistory) {
    // For now, just truncate to last 3 messages
    // The full AI-powered compaction is in chat-compaction.ts
    const lines = reduced.chatHistory.split('\n\n');
    if (lines.length > 4) {
      // header + 3 messages
      reduced.chatHistory = [lines[0], ...lines.slice(-3)].join('\n\n');
      const saved =
        estimateTokens(components.chatHistory) - estimateTokens(reduced.chatHistory);
      currentTokens -= saved;
    }
  }

  // 2. Remove adjacent scenes
  if (currentTokens > target && reduced.adjacentScenes.length > 0) {
    const saved = estimateTokens(reduced.adjacentScenes.join('\n\n'));
    reduced.adjacentScenes = [];
    currentTokens -= saved;
  }

  // 3. Reduce Story Bible
  if (currentTokens > target && reduced.storyBible) {
    // Keep only the overview section
    const lines = reduced.storyBible.split('\n');
    const overviewEnd = lines.findIndex((l, i) => i > 0 && l.startsWith('## '));
    if (overviewEnd > 0) {
      reduced.storyBible = lines.slice(0, overviewEnd).join('\n');
      const saved =
        estimateTokens(components.storyBible) - estimateTokens(reduced.storyBible);
      currentTokens -= saved;
    }
  }

  // Recalculate budget
  reduced.budget = {
    ...reduced.budget,
    used: currentTokens,
    percentUsed: Math.round((currentTokens / target) * 100),
    overBudget: currentTokens > target,
  };

  return reduced;
}
