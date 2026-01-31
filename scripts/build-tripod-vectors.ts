// ---------------------------------------------------------------------------
// Build Script: Generate Vector Embeddings from TRIPOD Data
// ---------------------------------------------------------------------------
//
// Reads the TRIPOD training data and produces lib/tripod/vector-store.ts
// containing pre-computed embeddings for semantic retrieval of screenplay
// examples during the AI chat flow.
//
// Supports two embedding providers:
//   - OpenAI (text-embedding-3-small) - Set OPENAI_API_KEY
//   - Voyage AI (voyage-3) - Set VOYAGE_API_KEY
//
// Run:  npx tsx scripts/build-tripod-vectors.ts
// ---------------------------------------------------------------------------

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SynopsisRecord {
  movie_name: string;
  annotator_id: number;
  num_sentences: number;
  sentences: string[];
  turning_points: {
    tp1: { index: number | null; label: string; sentence_text: string | null };
    tp2: { index: number | null; label: string; sentence_text: string | null };
    tp3: { index: number | null; label: string; sentence_text: string | null };
    tp4: { index: number | null; label: string; sentence_text: string | null };
    tp5: { index: number | null; label: string; sentence_text: string | null };
  };
}

interface PairedRecord {
  movie_name: string;
  num_scenes: number;
  scenes: Array<{
    scene_index: number;
    text: string;  // The actual field name in the JSONL
    heading?: string;  // May not exist
    content?: string;  // Legacy field name
  }>;
  synopsis_annotations: Array<{
    annotator_id: number;
    turning_points: Record<string, { index: number; sentence_text: string }>;
  }>;
  screenplay_turning_points?: Record<string, number>;
  imdb_metadata?: {
    genres?: string[];
    rating?: number;
    year?: number;
  };
}

type TurningPointKey = 'tp1' | 'tp2' | 'tp3' | 'tp4' | 'tp5';
type ChunkType = 'turning_point' | 'scene' | 'dialogue_excerpt';

interface VectorChunk {
  id: string;
  type: ChunkType;
  movie: string;
  text: string;
  embedding: number[];
  metadata: {
    turningPoint?: TurningPointKey;
    label?: string;
    position?: number;
    sceneIndex?: number;
    heading?: string;
    character?: string;
    genre?: string;
    dialogueDensity?: number;
  };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..');
const TRIPOD_DIR = path.join(REPO_ROOT, 'TRIPOD', 'training_data');
const OUTPUT_FILE = path.join(REPO_ROOT, 'lib', 'tripod', 'vector-store.ts');

// Embedding configuration
const EMBEDDING_DIMENSION = 1536; // text-embedding-3-small default
const BATCH_SIZE = 50; // API batch size (reduced to stay under rate limits)
const MAX_TOKENS_PER_CHUNK = 2000; // Truncate long texts
const MAX_SCENES_PER_MOVIE = 20; // Limit scenes per movie to reduce total chunks
const MAX_DIALOGUE_PER_MOVIE = 15; // Limit dialogue excerpts per movie

// ---------------------------------------------------------------------------
// Embedding Provider Abstraction
// ---------------------------------------------------------------------------

interface EmbeddingProvider {
  name: string;
  embed(texts: string[]): Promise<number[][]>;
}

async function createOpenAIProvider(): Promise<EmbeddingProvider> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  return {
    name: 'OpenAI text-embedding-3-small',
    async embed(texts: string[]): Promise<number[][]> {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.data
        .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
        .map((item: { embedding: number[] }) => item.embedding);
    },
  };
}

