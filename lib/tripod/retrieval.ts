// ---------------------------------------------------------------------------
// TRIPOD Retrieval Module
// ---------------------------------------------------------------------------
//
// Provides semantic retrieval of TRIPOD screenplay examples based on
// user intent (from the dispatcher) and voice profile. This augments
// the system prompt with relevant examples for voice consistency.
//
// ---------------------------------------------------------------------------

import type { DispatchResult, RetrievalConfig, SubIntent } from '@/lib/agent/dispatcher';
import type { VoiceProfile } from '@/lib/agent/voices';
import type { TurningPointKey } from './types';
import type { VectorChunk, ChunkType } from './vector-store';
import {
  searchVectors,
  isVectorStoreAvailable,
  getTurningPointExamples,
  getSceneExamples,
  getDialogueExamples,
  type SearchResult,
} from './vector-search';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetrievalContext {
  /** The retrieved chunks. */
  chunks: VectorChunk[];
  /** Formatted prompt section ready for injection. */
  formattedPrompt: string;
  /** Whether retrieval was actually performed. */
  didRetrieve: boolean;
}

// ---------------------------------------------------------------------------
// Query Embedding
// ---------------------------------------------------------------------------

/**
 * Embed a query using OpenAI's API.
 * This is used at runtime to embed user messages for semantic search.
 */
