// ---------------------------------------------------------------------------
// TRIPOD -- Screenplay Structure Analysis
// ---------------------------------------------------------------------------
//
// Functions for detecting turning points in a user's screenplay and comparing
// them against empirical TRIPOD norms from 84 professional films.
//
// Usage:
//   import { analyzeScreenplayStructure } from '@/lib/tripod/analysis';
//   const comparison = analyzeScreenplayStructure(parsed);
// ---------------------------------------------------------------------------

import type { Screenplay, Scene } from '@/lib/fountain/types';
import type {
  TurningPointKey,
  TurningPointDetection,
  TripodComparison,
  TripodMovieExample,
} from './types';
import { TURNING_POINT_NORMS, TRIPOD_EXAMPLES } from './reference-data';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze a parsed screenplay's structure against TRIPOD turning point norms.
 *
 * For each of the 5 turning points:
 *   1. Computes the expected scene position from TRIPOD statistics
 *   2. Scores scenes in a search window using multiple signals
 *   3. Compares detected vs expected and classifies the deviation
 */
export function analyzeScreenplayStructure(
  parsed: Screenplay,
): TripodComparison {
  const totalScenes = parsed.scenes.length;
  const estimatedPages = Math.max(1, Math.ceil(parsed.pageCount));

  const turningPoints: TurningPointDetection[] = [];

  for (const key of TP_KEYS) {
    const norm = TURNING_POINT_NORMS[key];
    const detection = detectTurningPoint(parsed, key, norm, totalScenes);
    turningPoints.push(detection);
  }

  const referenceExamples = selectRelevantExamples(totalScenes);

  return {
    totalScenes,
    estimatedPages,
    turningPoints,
    referenceExamples,
  };
}

/**
 * Format a TRIPOD comparison into a human-readable markdown report.
 */