async function createVoyageProvider(): Promise<EmbeddingProvider> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error('VOYAGE_API_KEY not set');

  return {
    name: 'Voyage AI voyage-3',
    async embed(texts: string[]): Promise<number[][]> {
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'voyage-3',
          input: texts,
          input_type: 'document',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Voyage API error: ${response.status} ${error}`);
      }

      const data = await response.json();
      return data.data.map((item: { embedding: number[] }) => item.embedding);
    },
  };
}

async function getEmbeddingProvider(): Promise<EmbeddingProvider> {
  if (process.env.OPENAI_API_KEY) {
    return createOpenAIProvider();
  }
  if (process.env.VOYAGE_API_KEY) {
    return createVoyageProvider();
  }
  throw new Error(
    'No embedding API key found. Set OPENAI_API_KEY or VOYAGE_API_KEY'
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJsonl<T>(filepath: string): T[] {
  const text = fs.readFileSync(filepath, 'utf-8');
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function truncateText(text: string, maxChars: number = 8000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '...';
}

function extractCharacterName(line: string): string | null {
  // Match Fountain character lines: ALL CAPS at line start, optionally with (V.O.) etc.
  const match = line.match(/^([A-Z][A-Z\s\-'\.]+?)(?:\s*\([^)]+\))?$/);
  if (match) {
    return match[1].trim();
  }
  return null;
}

function calculateDialogueDensity(sceneText: string): number {
  const lines = sceneText.split('\n').filter((l) => l.trim());
  let dialogueLines = 0;
  let inDialogue = false;

  for (const line of lines) {
    if (extractCharacterName(line)) {
      inDialogue = true;
    } else if (line.match(/^(INT\.|EXT\.|INT\/EXT)/)) {
      inDialogue = false;
    } else if (inDialogue && line.trim() && !line.startsWith('(')) {
      dialogueLines++;
    }
  }

  return lines.length > 0 ? dialogueLines / lines.length : 0;
}

function extractDialogueExcerpts(
  sceneText: string,
  movie: string,
  sceneIndex: number
): Array<{ character: string; text: string; sceneIndex: number }> {
  const excerpts: Array<{
    character: string;
    text: string;
    sceneIndex: number;
  }> = [];
  const lines = sceneText.split('\n');

  let currentCharacter: string | null = null;
  let dialogueBuffer: string[] = [];

  for (const line of lines) {
    const charName = extractCharacterName(line);
    if (charName) {
      // Flush previous dialogue if we have enough
      if (currentCharacter && dialogueBuffer.length >= 2) {
        excerpts.push({
          character: currentCharacter,
          text: dialogueBuffer.join('\n'),
          sceneIndex,
        });
      }
      currentCharacter = charName;
      dialogueBuffer = [];
    } else if (currentCharacter && line.trim() && !line.match(/^(INT\.|EXT\.)/)) {
      dialogueBuffer.push(line.trim());
    }
  }

  // Flush final dialogue
  if (currentCharacter && dialogueBuffer.length >= 2) {
    excerpts.push({
      character: currentCharacter,
      text: dialogueBuffer.join('\n'),
      sceneIndex,
    });
  }

  return excerpts;
}

// ---------------------------------------------------------------------------
// Chunk Generation
// ---------------------------------------------------------------------------

function generateTurningPointChunks(records: SynopsisRecord[]): VectorChunk[] {
  const chunks: VectorChunk[] = [];
  const seenKeys = new Set<string>();
  const TP_KEYS: TurningPointKey[] = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'];

  for (const record of records) {
    for (const tpKey of TP_KEYS) {
      const tp = record.turning_points[tpKey];
      if (tp.index === null || !tp.sentence_text) continue;

      // Create unique key to avoid duplicates across annotators
      const uniqueKey = `${record.movie_name}-${tpKey}-${tp.index}`;
      if (seenKeys.has(uniqueKey)) continue;
      seenKeys.add(uniqueKey);

      // Include context: 1 sentence before and after
      const contextStart = Math.max(0, tp.index - 1);
      const contextEnd = Math.min(record.sentences.length, tp.index + 2);
      const contextText = record.sentences.slice(contextStart, contextEnd).join(' ');

      chunks.push({
        id: `tp-${record.movie_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${tpKey}`,
        type: 'turning_point',
        movie: record.movie_name,
        text: contextText,
        embedding: [], // Will be filled later
        metadata: {
          turningPoint: tpKey,
          label: tp.label,
          position: tp.index / record.num_sentences,
        },
      });
    }
  }

  return chunks;
}

function generateSceneChunks(records: PairedRecord[]): VectorChunk[] {
  const chunks: VectorChunk[] = [];

  for (const record of records) {
    if (!record.scenes || record.scenes.length === 0) continue;

    const genre = record.imdb_metadata?.genres?.[0];
    let movieSceneCount = 0;

    // Prioritize scenes near turning points and with good dialogue density
    const scoredScenes = record.scenes
      .map((scene) => {
        const sceneText = scene.text || scene.content || '';
        const dialogueDensity = calculateDialogueDensity(sceneText);
        const relativePosition = scene.scene_index / record.num_scenes;

        // Score scenes: prefer those with dialogue and near turning points
        let score = sceneText.length > 200 ? 1 : 0;
        score += dialogueDensity > 0.3 ? 2 : 0;

        // Bonus for scenes near typical turning point positions
        const tpPositions = [0.1, 0.25, 0.5, 0.75, 0.9];
        for (const tpPos of tpPositions) {
          if (Math.abs(relativePosition - tpPos) < 0.05) {
            score += 3;
            break;
          }
        }

        return { scene, score, sceneText, dialogueDensity };
      })
      .sort((a, b) => b.score - a.score);

    for (const { scene, sceneText, dialogueDensity } of scoredScenes) {
      if (movieSceneCount >= MAX_SCENES_PER_MOVIE) break;
      if (sceneText.length < 100) continue;

      // Extract heading from first line if it looks like a scene heading
      let heading = scene.heading || '';
      if (!heading) {
        const firstLine = sceneText.split('\n')[0]?.trim() || '';
        if (firstLine.match(/^(INT\.|EXT\.|INT\/EXT)/i)) {
          heading = firstLine;
        }
      }

      const text = truncateText(heading ? `${heading}\n\n${sceneText}` : sceneText);

      // Determine if this scene is near a turning point
      let turningPointProximity: TurningPointKey | undefined;
      if (record.screenplay_turning_points) {
        const relativePosition = scene.scene_index / record.num_scenes;
        for (const [tpKey, tpSceneIdx] of Object.entries(record.screenplay_turning_points)) {
          const tpPosition = tpSceneIdx / record.num_scenes;
          if (Math.abs(relativePosition - tpPosition) < 0.05) {
            turningPointProximity = tpKey as TurningPointKey;
            break;
          }
        }
      }

      chunks.push({
        id: `scene-${record.movie_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${scene.scene_index}`,
        type: 'scene',
        movie: record.movie_name,
        text,
        embedding: [],
        metadata: {
          sceneIndex: scene.scene_index,
          heading: scene.heading,
          genre,
          dialogueDensity,
          turningPoint: turningPointProximity,
        },
      });
      movieSceneCount++;
    }
  }

  return chunks;
}

function generateDialogueChunks(records: PairedRecord[]): VectorChunk[] {
  const chunks: VectorChunk[] = [];
  const seenDialogue = new Set<string>();

  for (const record of records) {
    if (!record.scenes) continue;

    const genre = record.imdb_metadata?.genres?.[0];
    let movieDialogueCount = 0;

    // Collect all dialogue excerpts first, then sort by quality
    const allExcerpts: Array<{
      excerpt: { character: string; text: string; sceneIndex: number };
      score: number;
    }> = [];

    for (const scene of record.scenes) {
      const sceneText = scene.text || scene.content || '';
      const excerpts = extractDialogueExcerpts(
        sceneText,
        record.movie_name,
        scene.scene_index
      );

      for (const excerpt of excerpts) {
        if (excerpt.text.length < 50) continue;
        const fingerprint = `${record.movie_name}-${excerpt.character}-${excerpt.text.slice(0, 100)}`;
        if (seenDialogue.has(fingerprint)) continue;
        seenDialogue.add(fingerprint);

        // Score by length and dialogue richness
        const score = excerpt.text.length + (excerpt.text.split('\n').length * 10);
        allExcerpts.push({ excerpt, score });
      }
    }

    // Sort by score and take top N
    allExcerpts.sort((a, b) => b.score - a.score);

    for (const { excerpt } of allExcerpts) {
      if (movieDialogueCount >= MAX_DIALOGUE_PER_MOVIE) break;

      chunks.push({
        id: `dialogue-${record.movie_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${excerpt.sceneIndex}-${excerpt.character.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        type: 'dialogue_excerpt',
        movie: record.movie_name,
        text: `${excerpt.character}\n${excerpt.text}`,
        embedding: [],
        metadata: {
          character: excerpt.character,
          sceneIndex: excerpt.sceneIndex,
          genre,
        },
      });
      movieDialogueCount++;
    }
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Embedding Generation
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedWithRetry(
  provider: EmbeddingProvider,
  texts: string[],
  maxRetries: number = 5
): Promise<number[][]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await provider.embed(texts);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if it's a rate limit error
      if (errorMessage.includes('429') || errorMessage.includes('rate_limit')) {
        const waitTime = Math.min(60000, 1000 * Math.pow(2, attempt)); // Exponential backoff, max 60s
        console.log(`    Rate limited, waiting ${waitTime / 1000}s before retry ${attempt}/${maxRetries}...`);
        await sleep(waitTime);
        continue;
      }

      throw error;
    }
  }
  throw new Error(`Failed after ${maxRetries} retries`);
}