export async function embedQueryOpenAI(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set for query embedding');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embedding error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// ---------------------------------------------------------------------------
// Turning Point Detection from Message
// ---------------------------------------------------------------------------

const TP_KEYWORDS: Record<TurningPointKey, string[]> = {
  tp1: ['catalyst', 'inciting', 'opportunity', 'hook', 'opening', 'setup'],
  tp2: ['break into two', 'end of act 1', 'act one', 'first act', 'change of plans', 'commitment'],
  tp3: ['midpoint', 'middle', 'point of no return', 'reversal', 'false victory', 'false defeat'],
  tp4: ['all is lost', 'break into three', 'end of act 2', 'dark night', 'low point', 'setback'],
  tp5: ['climax', 'finale', 'final', 'resolution', 'confrontation', 'ending'],
};

/**
 * Detect which turning point the user is asking about, if any.
 */
function detectTurningPointFromMessage(message: string): TurningPointKey | undefined {
  const lowerMessage = message.toLowerCase();

  for (const [tp, keywords] of Object.entries(TP_KEYWORDS) as [TurningPointKey, string[]][]) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        return tp;
      }
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Voice Affinity Scoring
// ---------------------------------------------------------------------------

/**
 * Score how well a chunk matches the given voice profile.
 * This is used to re-rank retrieved chunks by voice affinity.
 */
function scoreVoiceAffinity(chunk: VectorChunk, voice: VoiceProfile): number {
  let score = 1.0; // Base score

  // Genre-based affinity
  const voiceGenreMap: Record<string, string[]> = {
    'classic-hollywood': ['Drama', 'Romance', 'Comedy'],
    'auteur-dialogue': ['Crime', 'Drama', 'Thriller'],
    'prestige-drama': ['Drama', 'Biography', 'History'],
    'horror-thriller': ['Horror', 'Thriller', 'Mystery'],
    'comedy': ['Comedy', 'Romance', 'Family'],
    'nicks-voice': ['Thriller', 'Drama', 'Mystery'],
  };

  const preferredGenres = voiceGenreMap[voice.id] || [];
  if (chunk.metadata.genre && preferredGenres.includes(chunk.metadata.genre)) {
    score += 0.5;
  }

  // Dialogue density affinity
  const dialogueDensity = chunk.metadata.dialogueDensity || 0;
  const dialogueComponent = voice.components?.find((c) => c.aspect === 'dialogue');
  if (dialogueComponent) {
    // If voice is dialogue-heavy, prefer high dialogue density chunks
    if (dialogueComponent.style.toLowerCase().includes('dense') && dialogueDensity > 0.5) {
      score += 0.3;
    }
    // If voice is action-focused, prefer lower dialogue density
    if (dialogueComponent.style.toLowerCase().includes('sparse') && dialogueDensity < 0.3) {
      score += 0.3;
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// Main Retrieval Function
// ---------------------------------------------------------------------------

/**
 * Retrieve relevant TRIPOD examples based on the dispatcher result and voice.
 *
 * This function:
 * 1. Checks if retrieval is configured for this intent
 * 2. Optionally uses semantic search if a query embedding is provided
 * 3. Falls back to filtered random sampling if no embedding
 * 4. Re-ranks results by voice affinity
 * 5. Formats the results for prompt injection
 */
export async function retrieveContextForIntent(
  userMessage: string,
  dispatchResult: DispatchResult,
  voice: VoiceProfile,
  options: {
    embedQuery?: (text: string) => Promise<number[]>;
    genre?: string;
  } = {}
): Promise<RetrievalContext> {
  const emptyResult: RetrievalContext = {
    chunks: [],
    formattedPrompt: '',
    didRetrieve: false,
  };

  // Check if retrieval is configured
  const { retrievalConfig } = dispatchResult;
  if (!retrievalConfig) {
    return emptyResult;
  }

  // Check if vector store is available
  const storeAvailable = await isVectorStoreAvailable();
  if (!storeAvailable) {
    return emptyResult;
  }

  let chunks: VectorChunk[] = [];

  // Try semantic search if embedding function is provided
  if (options.embedQuery) {
    try {
      const queryEmbedding = await options.embedQuery(userMessage);

      // Detect turning point from message if not filtered
      let turningPointFilter = retrievalConfig.turningPointFilter;
      if (!turningPointFilter && retrievalConfig.chunkTypes.includes('turning_point')) {
        turningPointFilter = detectTurningPointFromMessage(userMessage);
      }

      const results = await searchVectors(queryEmbedding, {
        types: retrievalConfig.chunkTypes,
        turningPoint: turningPointFilter,
        genre: options.genre,
        topK: retrievalConfig.topK * 2, // Fetch more for re-ranking
      });

      chunks = results.map((r) => r.chunk);
    } catch (error) {
      console.warn('Semantic search failed, falling back to random sampling:', error);
    }
  }

  // Fall back to random sampling if semantic search failed or wasn't used
  if (chunks.length === 0) {
    const fallbackChunks: VectorChunk[] = [];

    for (const chunkType of retrievalConfig.chunkTypes) {
      switch (chunkType) {
        case 'turning_point': {
          const tpFilter = retrievalConfig.turningPointFilter ||
            detectTurningPointFromMessage(userMessage);
          if (tpFilter) {
            const tpChunks = await getTurningPointExamples(tpFilter, {
              genre: options.genre,
              topK: retrievalConfig.topK,
            });
            fallbackChunks.push(...tpChunks);
          }
          break;
        }
        case 'scene': {
          const sceneChunks = await getSceneExamples({
            genre: options.genre,
            topK: retrievalConfig.topK,
          });
          fallbackChunks.push(...sceneChunks);
          break;
        }
        case 'dialogue_excerpt': {
          const dialogueChunks = await getDialogueExamples({
            genre: options.genre,
            topK: retrievalConfig.topK,
          });
          fallbackChunks.push(...dialogueChunks);
          break;
        }
      }
    }

    chunks = fallbackChunks;
  }

  // Re-rank by voice affinity
  const rankedChunks = chunks
    .map((chunk) => ({
      chunk,
      affinity: scoreVoiceAffinity(chunk, voice),
    }))
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, retrievalConfig.topK)
    .map((r) => r.chunk);

  // Format for prompt injection
  const formattedPrompt = formatRetrievedChunks(rankedChunks, dispatchResult.subIntent);

  return {
    chunks: rankedChunks,
    formattedPrompt,
    didRetrieve: rankedChunks.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const TP_LABELS: Record<TurningPointKey, string> = {
  tp1: 'Catalyst / Inciting Incident',
  tp2: 'Break into Two / End of Act 1',
  tp3: 'Midpoint',
  tp4: 'All Is Lost / Break into Three',
  tp5: 'Climax / Finale',
};

/**
 * Format retrieved chunks as a prompt section.
 */
export function formatRetrievedChunks(
  chunks: VectorChunk[],
  subIntent: SubIntent
): string {
  if (chunks.length === 0) {
    return '';
  }

  const lines: string[] = [];

  lines.push('## Reference Examples from Professional Screenplays');
  lines.push('');
  lines.push('The following excerpts are from professionally produced films.');
  lines.push('Use them as stylistic and structural references — absorb the craft,');
  lines.push('but maintain the user\'s unique voice and story:');
  lines.push('');

  for (const chunk of chunks) {
    switch (chunk.type) {
      case 'turning_point': {
        const tpKey = chunk.metadata.turningPoint as TurningPointKey;
        const tpLabel = tpKey ? TP_LABELS[tpKey] : chunk.metadata.label;
        lines.push(`### ${chunk.movie} — ${tpLabel}`);
        if (chunk.metadata.position !== undefined) {
          lines.push(`*Position: ~${Math.round(chunk.metadata.position * 100)}% through the story*`);
        }
        lines.push('');
        lines.push(chunk.text);
        break;
      }

      case 'scene': {
        lines.push(`### ${chunk.movie} — Scene ${chunk.metadata.sceneIndex || '?'}`);
        if (chunk.metadata.heading) {
          lines.push(`*${chunk.metadata.heading}*`);
        }
        lines.push('');
        lines.push('```fountain');
        // Truncate long scenes to avoid prompt bloat
        const sceneText = chunk.text.length > 1500
          ? chunk.text.slice(0, 1500) + '\n...'
          : chunk.text;
        lines.push(sceneText);
        lines.push('```');
        break;
      }

      case 'dialogue_excerpt': {
        const character = chunk.metadata.character || 'CHARACTER';
        lines.push(`### ${chunk.movie} — ${character}`);
        lines.push('');
        lines.push('```fountain');
        lines.push(chunk.text);
        lines.push('```');
        break;
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Utility Exports
// ---------------------------------------------------------------------------

export { isVectorStoreAvailable };
