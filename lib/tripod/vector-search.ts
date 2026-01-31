// ---------------------------------------------------------------------------
// TRIPOD Vector Search
// ---------------------------------------------------------------------------
//
// Provides semantic search over pre-computed TRIPOD embeddings.
// Uses cosine similarity for ranking and supports filtering by:
//   - Chunk type (turning_point, scene, dialogue_excerpt)
//   - Turning point label (tp1-tp5)
//   - Genre
//
// ---------------------------------------------------------------------------

import type { TurningPointKey } from './types';
import type { VectorChunk, ChunkType } from './vector-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchOptions {
  /** Filter by chunk types */
  types?: ChunkType[];
  /** Filter by turning point key */
  turningPoint?: TurningPointKey;
  /** Filter by genre (case-insensitive) */
  genre?: string;
  /** Maximum number of results to return */
  topK?: number;
  /** Minimum similarity score (0-1) to include */
  minScore?: number;
}

export interface SearchResult {
  chunk: VectorChunk;
  score: number;
}

// ---------------------------------------------------------------------------
// Vector Math
// ---------------------------------------------------------------------------

/**
 * Compute cosine similarity between two vectors.
 * Handles both float and int8-quantized vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dot / denominator;
}

/**
 * Dequantize an int8-quantized embedding back to floats.
 * The build script multiplies by 127, so we divide by 127.
 */
export function dequantize(quantized: number[]): number[] {
  return quantized.map((v) => v / 127);
}

// ---------------------------------------------------------------------------
// Lazy Loading
// ---------------------------------------------------------------------------

let vectorStore: VectorChunk[] | null = null;
let vectorStorePromise: Promise<VectorChunk[]> | null = null;

/**
 * Lazy-load the vector store to avoid blocking initial page load.
 * The store is cached after first load.
 */
export async function getVectorStore(): Promise<VectorChunk[]> {
  if (vectorStore) return vectorStore;

  if (!vectorStorePromise) {
    vectorStorePromise = import('./vector-store').then((module) => {
      vectorStore = module.VECTOR_CHUNKS;
      return vectorStore;
    });
  }

  return vectorStorePromise;
}

/**
 * Check if the vector store has been generated.
 * Returns false if the store doesn't exist or is empty.
 */
export async function isVectorStoreAvailable(): Promise<boolean> {
  try {
    const store = await getVectorStore();
    return store && store.length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Search Functions
// ---------------------------------------------------------------------------

/**
 * Search the vector store for chunks similar to the query embedding.
 *
 * @param queryEmbedding - The embedding vector for the search query
 * @param options - Search configuration (filters, topK, etc.)
 * @returns Array of search results sorted by similarity score
 */
export async function searchVectors(
  queryEmbedding: number[],
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { types, turningPoint, genre, topK = 5, minScore = 0 } = options;

  const chunks = await getVectorStore();

  // Filter chunks based on options
  let candidates = chunks;

  if (types && types.length > 0) {
    candidates = candidates.filter((c) => types.includes(c.type));
  }

  if (turningPoint) {
    candidates = candidates.filter(
      (c) => c.type === 'turning_point' && c.metadata.turningPoint === turningPoint
    );
  }

  if (genre) {
    const lowerGenre = genre.toLowerCase();
    candidates = candidates.filter(
      (c) => c.metadata.genre?.toLowerCase() === lowerGenre
    );
  }

  if (candidates.length === 0) {
    return [];
  }

  // Score each candidate
  const scored: SearchResult[] = candidates.map((chunk) => {
    // Dequantize the stored embedding for comparison
    const chunkEmbedding = dequantize(chunk.embedding);
    const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
    return { chunk, score };
  });

  // Filter by minimum score and sort
  const filtered = scored.filter((r) => r.score >= minScore);
  filtered.sort((a, b) => b.score - a.score);

  return filtered.slice(0, topK);
}

/**
 * Search for chunks semantically similar to a text query.
 * This is a convenience wrapper that handles query embedding.
 *
 * Note: Requires an embedding function to be provided since we don't
 * want to import the embedding provider at runtime.
 *
 * @param query - The text query
 * @param embedQuery - Function to embed the query text
 * @param options - Search configuration
 */
export async function searchByText(
  query: string,
  embedQuery: (text: string) => Promise<number[]>,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const queryEmbedding = await embedQuery(query);
  return searchVectors(queryEmbedding, options);
}

// ---------------------------------------------------------------------------
// Retrieval Helpers
// ---------------------------------------------------------------------------

/**
 * Get turning point examples from the vector store.
 * Returns chunks for a specific turning point, optionally filtered by genre.
 */
export async function getTurningPointExamples(
  turningPoint: TurningPointKey,
  options: { genre?: string; topK?: number } = {}
): Promise<VectorChunk[]> {
  const chunks = await getVectorStore();

  let candidates = chunks.filter(
    (c) => c.type === 'turning_point' && c.metadata.turningPoint === turningPoint
  );

  if (options.genre) {
    const lowerGenre = options.genre.toLowerCase();
    candidates = candidates.filter(
      (c) => c.metadata.genre?.toLowerCase() === lowerGenre
    );
  }

  // Return topK random samples for variety
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, options.topK || 3);
}

/**
 * Get scene examples filtered by various criteria.
 */
export async function getSceneExamples(options: {
  genre?: string;
  nearTurningPoint?: TurningPointKey;
  highDialogue?: boolean;
  topK?: number;
}): Promise<VectorChunk[]> {
  const chunks = await getVectorStore();

  let candidates = chunks.filter((c) => c.type === 'scene');

  if (options.genre) {
    const lowerGenre = options.genre.toLowerCase();
    candidates = candidates.filter(
      (c) => c.metadata.genre?.toLowerCase() === lowerGenre
    );
  }

  if (options.nearTurningPoint) {
    candidates = candidates.filter(
      (c) => c.metadata.turningPoint === options.nearTurningPoint
    );
  }

  if (options.highDialogue) {
    candidates = candidates.filter(
      (c) => (c.metadata.dialogueDensity || 0) > 0.5
    );
  }

  // Return topK random samples
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, options.topK || 3);
}

