// ---------------------------------------------------------------------------
// Screenplay Summary -- Generates compact macro context for AI prompts
// ---------------------------------------------------------------------------
//
// Creates a ~1-2K token summary that is ALWAYS included in context (Tier 1).
// This ensures the AI never loses the "mental model" of the script,
// even under token pressure.
// ---------------------------------------------------------------------------

import { parseFountain } from '@/lib/fountain/parser';
import type { Screenplay, Scene } from '@/lib/fountain/types';
import { useStoryBibleStore } from '@/lib/store/story-bible';
import type { StoryBible, CharacterProfile, BeatSheetEntry } from '@/lib/store/story-bible-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CharacterSummary {
  name: string;
  firstAppearance: string;
  lastAppearance: string;
  sceneCount: number;
  dialogueBlockCount: number;
  /** One-line description from Story Bible, if available */
  description?: string;
  /** Key relationships from Story Bible */
  relationships: string[];
}

export interface PlotThread {
  name: string;
  description: string;
  status: 'setup' | 'developing' | 'climax' | 'resolved';
  relevantScenes: string[];
}

export interface ContinuityFact {
  /** The fact that must not be contradicted */
  fact: string;
  /** Where it was established */
  source: string;
  /** How important is consistency here */
  importance: 'critical' | 'notable' | 'minor';
  /** Category for grouping */
  category: 'character' | 'plot' | 'world' | 'timeline';
}

export interface ActBreak {
  act: number;
  startsAtScene: string;
  approximatePage: number;
  beat?: string;
}

export interface ScreenplayStateSummary {
  // Metadata
  generatedAt: number;
  projectId: string;

  // Structure
  title?: string;
  pageCount: number;
  sceneCount: number;
  estimatedRuntime: string;
  actBreaks: ActBreak[];

  // Characters (sorted by prominence)
  characters: CharacterSummary[];

  // Plot threads from Story Bible
  plotThreads: PlotThread[];

  // Continuity facts (things AI must not contradict)
  continuityFacts: ContinuityFact[];

  // Current story state
  currentAct: number;
  narrativePhase: 'setup' | 'confrontation' | 'resolution';

  // Themes and tone
  genre?: string;
  tone?: string;
  themes: string[];
  logline?: string;
}

// ---------------------------------------------------------------------------
// Summary Generation
// ---------------------------------------------------------------------------

