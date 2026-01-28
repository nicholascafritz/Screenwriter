// ---------------------------------------------------------------------------
// Build Script: Preprocess TRIPOD JSONL into static TypeScript reference data
// ---------------------------------------------------------------------------
//
// Reads the raw TRIPOD training data and produces lib/tripod/reference-data.ts
// containing:
//   - Aggregate position statistics for each turning point
//   - Curated film examples for few-shot reference
//   - Save the Cat beat-to-TP mapping
//
// Run:  npx tsx scripts/build-tripod-data.ts
// ---------------------------------------------------------------------------

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types (inline — this script runs standalone)
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJsonl(filepath: string): SynopsisRecord[] {
  const text = fs.readFileSync(filepath, 'utf-8');
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function computeStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    mean: round(mean),
    median: round(percentile(sorted, 50)),
    p10: round(percentile(sorted, 10)),
    p25: round(percentile(sorted, 25)),
    p75: round(percentile(sorted, 75)),
    p90: round(percentile(sorted, 90)),
  };
}

function round(n: number, decimals = 3): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..');
const TRIPOD_DIR = path.join(REPO_ROOT, 'TRIPOD', 'training_data');
const OUTPUT_FILE = path.join(REPO_ROOT, 'lib', 'tripod', 'reference-data.ts');

// Read all records (train + test)
const trainRecords = readJsonl(path.join(TRIPOD_DIR, 'synopses_train.jsonl'));
const testRecords = readJsonl(path.join(TRIPOD_DIR, 'synopses_test.jsonl'));
const allRecords = [...trainRecords, ...testRecords];

console.log(`Loaded ${allRecords.length} records (${trainRecords.length} train + ${testRecords.length} test)`);

// ---------------------------------------------------------------------------
// Compute turning point position statistics
// ---------------------------------------------------------------------------

const TP_KEYS = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'] as const;

const TP_META: Record<string, { name: string; aliases: string[]; savetheCatBeat: string; description: string }> = {
  tp1: {
    name: 'Opportunity',
    aliases: ['Inciting Incident', 'Catalyst'],
    savetheCatBeat: 'Catalyst',
    description: 'The event that disrupts the status quo and sets the story in motion.',
  },
  tp2: {
    name: 'Change of Plans',
    aliases: ['End of Act 1', 'Break into Two'],
    savetheCatBeat: 'Break into Two',
    description: 'The protagonist commits to a new direction. Act 2 begins.',
  },
  tp3: {
    name: 'Point of No Return',
    aliases: ['Midpoint', 'Midpoint Reversal'],
    savetheCatBeat: 'Midpoint',
    description: 'A false victory or defeat that raises stakes and changes the game.',
  },
  tp4: {
    name: 'Major Setback',
    aliases: ['End of Act 2', 'All Is Lost', 'Break into Three'],
    savetheCatBeat: 'Break into Three',
    description: 'The lowest point where everything seems lost. New inspiration emerges.',
  },
  tp5: {
    name: 'Climax',
    aliases: ['Final Confrontation', 'Finale'],
    savetheCatBeat: 'Finale',
    description: 'The protagonist faces the final challenge, applying lessons learned.',
  },
};

const positionsByTp: Record<string, number[]> = {
  tp1: [], tp2: [], tp3: [], tp4: [], tp5: [],
};

for (const record of allRecords) {
  for (const key of TP_KEYS) {
    const tp = record.turning_points[key];
    if (tp.index !== null && record.num_sentences > 0) {
      positionsByTp[key].push(tp.index / record.num_sentences);
    }
  }
}

const norms: Record<string, unknown> = {};
for (const key of TP_KEYS) {
  const positions = positionsByTp[key];
  if (positions.length === 0) continue;

  const stats = computeStats(positions);
  const medianPage = Math.round(stats.median * 120);
  const lowPage = Math.round(stats.p25 * 120);
  const highPage = Math.round(stats.p75 * 120);

  norms[key] = {
    name: TP_META[key].name,
    aliases: TP_META[key].aliases,
    savetheCatBeat: TP_META[key].savetheCatBeat,
    position: stats,
    pageGuide: { median: medianPage, typicalRange: [lowPage, highPage] },
    description: TP_META[key].description,
  };

  console.log(`${key} (${TP_META[key].name}): median=${stats.median}, page ~${medianPage} (${lowPage}-${highPage}), n=${positions.length}`);
}