export function formatTripodComparison(comparison: TripodComparison): string {
  const lines: string[] = [
    '## Narrative Arc Analysis (TRIPOD-Enhanced)',
    '',
    `**Screenplay**: ${comparison.totalScenes} scenes, ~${comparison.estimatedPages} pages`,
    '',
  ];

  // Turning point comparison table
  lines.push('### Turning Point Positions');
  lines.push('');
  lines.push('| Beat | Expected | Detected | Status |');
  lines.push('|------|----------|----------|--------|');

  for (const tp of comparison.turningPoints) {
    const expectedPct = Math.round(tp.norm.position.median * 100);
    const expectedPage = tp.norm.pageGuide.median;
    const expectedStr = `~${expectedPct}% (p.${expectedPage})`;

    let detectedStr: string;
    if (tp.detectedSceneIdx !== null) {
      const detectedPct = Math.round(((tp.detectedSceneIdx + 1) / comparison.totalScenes) * 100);
      const detectedPage = Math.round((detectedPct / 100) * comparison.estimatedPages);
      detectedStr = `Scene ${tp.detectedSceneIdx + 1}, ${detectedPct}% (p.${detectedPage})`;
    } else {
      detectedStr = 'Not detected';
    }

    lines.push(
      `| **${tp.norm.name}** | ${expectedStr} | ${detectedStr} | ${tp.status} |`,
    );
  }

  lines.push('');

  // Structural diagnostics
  lines.push('### Structural Diagnostics');
  lines.push('');

  for (const tp of comparison.turningPoints) {
    if (tp.status === 'NOT DETECTED') {
      lines.push(
        `- **${tp.norm.name}**: Could not identify a clear ${tp.norm.name.toLowerCase()} beat. ` +
        `In professional screenplays, this typically occurs around page ${tp.norm.pageGuide.median} ` +
        `(${tp.norm.pageGuide.typicalRange[0]}-${tp.norm.pageGuide.typicalRange[1]}). ` +
        `Consider: ${tp.norm.description}`,
      );
    } else if (tp.status === 'EARLY' || tp.status === 'LATE') {
      const direction = tp.status === 'EARLY' ? 'earlier' : 'later';
      lines.push(
        `- **${tp.norm.name}** is ${direction} than typical. ` +
        `Expected around page ${tp.norm.pageGuide.median} ` +
        `(range: ${tp.norm.pageGuide.typicalRange[0]}-${tp.norm.pageGuide.typicalRange[1]}). ` +
        `This isn't necessarily wrong but warrants examination.`,
      );
    } else if (tp.status === 'SLIGHTLY EARLY' || tp.status === 'SLIGHTLY LATE') {
      lines.push(
        `- **${tp.norm.name}** is slightly ${tp.status === 'SLIGHTLY EARLY' ? 'early' : 'late'} ` +
        `but within acceptable range.`,
      );
    }
  }

  // Check act proportions
  const tp2Detected = comparison.turningPoints.find(t => t.key === 'tp2');
  const tp4Detected = comparison.turningPoints.find(t => t.key === 'tp4');
  if (tp2Detected && tp4Detected && tp2Detected.detectedSceneIdx !== null && tp4Detected.detectedSceneIdx !== null) {
    const act1Pct = ((tp2Detected.detectedSceneIdx + 1) / comparison.totalScenes) * 100;
    const act2Pct = ((tp4Detected.detectedSceneIdx - tp2Detected.detectedSceneIdx) / comparison.totalScenes) * 100;
    const act3Pct = 100 - act1Pct - act2Pct;

    lines.push('');
    lines.push(`- **Act proportions**: Act 1 ~${Math.round(act1Pct)}%, Act 2 ~${Math.round(act2Pct)}%, Act 3 ~${Math.round(act3Pct)}%`);
    lines.push(`  (Typical: ~25% / ~50% / ~25%)`);

    if (act2Pct > 60) {
      lines.push(`  Note: Act 2 may be overly long — consider tightening or splitting with a stronger midpoint.`);
    }
    if (act1Pct > 35) {
      lines.push(`  Note: Act 1 is long — the audience may wait too long before the story commits to its direction.`);
    }
    if (act3Pct > 35) {
      lines.push(`  Note: Act 3 is long — consider whether the climax and resolution could be more efficient.`);
    }
  }

  lines.push('');

  // Reference examples
  if (comparison.referenceExamples.length > 0) {
    lines.push('### Reference Films');
    lines.push('');
    lines.push('How professional screenplays handle these turning points:');
    lines.push('');

    for (const example of comparison.referenceExamples.slice(0, 3)) {
      const movie = example.movie.replace(/\s*\(.*?\)\s*$/, ''); // Strip disambiguation
      lines.push(`**${movie}** (${example.totalSentences} synopsis sentences):`);
      for (const key of TP_KEYS) {
        const tp = example.turningPoints[key];
        const norm = TURNING_POINT_NORMS[key];
        lines.push(`  - ${norm.name}: ${Math.round(tp.pct * 100)}% — "${truncate(tp.text, 80)}"`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Turning point detection
// ---------------------------------------------------------------------------

const TP_KEYS: TurningPointKey[] = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'];

/**
 * Detect a specific turning point by scoring scenes in the expected range.
 */
function detectTurningPoint(
  parsed: Screenplay,
  key: TurningPointKey,
  norm: typeof TURNING_POINT_NORMS['tp1'],
  totalScenes: number,
): TurningPointDetection {
  if (totalScenes === 0) {
    return {
      key,
      norm,
      expectedSceneIdx: 0,
      detectedSceneIdx: null,
      detectedSceneHeading: null,
      confidence: 0,
      withinTypicalRange: false,
      withinExtendedRange: false,
      status: 'NOT DETECTED',
    };
  }

  const expectedIdx = Math.round(norm.position.median * totalScenes) - 1;
  const searchStart = Math.max(0, Math.round(norm.position.p10 * totalScenes) - 1);
  const searchEnd = Math.min(totalScenes - 1, Math.round(norm.position.p90 * totalScenes));

  // Score each scene in the search window
  let bestIdx = -1;
  let bestScore = -Infinity;

  for (let i = searchStart; i <= searchEnd; i++) {
    const score = scoreSceneForTurningPoint(parsed, i, key, totalScenes);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  if (bestIdx < 0) {
    return {
      key,
      norm,
      expectedSceneIdx: Math.max(0, expectedIdx),
      detectedSceneIdx: null,
      detectedSceneHeading: null,
      confidence: 0,
      withinTypicalRange: false,
      withinExtendedRange: false,
      status: 'NOT DETECTED',
    };
  }

  const detectedPct = (bestIdx + 1) / totalScenes;
  const withinTypical = detectedPct >= norm.position.p25 && detectedPct <= norm.position.p75;
  const withinExtended = detectedPct >= norm.position.p10 && detectedPct <= norm.position.p90;

  let status: TurningPointDetection['status'];
  if (withinTypical) {
    status = 'WITHIN RANGE';
  } else if (withinExtended && detectedPct < norm.position.median) {
    status = 'SLIGHTLY EARLY';
  } else if (withinExtended && detectedPct >= norm.position.median) {
    status = 'SLIGHTLY LATE';
  } else if (detectedPct < norm.position.p10) {
    status = 'EARLY';
  } else {
    status = 'LATE';
  }

  // Normalize confidence: 0–1 based on how close to expected + score strength
  const positionProximity = 1 - Math.abs(detectedPct - norm.position.median) / 0.5;
  const confidence = Math.max(0, Math.min(1, positionProximity * 0.5 + Math.min(bestScore / 10, 0.5)));

  return {
    key,
    norm,
    expectedSceneIdx: Math.max(0, expectedIdx),
    detectedSceneIdx: bestIdx,
    detectedSceneHeading: parsed.scenes[bestIdx]?.heading ?? null,
    confidence,
    withinTypicalRange: withinTypical,
    withinExtendedRange: withinExtended,
    status,
  };
}

/**
 * Score a scene's likelihood of being a specific turning point.
 *
 * Uses multiple signals rather than crude single-heuristic detection:
 *   - Proximity to expected position (strongest signal)
 *   - New character introductions (TP1, TP2)
 *   - Location changes from previous scene (TP2, TP4 — act breaks)
 *   - Scene density (element count — climactic scenes tend to be dense)
 *   - INT/EXT shifts (location variety spike)
 *   - Dialogue intensity (character count in scene)
 */
function scoreSceneForTurningPoint(
  parsed: Screenplay,
  sceneIdx: number,
  key: TurningPointKey,
  totalScenes: number,
): number {
  const scene = parsed.scenes[sceneIdx];
  if (!scene) return -Infinity;

  const norm = TURNING_POINT_NORMS[key];
  const relativePct = (sceneIdx + 1) / totalScenes;
  let score = 0;

  // 1. Position proximity (strongest signal — Gaussian falloff)
  const positionDiff = Math.abs(relativePct - norm.position.median);
  const positionScore = Math.exp(-positionDiff * positionDiff / (2 * 0.08 * 0.08));
  score += positionScore * 5;

  // 2. Scene density (elements per line — busier scenes are more dramatic)
  const lineSpan = Math.max(1, scene.endLine - scene.startLine + 1);
  const density = scene.elements.length / lineSpan;
  score += Math.min(density * 2, 2);

  // 3. Character count (more characters = higher dramatic stakes)
  score += Math.min(scene.characters.length * 0.3, 1.5);

  // 4. TP-specific signals
  switch (key) {
    case 'tp1': {
      // Inciting incident: new characters appearing, disruption
      if (sceneIdx > 0) {
        const prevChars = new Set(parsed.scenes[sceneIdx - 1].characters);
        const newChars = scene.characters.filter(c => !prevChars.has(c));
        score += newChars.length * 0.5;
      }
      // Action-heavy scenes suggest inciting events
      const actionCount = scene.elements.filter(e => e.type === 'action').length;
      score += Math.min(actionCount * 0.2, 1);
      break;
    }
    case 'tp2': {
      // End of Act 1: location change, commitment signal
      if (sceneIdx > 0) {
        const prevLoc = parsed.scenes[sceneIdx - 1].location;
        if (prevLoc !== scene.location) score += 1;
        if (parsed.scenes[sceneIdx - 1].intExt !== scene.intExt) score += 0.5;
      }
      break;
    }
    case 'tp3': {
      // Midpoint: reversal — look for INT/EXT shift, location change
      if (sceneIdx > 0) {
        const prevLoc = parsed.scenes[sceneIdx - 1].location;
        if (prevLoc !== scene.location) score += 0.8;
      }
      // Longer scenes at the midpoint suggest significant events
      score += Math.min(lineSpan / 50, 1);
      break;
    }
    case 'tp4': {
      // Major setback: location change (act break), dramatic shift
      if (sceneIdx > 0) {
        const prevLoc = parsed.scenes[sceneIdx - 1].location;
        if (prevLoc !== scene.location) score += 1;
      }
      // Dialogue-heavy scenes suggest confrontation
      const dialogueCount = scene.elements.filter(e => e.type === 'dialogue').length;
      score += Math.min(dialogueCount * 0.15, 1);
      break;
    }
    case 'tp5': {
      // Climax: highest intensity scene in the final stretch
      const allElements = scene.elements.length;
      score += Math.min(allElements * 0.1, 2);
      // Dense action + dialogue mix
      const action = scene.elements.filter(e => e.type === 'action').length;
      const dialogue = scene.elements.filter(e => e.type === 'dialogue').length;
      if (action > 0 && dialogue > 0) score += 0.5;
      break;
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// Reference example selection
// ---------------------------------------------------------------------------

/**
 * Select 2-3 reference films with similar scene counts to the user's screenplay.
 */
export function selectRelevantExamples(
  totalScenes: number,
): TripodMovieExample[] {
  // Sort by proximity to the user's scene count (mapped via synopsis sentences)
  // TRIPOD synopses average ~35 sentences; a screenplay has ~40-80 scenes.
  // We use a rough ratio: synopsis_sentences ≈ scenes * 0.6
  const targetSynopsisSentences = Math.round(totalScenes * 0.6);

  const scored = TRIPOD_EXAMPLES.map(example => ({
    example,
    distance: Math.abs(example.totalSentences - targetSynopsisSentences),
  }));

  scored.sort((a, b) => a.distance - b.distance);

  return scored.slice(0, 3).map(s => s.example);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}