async function embedChunks(
  chunks: VectorChunk[],
  provider: EmbeddingProvider
): Promise<VectorChunk[]> {
  console.log(`\nEmbedding ${chunks.length} chunks with ${provider.name}...`);

  const embeddedChunks: VectorChunk[] = [];
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);

    const texts = batch.map((c) => truncateText(c.text));

    try {
      const embeddings = await embedWithRetry(provider, texts);

      for (let j = 0; j < batch.length; j++) {
        embeddedChunks.push({
          ...batch[j],
          embedding: embeddings[j],
        });
      }

      // Rate limiting: wait 1s between batches to stay under TPM limits
      if (i + BATCH_SIZE < chunks.length) {
        await sleep(1000);
      }
    } catch (error) {
      console.error(`  Error embedding batch ${batchNum}:`, error);
      throw error;
    }
  }

  return embeddedChunks;
}

// ---------------------------------------------------------------------------
// Output Generation
// ---------------------------------------------------------------------------

interface GeneratedFiles {
  tsFile: string;
  jsonData: string;
}

function generateOutputFile(chunks: VectorChunk[]): GeneratedFiles {
  // Build index
  const chunkIndex: Record<string, number> = {};
  chunks.forEach((chunk, idx) => {
    chunkIndex[chunk.id] = idx;
  });

  // Quantize embeddings to reduce file size (int8)
  const quantizedChunks = chunks.map((chunk) => ({
    ...chunk,
    embedding: chunk.embedding.map((v) => Math.round(v * 127)),
  }));

  // Generate JSON data file
  const jsonData = JSON.stringify({
    chunks: quantizedChunks,
    index: chunkIndex,
  });

  const tsFile = `// ---------------------------------------------------------------------------
// TRIPOD Vector Store (GENERATED — do not edit manually)
// ---------------------------------------------------------------------------
//
// Generated by: scripts/build-tripod-vectors.ts
// Source: TRIPOD dataset
// Total chunks: ${chunks.length}
//
// Run \`npx tsx scripts/build-tripod-vectors.ts\` to regenerate.
// ---------------------------------------------------------------------------

import type { TurningPointKey } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChunkType = 'turning_point' | 'scene' | 'dialogue_excerpt';

export interface VectorChunk {
  id: string;
  type: ChunkType;
  movie: string;
  text: string;
  /** Quantized embedding (int8, multiply by 1/127 to restore floats) */
  embedding: number[];
  metadata: {
    turningPoint?: TurningPointKey;
    label?: string;
    position?: number;
    sceneIndex?: number;
    heading?: string;
    character?: string;
    genre?: string;
    dialogueDensity?: number;
  };
}

// ---------------------------------------------------------------------------
// Vector Store Data
// ---------------------------------------------------------------------------

// The vector data is stored in a separate JSON file to avoid TypeScript
// complexity issues with large literal types. Import the data at runtime.
import vectorData from './vector-data.json';

export const VECTOR_CHUNKS: VectorChunk[] = vectorData.chunks;
export const CHUNK_INDEX: Record<string, number> = vectorData.index;

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export const VECTOR_STORE_STATS = {
  totalChunks: ${chunks.length},
  turningPointChunks: ${chunks.filter((c) => c.type === 'turning_point').length},
  sceneChunks: ${chunks.filter((c) => c.type === 'scene').length},
  dialogueChunks: ${chunks.filter((c) => c.type === 'dialogue_excerpt').length},
  embeddingDimension: ${chunks[0]?.embedding.length || 0},
  generatedAt: '${new Date().toISOString()}',
};
`;

  return { tsFile, jsonData };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(70));
  console.log('TRIPOD Vector Store Builder');
  console.log('='.repeat(70));

  // Get embedding provider
  const provider = await getEmbeddingProvider();
  console.log(`Using embedding provider: ${provider.name}`);

  // Read data
  console.log('\nLoading TRIPOD data...');

  const synopsesTrainPath = path.join(TRIPOD_DIR, 'synopses_train.jsonl');
  const synopsesTestPath = path.join(TRIPOD_DIR, 'synopses_test.jsonl');
  const pairedPath = path.join(TRIPOD_DIR, 'paired_synopsis_screenplay.jsonl');

  const synopsesRecords: SynopsisRecord[] = [
    ...readJsonl<SynopsisRecord>(synopsesTrainPath),
    ...readJsonl<SynopsisRecord>(synopsesTestPath),
  ];

  let pairedRecords: PairedRecord[] = [];
  if (fs.existsSync(pairedPath)) {
    pairedRecords = readJsonl<PairedRecord>(pairedPath);
  } else {
    console.warn('Warning: paired_synopsis_screenplay.jsonl not found, skipping scene/dialogue chunks');
  }

  console.log(`  Loaded ${synopsesRecords.length} synopsis records`);
  console.log(`  Loaded ${pairedRecords.length} paired screenplay records`);

  // Generate chunks
  console.log('\nGenerating chunks...');

  const turningPointChunks = generateTurningPointChunks(synopsesRecords);
  console.log(`  Turning point chunks: ${turningPointChunks.length}`);

  const sceneChunks = generateSceneChunks(pairedRecords);
  console.log(`  Scene chunks: ${sceneChunks.length}`);

  const dialogueChunks = generateDialogueChunks(pairedRecords);
  console.log(`  Dialogue chunks: ${dialogueChunks.length}`);

  const allChunks = [...turningPointChunks, ...sceneChunks, ...dialogueChunks];
  console.log(`  Total chunks: ${allChunks.length}`);

  // Embed chunks
  const embeddedChunks = await embedChunks(allChunks, provider);

  // Generate output
  console.log('\nGenerating output files...');
  const { tsFile, jsonData } = generateOutputFile(embeddedChunks);

  // Write TypeScript file
  fs.writeFileSync(OUTPUT_FILE, tsFile, 'utf-8');
  const tsSizeKB = Math.round(fs.statSync(OUTPUT_FILE).size / 1024);

  // Write JSON data file
  const jsonPath = path.join(path.dirname(OUTPUT_FILE), 'vector-data.json');
  fs.writeFileSync(jsonPath, jsonData, 'utf-8');
  const jsonSizeKB = Math.round(fs.statSync(jsonPath).size / 1024);

  console.log(`\nWrote ${OUTPUT_FILE}`);
  console.log(`  File size: ${tsSizeKB} KB`);
  console.log(`\nWrote ${jsonPath}`);
  console.log(`  File size: ${jsonSizeKB} KB`);
  console.log(`  Total chunks: ${embeddedChunks.length}`);
  console.log('  - Turning points:', embeddedChunks.filter((c) => c.type === 'turning_point').length);
  console.log('  - Scenes:', embeddedChunks.filter((c) => c.type === 'scene').length);
  console.log('  - Dialogue:', embeddedChunks.filter((c) => c.type === 'dialogue_excerpt').length);

  console.log('\n' + '='.repeat(70));
  console.log('Done!');
  console.log('='.repeat(70));
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