// ---------------------------------------------------------------------------
// Select reference film examples
// ---------------------------------------------------------------------------

// Target well-known films with diverse genres
const TARGET_FILMS = [
  'Die Hard',
  'Juno (film)',
  'The Silence of the Lambs (film)',
  'Slumdog Millionaire',
  'Panic Room',
  'The Shining (film)',
  'The Truman Show',
  'Titanic (1997 film)',
];

const examples: unknown[] = [];

for (const targetMovie of TARGET_FILMS) {
  // Find the first annotator's record for this film
  const record = allRecords.find((r) => r.movie_name === targetMovie);
  if (!record) {
    console.warn(`  Warning: "${targetMovie}" not found in records`);
    continue;
  }

  const tps: Record<string, unknown> = {};
  let valid = true;
  for (const key of TP_KEYS) {
    const tp = record.turning_points[key];
    if (tp.index === null || !tp.sentence_text) {
      valid = false;
      break;
    }
    tps[key] = {
      index: tp.index,
      pct: round(tp.index / record.num_sentences),
      text: tp.sentence_text,
    };
  }

  if (!valid) {
    console.warn(`  Warning: "${targetMovie}" has missing TP data — skipping`);
    continue;
  }

  examples.push({
    movie: record.movie_name,
    totalSentences: record.num_sentences,
    turningPoints: tps,
  });

  console.log(`  Added example: ${record.movie_name} (${record.num_sentences} sentences)`);
}

// ---------------------------------------------------------------------------
// Generate the output TypeScript file
// ---------------------------------------------------------------------------

const output = `// ---------------------------------------------------------------------------
// TRIPOD Reference Data (GENERATED — do not edit manually)
// ---------------------------------------------------------------------------
//
// Generated by: scripts/build-tripod-data.ts
// Source: TRIPOD dataset (${allRecords.length} annotated records across ${new Set(allRecords.map(r => r.movie_name)).size} films)
//
// Run \`npx tsx scripts/build-tripod-data.ts\` to regenerate.
// ---------------------------------------------------------------------------

import type {
  TurningPointNorm,
  TurningPointKey,
  TripodMovieExample,
} from './types';

// ---------------------------------------------------------------------------
// Turning Point Position Norms
// ---------------------------------------------------------------------------

export const TURNING_POINT_NORMS: Record<TurningPointKey, TurningPointNorm> = ${JSON.stringify(norms, null, 2)} as Record<TurningPointKey, TurningPointNorm>;

// ---------------------------------------------------------------------------
// Reference Film Examples
// ---------------------------------------------------------------------------

export const TRIPOD_EXAMPLES: TripodMovieExample[] = ${JSON.stringify(examples, null, 2)} as TripodMovieExample[];

// ---------------------------------------------------------------------------
// Save the Cat Beat → TRIPOD Turning Point Mapping
// ---------------------------------------------------------------------------

export const BEAT_TO_TP_MAP: Record<string, TurningPointKey | null> = {
  'Opening Image': null,
  'Theme Stated': null,
  'Set-Up': null,
  'Catalyst': 'tp1',
  'Debate': null,
  'Break into Two': 'tp2',
  'B Story': null,
  'Fun and Games': null,
  'Midpoint': 'tp3',
  'Bad Guys Close In': null,
  'All Is Lost': null,
  'Dark Night of the Soul': null,
  'Break into Three': 'tp4',
  'Finale': 'tp5',
  'Final Image': null,
};
`;

fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
console.log(`\nWrote ${OUTPUT_FILE}`);
console.log(`  ${examples.length} reference film examples`);
console.log(`  ${Object.keys(norms).length} turning point norms`);

