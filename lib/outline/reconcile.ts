// ---------------------------------------------------------------------------
// Outline ↔ Fountain Reconciliation Engine
// ---------------------------------------------------------------------------
//
// After every Fountain parse, this module matches ephemeral parsed scenes
// to persistent OutlineEntry records using heading similarity, scene numbers,
// and positional hints.  New scenes get fresh SceneIds; deleted scenes keep
// their OutlineEntry but lose their fountainRange.
// ---------------------------------------------------------------------------

import type { Scene } from '@/lib/fountain/types';
import type { OutlineEntry } from '@/lib/store/outline-types';
import type { CharacterProfile } from '@/lib/store/story-bible-types';
import { generateSceneId } from './id';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reconcile a list of parsed scenes against the existing Outline entries.
 *
 * Returns a new array of OutlineEntry records:
 * - Matched scenes update their fountainRange and derived fields.
 * - Unmatched parsed scenes become new entries (status: 'drafted').
 * - Unmatched outline entries keep their data but lose their fountainRange
 *   (they become "planned" scenes with no Fountain text).
 *
 * The returned array is ordered: matched/new scenes in Fountain order first,
 * then orphaned outline entries (planned scenes) at the end.
 */
export function reconcile(
  parsedScenes: Scene[],
  existingEntries: OutlineEntry[],
): OutlineEntry[] {
  // Build a pool of available outline entries for matching.
  // We'll remove entries from this pool as they're matched.
  const pool = new Map<string, OutlineEntry>();
  for (const entry of existingEntries) {
    pool.set(entry.id, entry);
  }

  // Track which outline entries got matched.
  const matchedIds = new Set<string>();

  // Result entries in Fountain order.
  const result: OutlineEntry[] = [];

  for (let i = 0; i < parsedScenes.length; i++) {
    const parsed = parsedScenes[i];
    const match = findBestMatch(parsed, i, parsedScenes.length, pool, matchedIds);

    if (match) {
      // Update matched entry with fresh parse data.
      matchedIds.add(match.id);
      result.push(updateEntryFromParse(match, parsed, i));
    } else {
      // New scene — create a fresh OutlineEntry.
      result.push(createEntryFromParse(parsed, i));
    }
  }

  // Append unmatched outline entries (orphaned / planned scenes).
  // They keep all their metadata but lose their Fountain range.
  for (const entry of existingEntries) {
    if (!matchedIds.has(entry.id)) {
      result.push({
        ...entry,
        fountainRange: null,
        // Keep existing status unless it was 'drafted' — if the scene is no
        // longer in the Fountain text, it reverts to 'planned'.
        status: entry.status === 'drafted' ? 'planned' : entry.status,
      });
    }
  }

  // Re-index sortIndex to match final order.
  for (let i = 0; i < result.length; i++) {
    result[i] = { ...result[i], sortIndex: i };
  }

  return result;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/**
 * Find the best matching OutlineEntry for a parsed scene.
 * Returns the entry or null if no acceptable match exists.
 */
function findBestMatch(
  parsed: Scene,
  parsedIndex: number,
  totalParsed: number,
  pool: Map<string, OutlineEntry>,
  alreadyMatched: Set<string>,
): OutlineEntry | null {
  const candidates = Array.from(pool.values()).filter(
    (e) => !alreadyMatched.has(e.id),
  );

  if (candidates.length === 0) return null;

  // Priority 1: Explicit scene number match.
  if (parsed.sceneNumber) {
    const byNumber = candidates.find(
      (e) => e.sceneNumber !== null && e.sceneNumber === parsed.sceneNumber,
    );
    if (byNumber) return byNumber;
  }

  // Priority 2: Exact heading match.
  const exactHeading = candidates.find(
    (e) => normalizeHeading(e.heading) === normalizeHeading(parsed.heading),
  );
  if (exactHeading) return exactHeading;

  // Priority 3: Fuzzy heading match (≥ 0.80 similarity).
  let bestFuzzy: OutlineEntry | null = null;
  let bestFuzzySim = 0;

  for (const candidate of candidates) {
    const sim = headingSimilarity(candidate.heading, parsed.heading);
    if (sim >= 0.80 && sim > bestFuzzySim) {
      bestFuzzySim = sim;
      bestFuzzy = candidate;
    }
  }
  if (bestFuzzy) return bestFuzzy;

  // Priority 4: Position + partial heading match.
  // If the scene is in roughly the same relative position AND has > 50%
  // heading similarity, consider it a match.
  const relativePosition = totalParsed > 1 ? parsedIndex / (totalParsed - 1) : 0;
  const totalExisting = pool.size;

  for (const candidate of candidates) {
    if (candidate.fountainRange === null) continue; // Can't compare position for planned scenes.

    const candidateRelativePos =
      totalExisting > 1 ? candidate.sortIndex / (totalExisting - 1) : 0;
    const positionDelta = Math.abs(relativePosition - candidateRelativePos);

    if (positionDelta <= 0.15) {
      const sim = headingSimilarity(candidate.heading, parsed.heading);
      if (sim >= 0.50) return candidate;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Entry creation / update
// ---------------------------------------------------------------------------

/** Create a new OutlineEntry from a parsed scene. */
function createEntryFromParse(parsed: Scene, sortIndex: number): OutlineEntry {
  return {
    id: generateSceneId(),
    heading: parsed.heading,
    intExt: parsed.intExt ?? '',
    location: parsed.location,
    timeOfDay: parsed.timeOfDay,
    summary: '',
    beatId: null,
    characterIds: [], // Will be linked in Phase 2 (Cast integration)
    sortIndex,
    fountainRange: { startLine: parsed.startLine, endLine: parsed.endLine },
    sceneNumber: parsed.sceneNumber ?? null,
    status: 'drafted',
  };
}

/** Update an existing OutlineEntry with fresh parse data. */
function updateEntryFromParse(
  existing: OutlineEntry,
  parsed: Scene,
  sortIndex: number,
): OutlineEntry {
  return {
    ...existing,
    // Update fields derived from the Fountain text.
    heading: parsed.heading,
    intExt: parsed.intExt ?? existing.intExt,
    location: parsed.location,
    timeOfDay: parsed.timeOfDay,
    fountainRange: { startLine: parsed.startLine, endLine: parsed.endLine },
    sceneNumber: parsed.sceneNumber ?? existing.sceneNumber,
    sortIndex,
    // If it was 'planned' and now has Fountain text, upgrade to 'drafted'.
    status: existing.status === 'planned' ? 'drafted' : existing.status,
  };
}

// ---------------------------------------------------------------------------
// Character linking
// ---------------------------------------------------------------------------

/**
 * Populate `characterIds` on OutlineEntry records by matching parsed scene
 * character names (uppercase) against CharacterProfile names.
 *
 * Called after `reconcile()` to enrich entries with character presence data.
 */
export function linkCharacters(
  entries: OutlineEntry[],
  parsedScenes: Scene[],
  characterProfiles: CharacterProfile[],
): OutlineEntry[] {
  if (characterProfiles.length === 0) return entries;

  // Build a lookup from uppercase character name → profile ID.
  const nameToId = new Map<string, string>();
  for (const profile of characterProfiles) {
    nameToId.set(profile.name.toUpperCase().trim(), profile.id);
  }

  // Build a lookup from startLine → parsed scene characters.
  const lineToCharacters = new Map<number, string[]>();
  for (const scene of parsedScenes) {
    lineToCharacters.set(scene.startLine, scene.characters);
  }

  return entries.map((entry) => {
    if (!entry.fountainRange) return entry;

    const parsedCharacters = lineToCharacters.get(entry.fountainRange.startLine);
    if (!parsedCharacters || parsedCharacters.length === 0) {
      return { ...entry, characterIds: [] };
    }

    const characterIds: string[] = [];
    for (const name of parsedCharacters) {
      const id = nameToId.get(name.toUpperCase().trim());
      if (id) characterIds.push(id);
    }

    return { ...entry, characterIds };
  });
}

// ---------------------------------------------------------------------------
// String similarity
// ---------------------------------------------------------------------------

/** Normalise a heading for comparison: lowercase, trim, collapse whitespace. */
function normalizeHeading(heading: string): string {
  return heading.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Compute similarity between two scene headings.
 * Returns a value between 0 (completely different) and 1 (identical).
 *
 * Uses a combination of:
 * - Token overlap (Jaccard similarity on words)
 * - Location substring match bonus
 */
export function headingSimilarity(a: string, b: string): number {
  const na = normalizeHeading(a);
  const nb = normalizeHeading(b);

  if (na === nb) return 1;
  if (na.length === 0 || nb.length === 0) return 0;

  // Token-based Jaccard similarity.
  const tokensA = na.split(/\s+/);
  const tokensB = new Set(nb.split(/\s+/));
  const setA = new Set(tokensA);

  let intersection = 0;
  setA.forEach((t) => {
    if (tokensB.has(t)) intersection++;
  });

  const union = setA.size + tokensB.size - intersection;
  const jaccard = union > 0 ? intersection / union : 0;

  // Bonus: if the location portion is identical, boost similarity.
  // Location is typically the middle part: "INT. LOCATION - TIME"
  const locA = extractLocation(na);
  const locB = extractLocation(nb);
  const locationBonus = locA && locB && locA === locB ? 0.15 : 0;

  return Math.min(1, jaccard + locationBonus);
}

/**
 * Extract the location portion from a normalised heading.
 * "int. coffee shop - morning" → "coffee shop"
 */
function extractLocation(heading: string): string {
  // Remove INT/EXT prefix.
  const withoutPrefix = heading
    .replace(/^(int\.?\/ext\.?|i\/e\.?|int\.?|ext\.?)\s*/i, '')
    .trim();

  // Remove time-of-day suffix (after last dash).
  const dashIdx = withoutPrefix.lastIndexOf('-');
  if (dashIdx > 0) {
    return withoutPrefix.substring(0, dashIdx).trim();
  }

  return withoutPrefix;
}
