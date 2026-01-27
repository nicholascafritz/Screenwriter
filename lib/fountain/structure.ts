// ---------------------------------------------------------------------------
// Structure Detection Engine
// ---------------------------------------------------------------------------
//
// Detects acts, sequences, and narrative arcs from a parsed screenplay.
// Uses two strategies:
//   1. Explicit -- section headers (#) or centered text matching act patterns.
//   2. Heuristic -- 3-act structure inferred from scene distribution.
//
// Usage:
//   import { detectStructure } from '@/lib/fountain/structure';
//   const structure = detectStructure(screenplay);
// ---------------------------------------------------------------------------

import type {
  Screenplay,
  ScriptElement,
  Act,
  Sequence,
  ScreenplayStructure,
} from './types';

// ---------------------------------------------------------------------------
// Act pattern regexes
// ---------------------------------------------------------------------------

/** Matches "Act One", "Act Two", "ACT I", "ACT 1", etc. */
const ACT_LABEL_RE = /^act\s+(one|two|three|four|five|i{1,3}|iv|v|[1-5])/i;

/** Matches "First Act", "Second Act", etc. */
const ACT_ALT_RE = /^(first|second|third|fourth|fifth)\s+act/i;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detect the high-level structure of a screenplay: acts and sequences.
 *
 * @param screenplay - A parsed Fountain screenplay.
 * @returns A {@link ScreenplayStructure} describing the macro structure.
 */
export function detectStructure(screenplay: Screenplay): ScreenplayStructure {
  const sceneCount = screenplay.scenes.length;

  // -----------------------------------------------------------------------
  // Phase 1: Try explicit act detection
  // -----------------------------------------------------------------------
  const explicitActs = detectExplicitActs(screenplay);

  let acts: Act[];
  let detectionMethod: ScreenplayStructure['detectionMethod'];

  if (explicitActs.length > 0) {
    acts = explicitActs;
    detectionMethod = 'explicit';
  } else if (sceneCount >= 8) {
    // Phase 2: Heuristic 3-act structure
    acts = detectHeuristicActs(screenplay);
    detectionMethod = 'heuristic';
  } else if (sceneCount > 0) {
    // Too few scenes for heuristic splitting -- wrap everything in one act.
    const lastScene = screenplay.scenes[sceneCount - 1];
    acts = [{
      number: 1,
      label: 'Act One',
      source: 'heuristic',
      sceneIndices: screenplay.scenes.map((_, i) => i),
      startLine: screenplay.scenes[0].startLine,
      endLine: lastScene.endLine,
    }];
    detectionMethod = 'heuristic';
  } else {
    acts = [];
    detectionMethod = 'heuristic';
  }

  // -----------------------------------------------------------------------
  // Phase 3: Detect sequences within each act
  // -----------------------------------------------------------------------
  const sequences = detectSequences(screenplay, acts);

  return {
    acts,
    sequences,
    sceneCount,
    detectionMethod,
  };
}

// ---------------------------------------------------------------------------
// Explicit act detection
// ---------------------------------------------------------------------------

/**
 * Look for section elements (depth 1) or centered elements whose text
 * matches act patterns.  Build acts spanning from one marker to the next.
 */
function detectExplicitActs(screenplay: Screenplay): Act[] {
  const markers: { label: string; elementIndex: number; line: number }[] = [];

  for (let i = 0; i < screenplay.elements.length; i++) {
    const el = screenplay.elements[i];

    // Check depth-1 section headers.
    if (el.type === 'section' && el.depth === 1 && isActLabel(el.text)) {
      markers.push({ label: el.text, elementIndex: i, line: el.startLine });
      continue;
    }

    // Check centered elements (common Fountain convention for act breaks).
    if (el.type === 'centered' && isActLabel(el.text)) {
      markers.push({ label: el.text, elementIndex: i, line: el.startLine });
    }
  }

  if (markers.length === 0) return [];

  // Build acts by assigning scenes between markers.
  const acts: Act[] = [];

  for (let m = 0; m < markers.length; m++) {
    const marker = markers[m];
    const nextMarker = markers[m + 1];

    // Determine the line range this act covers.
    const startLine = marker.line;
    const endLine = nextMarker
      ? nextMarker.line - 1
      : lastLineOfScreenplay(screenplay);

    // Find scenes whose start line falls within this act's range.
    const sceneIndices: number[] = [];
    for (let si = 0; si < screenplay.scenes.length; si++) {
      const scene = screenplay.scenes[si];
      if (scene.startLine >= startLine && scene.startLine <= endLine) {
        sceneIndices.push(si);
      }
    }

    acts.push({
      number: m + 1,
      label: marker.label,
      source: 'section',
      sceneIndices,
      startLine,
      endLine,
    });
  }

  return acts;
}

/** Test whether a string looks like an act label. */
function isActLabel(text: string): boolean {
  const trimmed = text.trim();
  return ACT_LABEL_RE.test(trimmed) || ACT_ALT_RE.test(trimmed);
}

// ---------------------------------------------------------------------------
// Heuristic act detection (3-act structure)
// ---------------------------------------------------------------------------

/**
 * Infer a 3-act structure using the classic 25/50/25 scene distribution.
 */