export function generateScreenplaySummary(
  screenplayText: string,
  projectId: string,
): ScreenplayStateSummary {
  const parsed = parseFountain(screenplayText);
  const bible = useStoryBibleStore.getState().bible;

  // Extract title from metadata or first title element
  const title = parsed.titlePage?.Title || extractTitle(parsed);

  // Calculate page count (rough estimate: ~3000 chars per page)
  const pageCount = parsed.pageCount ?? Math.ceil(screenplayText.length / 3000);

  // Extract character appearances
  const characterData = extractCharacterData(parsed);

  // Build character summaries with Story Bible enrichment
  const characters = buildCharacterSummaries(characterData, bible);

  // Infer act breaks
  const actBreaks = inferActBreaks(parsed, bible);

  // Determine current act and narrative phase
  const { currentAct, narrativePhase } = determineNarrativePosition(pageCount, actBreaks);

  // Extract plot threads from beat sheet
  const plotThreads = extractPlotThreads(bible);

  // Build continuity facts
  const continuityFacts = buildContinuityFacts(parsed, bible, characters);

  return {
    generatedAt: Date.now(),
    projectId,
    title,
    pageCount,
    sceneCount: parsed.scenes.length,
    estimatedRuntime: `~${pageCount} minutes`,
    actBreaks,
    characters,
    plotThreads,
    continuityFacts,
    currentAct,
    narrativePhase,
    genre: bible?.genre,
    tone: bible?.tone,
    themes: bible?.themes ?? [],
    logline: bible?.logline,
  };
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function extractTitle(parsed: Screenplay): string | undefined {
  // Check title page first
  if (parsed.titlePage?.Title) {
    return parsed.titlePage.Title;
  }
  return undefined;
}

interface CharacterDataMap {
  [name: string]: {
    scenes: Set<string>;
    dialogueCount: number;
    firstScene: string;
    lastScene: string;
  };
}

function extractCharacterData(parsed: Screenplay): CharacterDataMap {
  const data: CharacterDataMap = {};

  for (const scene of parsed.scenes) {
    let currentCharacter: string | null = null;

    for (const el of scene.elements) {
      if (el.type === 'character') {
        // Strip extensions like (V.O.), (O.S.), (CONT'D)
        currentCharacter = el.text.replace(/\s*\(.*?\)\s*/g, '').trim().toUpperCase();

        if (!data[currentCharacter]) {
          data[currentCharacter] = {
            scenes: new Set(),
            dialogueCount: 0,
            firstScene: scene.heading,
            lastScene: scene.heading,
          };
        }

        data[currentCharacter].scenes.add(scene.heading);
        data[currentCharacter].lastScene = scene.heading;
      } else if (el.type === 'dialogue' && currentCharacter) {
        data[currentCharacter].dialogueCount++;
      } else if (el.type !== 'parenthetical') {
        currentCharacter = null;
      }
    }
  }

  return data;
}

function buildCharacterSummaries(
  data: CharacterDataMap,
  bible?: StoryBible | null,
): CharacterSummary[] {
  const summaries: CharacterSummary[] = [];

  for (const [name, charData] of Object.entries(data)) {
    // Find matching Story Bible entry (case-insensitive)
    const bibleChar = bible?.characters.find(
      (c) => c.name.toUpperCase() === name
    );

    // Build relationships string
    const relationships: string[] = [];
    if (bibleChar?.relationships) {
      for (const rel of bibleChar.relationships) {
        const relatedChar = bible?.characters.find((c) => c.id === rel.characterId);
        if (relatedChar) {
          relationships.push(`${rel.relationship} to ${relatedChar.name}`);
        }
      }
    }

    summaries.push({
      name,
      firstAppearance: charData.firstScene,
      lastAppearance: charData.lastScene,
      sceneCount: charData.scenes.size,
      dialogueBlockCount: charData.dialogueCount,
      description: bibleChar?.description?.slice(0, 150),
      relationships: relationships.slice(0, 3), // Top 3 relationships
    });
  }

  // Sort by prominence (dialogue count)
  summaries.sort((a, b) => b.dialogueBlockCount - a.dialogueBlockCount);

  return summaries;
}

function inferActBreaks(parsed: Screenplay, bible?: StoryBible | null): ActBreak[] {
  const sceneCount = parsed.scenes.length;
  if (sceneCount < 5) return [];

  const breaks: ActBreak[] = [];

  // Check if beat sheet has explicit breaks
  const beatSheet = bible?.beatSheet ?? [];
  const breakIntoTwo = beatSheet.find((b) => b.beat === 'Break into Two');
  const breakIntoThree = beatSheet.find((b) => b.beat === 'Break into Three');

  // Act 1 always starts at beginning
  breaks.push({
    act: 1,
    startsAtScene: parsed.scenes[0]?.heading ?? 'FADE IN',
    approximatePage: 1,
    beat: 'Opening Image',
  });

  // Act 2 (around 25% mark or from beat sheet)
  const act2SceneRef = breakIntoTwo?.sceneRefs?.[0];
  const act2Scene = act2SceneRef
    ? parsed.scenes.find((s) => s.heading.includes(act2SceneRef))?.heading
    : parsed.scenes[Math.floor(sceneCount * 0.25)]?.heading;

  if (act2Scene) {
    const act2Page = Math.floor(parsed.pageCount * 0.25);
    breaks.push({
      act: 2,
      startsAtScene: act2Scene,
      approximatePage: act2Page,
      beat: 'Break into Two',
    });
  }

  // Act 3 (around 75% mark or from beat sheet)
  const act3SceneRef = breakIntoThree?.sceneRefs?.[0];
  const act3Scene = act3SceneRef
    ? parsed.scenes.find((s) => s.heading.includes(act3SceneRef))?.heading
    : parsed.scenes[Math.floor(sceneCount * 0.75)]?.heading;

  if (act3Scene) {
    const act3Page = Math.floor(parsed.pageCount * 0.75);
    breaks.push({
      act: 3,
      startsAtScene: act3Scene,
      approximatePage: act3Page,
      beat: 'Break into Three',
    });
  }

  return breaks;
}

function determineNarrativePosition(
  pageCount: number,
  actBreaks: ActBreak[],
): { currentAct: number; narrativePhase: 'setup' | 'confrontation' | 'resolution' } {
  // Estimate based on page count
  const act2Start = actBreaks.find((b) => b.act === 2)?.approximatePage ?? Math.floor(pageCount * 0.25);
  const act3Start = actBreaks.find((b) => b.act === 3)?.approximatePage ?? Math.floor(pageCount * 0.75);

  // Assume we're at the end of what's written
  if (pageCount < act2Start) {
    return { currentAct: 1, narrativePhase: 'setup' };
  } else if (pageCount < act3Start) {
    return { currentAct: 2, narrativePhase: 'confrontation' };
  } else {
    return { currentAct: 3, narrativePhase: 'resolution' };
  }
}

function extractPlotThreads(bible?: StoryBible | null): PlotThread[] {
  if (!bible?.beatSheet) return [];

  const threads: PlotThread[] = [];

  for (const beat of bible.beatSheet) {
    if (beat.description) {
      let status: PlotThread['status'] = 'setup';

      // Determine status based on beat position
      if (['Opening Image', 'Theme Stated', 'Set-Up', 'Catalyst', 'Debate'].includes(beat.beat)) {
        status = 'setup';
      } else if (['Break into Two', 'B Story', 'Fun and Games', 'Midpoint', 'Bad Guys Close In'].includes(beat.beat)) {
        status = 'developing';
      } else if (['All Is Lost', 'Dark Night of the Soul', 'Break into Three', 'Finale'].includes(beat.beat)) {
        status = beat.completed ? 'resolved' : 'climax';
      } else if (beat.beat === 'Final Image') {
        status = 'resolved';
      }

      threads.push({
        name: beat.beat,
        description: beat.description,
        status: beat.completed ? 'resolved' : status,
        relevantScenes: beat.sceneRefs ?? [],
      });
    }
  }

  return threads;
}

function buildContinuityFacts(
  parsed: Screenplay,
  bible?: StoryBible | null,
  characters?: CharacterSummary[],
): ContinuityFact[] {
  const facts: ContinuityFact[] = [];

  // Character relationships from Story Bible
  if (bible?.characters) {
    for (const char of bible.characters) {
      for (const rel of char.relationships) {
        const relatedChar = bible.characters.find((c) => c.id === rel.characterId);
        if (relatedChar) {
          facts.push({
            fact: `${char.name} is ${rel.relationship} to ${relatedChar.name}`,
            source: 'Story Bible',
            importance: 'critical',
            category: 'character',
          });
        }
      }

      // Character arcs
      if (char.arc) {
        facts.push({
          fact: `${char.name}'s arc: ${char.arc}`,
          source: 'Story Bible',
          importance: 'notable',
          category: 'character',
        });
      }
    }
  }

  // Theme and tone (if established)
  if (bible?.genre) {
    facts.push({
      fact: `Genre is ${bible.genre}`,
      source: 'Story Bible',
      importance: 'notable',
      category: 'world',
    });
  }

  if (bible?.tone) {
    facts.push({
      fact: `Tone is ${bible.tone}`,
      source: 'Story Bible',
      importance: 'notable',
      category: 'world',
    });
  }

  // Character introduction order (important for consistency)
  if (characters && characters.length > 0) {
    const mainChars = characters.slice(0, 5);
    facts.push({
      fact: `Main characters in order of prominence: ${mainChars.map((c) => c.name).join(', ')}`,
      source: 'Screenplay',
      importance: 'minor',
      category: 'character',
    });
  }

  return facts;
}

// ---------------------------------------------------------------------------
// Format for Prompt
// ---------------------------------------------------------------------------

/**
 * Convert summary to compact text for inclusion in system prompt.
 * This is the "macro context" that's always present.
 * Target: ~1000-1500 tokens.
 */
export function formatSummaryForPrompt(summary: ScreenplayStateSummary): string {
  const lines: string[] = [
    '## Screenplay State (Always Current)',
    '',
  ];

  // Title and structure
  if (summary.title) {
    lines.push(`**Title:** ${summary.title}`);
  }
  lines.push(`**Structure:** ${summary.pageCount} pages, ${summary.sceneCount} scenes (~${summary.estimatedRuntime})`);
  lines.push(`**Current Position:** Act ${summary.currentAct} (${summary.narrativePhase})`);

  // Genre/Tone/Logline
  if (summary.genre || summary.tone) {
    lines.push(`**Style:** ${[summary.genre, summary.tone].filter(Boolean).join(' / ')}`);
  }
  if (summary.logline) {
    lines.push(`**Logline:** ${summary.logline}`);
  }
  if (summary.themes.length > 0) {
    lines.push(`**Themes:** ${summary.themes.join(', ')}`);
  }
  lines.push('');

  // Characters (top 8)
  lines.push('**Characters:**');
  const topChars = summary.characters.slice(0, 8);
  for (const char of topChars) {
    let charLine = `- **${char.name}** (${char.sceneCount} scenes)`;
    if (char.description) {
      charLine += ` — ${char.description.slice(0, 80)}`;
    }
    if (char.relationships.length > 0) {
      charLine += ` [${char.relationships[0]}]`;
    }
    lines.push(charLine);
  }
  if (summary.characters.length > 8) {
    lines.push(`  + ${summary.characters.length - 8} more characters`);
  }
  lines.push('');

  // Act breaks
  if (summary.actBreaks.length > 0) {
    lines.push('**Structure:**');
    for (const ab of summary.actBreaks) {
      lines.push(`- Act ${ab.act}: ${ab.startsAtScene} (p.${ab.approximatePage})${ab.beat ? ` — ${ab.beat}` : ''}`);
    }
    lines.push('');
  }

  // Plot threads (active only)
  const activeThreads = summary.plotThreads.filter((t) => t.status !== 'resolved').slice(0, 5);
  if (activeThreads.length > 0) {
    lines.push('**Active Story Beats:**');
    for (const thread of activeThreads) {
      const statusIcon = thread.status === 'setup' ? '○' : thread.status === 'developing' ? '◐' : '●';
      lines.push(`- ${statusIcon} ${thread.name}: ${thread.description.slice(0, 60)}`);
    }
    lines.push('');
  }

  // Continuity facts (critical only)
  const criticalFacts = summary.continuityFacts.filter((f) => f.importance === 'critical');
  if (criticalFacts.length > 0) {
    lines.push('**Continuity (do not contradict):**');
    for (const fact of criticalFacts.slice(0, 10)) {
      lines.push(`- ${fact.fact}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