/**
 * Get dialogue examples, optionally filtered by genre.
 */
export async function getDialogueExamples(options: {
  genre?: string;
  topK?: number;
}): Promise<VectorChunk[]> {
  const chunks = await getVectorStore();

  let candidates = chunks.filter((c) => c.type === 'dialogue_excerpt');

  if (options.genre) {
    const lowerGenre = options.genre.toLowerCase();
    candidates = candidates.filter(
      (c) => c.metadata.genre?.toLowerCase() === lowerGenre
    );
  }

  // Return topK random samples
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, options.topK || 3);
}

/**
 * Get action line examples for visual/lean prose writing.
 */
export async function getActionLineExamples(options: {
  genre?: string;
  topK?: number;
}): Promise<VectorChunk[]> {
  const chunks = await getVectorStore();

  let candidates = chunks.filter((c) => c.type === 'action_line');

  if (options.genre) {
    const lowerGenre = options.genre.toLowerCase();
    candidates = candidates.filter(
      (c) => c.metadata.genre?.toLowerCase() === lowerGenre
    );
  }

  // Return topK random samples
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, options.topK || 3);
}

/**
 * Get beat examples (Save the Cat structure demonstrations).
 */
export async function getBeatExamples(options: {
  beat?: string;
  topK?: number;
}): Promise<VectorChunk[]> {
  const chunks = await getVectorStore();

  let candidates = chunks.filter((c) => c.type === 'beat_example');

  if (options.beat) {
    const lowerBeat = options.beat.toLowerCase();
    candidates = candidates.filter(
      (c) => c.metadata.beatName?.toLowerCase().includes(lowerBeat)
    );
  }

  // Return topK random samples
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, options.topK || 3);
}

/**
 * Get voice transformation examples (before/after style pairs).
 */
export async function getVoiceTransformationExamples(options: {
  voiceId?: string;
  transformationType?: string;
  topK?: number;
}): Promise<VectorChunk[]> {
  const chunks = await getVectorStore();

  let candidates = chunks.filter((c) => c.type === 'voice_transformation');

  if (options.voiceId) {
    candidates = candidates.filter(
      (c) => c.metadata.voiceId === options.voiceId
    );
  }

  if (options.transformationType) {
    candidates = candidates.filter(
      (c) => c.metadata.transformationType === options.transformationType
    );
  }

  // Return topK random samples
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, options.topK || 3);
}

/**
 * Get subtext examples (on-the-nose vs subtext pairs).
 */
export async function getSubtextExamples(options: {
  genre?: string;
  topK?: number;
}): Promise<VectorChunk[]> {
  const chunks = await getVectorStore();

  let candidates = chunks.filter((c) => c.type === 'subtext_example');

  if (options.genre) {
    const lowerGenre = options.genre.toLowerCase();
    candidates = candidates.filter(
      (c) => c.metadata.genre?.toLowerCase() === lowerGenre
    );
  }

  // Return topK random samples
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, options.topK || 3);
}

/**
 * Get tool pattern examples for workflow demonstrations.
 */
export async function getToolPatternExamples(options: {
  topK?: number;
}): Promise<VectorChunk[]> {
  const chunks = await getVectorStore();

  const candidates = chunks.filter((c) => c.type === 'tool_pattern');

  // Return topK random samples
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, options.topK || 3);
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

/**
 * Get statistics about the loaded vector store.
 */
export async function getVectorStoreStats(): Promise<{
  total: number;
  byType: Record<ChunkType, number>;
  byGenre: Record<string, number>;
  movies: string[];
}> {
  const chunks = await getVectorStore();

  const byType: Record<ChunkType, number> = {
    turning_point: 0,
    scene: 0,
    dialogue_excerpt: 0,
    // New chunk types (will be populated when vectors are regenerated)
    beat_example: 0,
    voice_transformation: 0,
    tool_pattern: 0,
    action_line: 0,
    subtext_example: 0,
  };

  const byGenre: Record<string, number> = {};
  const movies = new Set<string>();

  for (const chunk of chunks) {
    byType[chunk.type]++;

    if (chunk.metadata.genre) {
      byGenre[chunk.metadata.genre] = (byGenre[chunk.metadata.genre] || 0) + 1;
    }

    movies.add(chunk.movie);
  }

  return {
    total: chunks.length,
    byType,
    byGenre,
    movies: Array.from(movies).sort(),
  };
}