function detectHeuristicActs(screenplay: Screenplay): Act[] {
  const total = screenplay.scenes.length;
  const act1End = Math.round(total * 0.25);
  const act2End = Math.round(total * 0.75);

  const ranges = [
    { start: 0, end: act1End },
    { start: act1End, end: act2End },
    { start: act2End, end: total },
  ];

  const labels = ['Act One', 'Act Two', 'Act Three'];
  const acts: Act[] = [];

  for (let a = 0; a < ranges.length; a++) {
    const range = ranges[a];
    if (range.start >= range.end) continue;

    const sceneIndices: number[] = [];
    for (let i = range.start; i < range.end; i++) {
      sceneIndices.push(i);
    }

    const firstScene = screenplay.scenes[range.start];
    const lastScene = screenplay.scenes[range.end - 1];

    acts.push({
      number: a + 1,
      label: labels[a],
      source: 'heuristic',
      sceneIndices,
      startLine: firstScene.startLine,
      endLine: lastScene.endLine,
    });
  }

  return acts;
}

// ---------------------------------------------------------------------------
// Sequence detection
// ---------------------------------------------------------------------------

/**
 * Within each act, group scenes into sequences of 3-8 based on location
 * clusters and character presence patterns.
 */
function detectSequences(screenplay: Screenplay, acts: Act[]): Sequence[] {
  const sequences: Sequence[] = [];

  for (const act of acts) {
    if (act.sceneIndices.length === 0) continue;

    const actSequences = groupScenesIntoSequences(screenplay, act);
    sequences.push(...actSequences);
  }

  return sequences;
}

/**
 * Group an act's scenes into sequences.
 *
 * Primary signal: consecutive scenes sharing a location form a cluster.
 * Secondary signal: character presence continuity.
 * Fallback: divide evenly into groups of ~5.
 */
function groupScenesIntoSequences(
  screenplay: Screenplay,
  act: Act,
): Sequence[] {
  const indices = act.sceneIndices;
  if (indices.length <= 3) {
    // Too few scenes for multiple sequences -- return one.
    return [buildSequence(screenplay, act, indices, 1)];
  }

  // Try location-based clustering.
  const clusters = clusterByLocation(screenplay, indices);

  if (clusters.length > 1 && clusters.every(c => c.length >= 2 && c.length <= 8)) {
    // Good clusters -- use them.
    return clusters.map((cluster, i) =>
      buildSequence(screenplay, act, cluster, i + 1),
    );
  }

  // Fallback: divide evenly into groups of ~5.
  const targetSize = 5;
  const numGroups = Math.max(1, Math.round(indices.length / targetSize));
  const groupSize = Math.ceil(indices.length / numGroups);
  const groups: number[][] = [];

  for (let i = 0; i < indices.length; i += groupSize) {
    groups.push(indices.slice(i, Math.min(i + groupSize, indices.length)));
  }

  return groups.map((group, i) =>
    buildSequence(screenplay, act, group, i + 1),
  );
}

/**
 * Cluster scene indices by location continuity.  Consecutive scenes that
 * share a location (or part of a location) are grouped together.  When
 * the location changes significantly, a new cluster starts.
 */
function clusterByLocation(
  screenplay: Screenplay,
  indices: number[],
): number[][] {
  if (indices.length === 0) return [];

  const clusters: number[][] = [[indices[0]]];

  for (let i = 1; i < indices.length; i++) {
    const prevScene = screenplay.scenes[indices[i - 1]];
    const currScene = screenplay.scenes[indices[i]];

    const prevLoc = normalizeLocation(prevScene.location);
    const currLoc = normalizeLocation(currScene.location);

    // Same location or one contains the other -- same cluster.
    const currentCluster = clusters[clusters.length - 1];
    if (
      prevLoc === currLoc ||
      prevLoc.includes(currLoc) ||
      currLoc.includes(prevLoc)
    ) {
      // Keep extending current cluster, but cap at 8.
      if (currentCluster.length < 8) {
        currentCluster.push(indices[i]);
        continue;
      }
    }

    // Different location -- start a new cluster.
    clusters.push([indices[i]]);
  }

  // Merge tiny clusters (< 2 scenes) into adjacent ones.
  const merged: number[][] = [];
  for (const cluster of clusters) {
    if (cluster.length < 2 && merged.length > 0 && merged[merged.length - 1].length < 8) {
      merged[merged.length - 1].push(...cluster);
    } else {
      merged.push(cluster);
    }
  }

  return merged;
}

/** Normalise a location string for comparison. */
function normalizeLocation(location: string): string {
  return location.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

/** Build a Sequence from a group of scene indices. */
function buildSequence(
  screenplay: Screenplay,
  act: Act,
  sceneIndices: number[],
  seqNumber: number,
): Sequence {
  // Determine dominant location for the label.
  const locationCounts = new Map<string, number>();
  for (const si of sceneIndices) {
    const loc = screenplay.scenes[si].location;
    if (loc) {
      locationCounts.set(loc, (locationCounts.get(loc) ?? 0) + 1);
    }
  }

  let dominantLocation = '';
  let maxCount = 0;
  for (const [loc, count] of Array.from(locationCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantLocation = loc;
    }
  }

  const label = dominantLocation
    ? `${dominantLocation} Sequence`
    : `Sequence ${seqNumber}`;

  const firstScene = screenplay.scenes[sceneIndices[0]];
  const lastScene = screenplay.scenes[sceneIndices[sceneIndices.length - 1]];

  return {
    number: seqNumber,
    label,
    sceneIndices,
    actNumber: act.number,
    startLine: firstScene.startLine,
    endLine: lastScene.endLine,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the last source line of the screenplay. */
function lastLineOfScreenplay(screenplay: Screenplay): number {
  if (screenplay.scenes.length > 0) {
    return screenplay.scenes[screenplay.scenes.length - 1].endLine;
  }
  if (screenplay.elements.length > 0) {
    return screenplay.elements[screenplay.elements.length - 1].endLine;
  }
  return 1;
}
