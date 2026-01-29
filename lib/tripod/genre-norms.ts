// ---------------------------------------------------------------------------
// TRIPOD Genre-Specific Structural Norms
// ---------------------------------------------------------------------------
//
// Genre-specific structural data showing how turning point positions vary
// across different film genres. This supplements the aggregate TRIPOD data
// with genre-aware recommendations.
//
// Usage:
//   import { GENRE_NORMS, getGenreNorm } from '@/lib/tripod/genre-norms';
// ---------------------------------------------------------------------------

import type { TurningPointKey } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenreTurningPoint {
  /** Position as percentage through screenplay (0-1). */
  median: number;
  /** Typical range as percentages [low, high]. */
  typicalRange: [number, number];
  /** Optional genre-specific note about this turning point. */
  notes?: string;
}

export interface GenreNorm {
  /** Genre name (e.g., "Horror", "Romantic Comedy"). */
  genre: string;
  /** Number of films analyzed for this genre. */
  sampleSize: number;
  /** Turning point position data. */
  turningPoints: Record<TurningPointKey, GenreTurningPoint>;
  /** Genre-specific structural patterns and conventions. */
  structuralNotes: string[];
  /** Example films that exemplify this genre's structure. */
  exampleFilms: string[];
}

// ---------------------------------------------------------------------------
// Genre Norms Data
// ---------------------------------------------------------------------------

export const GENRE_NORMS: GenreNorm[] = [
  {
    genre: 'Horror',
    sampleSize: 12,
    turningPoints: {
      tp1: {
        median: 0.08,
        typicalRange: [0.04, 0.12],
        notes: 'Horror often front-loads the catalyst — the threat appears or is hinted at early',
      },
      tp2: {
        median: 0.25,
        typicalRange: [0.20, 0.32],
        notes: 'Characters commit to investigating or confronting the threat',
      },
      tp3: {
        median: 0.48,
        typicalRange: [0.42, 0.55],
        notes: 'Midpoint often involves first direct confrontation with threat or major death',
      },
      tp4: {
        median: 0.75,
        typicalRange: [0.70, 0.82],
        notes: 'All Is Lost typically involves major character death or seeming defeat',
      },
      tp5: {
        median: 0.88,
        typicalRange: [0.82, 0.94],
        notes: 'Final confrontation; false endings common',
      },
    },
    structuralNotes: [
      'Opening 10 pages typically establish normalcy before disruption',
      'Body count often escalates through Act 2',
      'Final survivor typically identified or hinted at by midpoint',
      'False endings are genre convention — the threat often returns',
      'Isolation (physical or social) increases tension',
      'Rules of the threat should be established by midpoint',
    ],
    exampleFilms: ['Get Out', 'Hereditary', 'The Shining', 'A Quiet Place'],
  },

  {
    genre: 'Romantic Comedy',
    sampleSize: 15,
    turningPoints: {
      tp1: {
        median: 0.12,
        typicalRange: [0.08, 0.17],
        notes: 'Meet-cute or inciting romantic event',
      },
      tp2: {
        median: 0.28,
        typicalRange: [0.22, 0.35],
        notes: 'Characters commit to relationship (even if reluctantly)',
      },
      tp3: {
        median: 0.52,
        typicalRange: [0.48, 0.58],
        notes: 'Often the "falling in love" montage endpoint or first intimacy',
      },
      tp4: {
        median: 0.78,
        typicalRange: [0.72, 0.85],
        notes: 'The Big Misunderstanding, Lie Revealed, or external obstacle',
      },
      tp5: {
        median: 0.92,
        typicalRange: [0.88, 0.97],
        notes: 'Grand gesture and reconciliation',
      },
    },
    structuralNotes: [
      'B-story often involves friends/family providing comic relief and wisdom',
      'Act 2A is "fun and games" of falling in love',
      'Act 2B complications should come from character flaws, not contrivance',
      'The Dark Night of the Soul should feel earned, not manufactured',
      'Airport/wedding chase clichés should be subverted if used',
      'Theme is often articulated by a supporting character',
    ],
    exampleFilms: ['When Harry Met Sally', 'Bridesmaids', 'Crazy Rich Asians', 'The Proposal'],
  },

  {
    genre: 'Thriller',
    sampleSize: 18,
    turningPoints: {
      tp1: {
        median: 0.10,
        typicalRange: [0.06, 0.15],
        notes: 'Inciting incident that introduces the threat or mystery',
      },
      tp2: {
        median: 0.26,
        typicalRange: [0.20, 0.33],
        notes: 'Protagonist commits to investigation or confrontation',
      },
      tp3: {
        median: 0.50,
        typicalRange: [0.45, 0.56],
        notes: 'Major revelation that recontextualizes the threat',
      },
      tp4: {
        median: 0.76,
        typicalRange: [0.70, 0.82],
        notes: 'Protagonist trapped, betrayed, or resources exhausted',
      },
      tp5: {
        median: 0.90,
        typicalRange: [0.85, 0.95],
        notes: 'Final confrontation with antagonist',
      },
    },
    structuralNotes: [
      'Information revelation drives plot more than action',
      'Antagonist should be proactive, not reactive',
      'Ticking clock often introduced at midpoint to accelerate pacing',
      'Twist endings require planted setup in Act 1',
      'Red herrings should be plausible alternatives, not cheap tricks',
      'The protagonist often discovers they were wrong about something fundamental',
    ],
    exampleFilms: ['Gone Girl', 'Panic Room', 'Se7en', 'The Silence of the Lambs'],
  },

  {
    genre: 'Action',
    sampleSize: 14,
    turningPoints: {
      tp1: {
        median: 0.09,
        typicalRange: [0.05, 0.14],
        notes: 'Attack, heist, or mission that launches the story',
      },
      tp2: {
        median: 0.24,
        typicalRange: [0.18, 0.30],
        notes: 'Hero commits to the mission or pursuit',
      },
      tp3: {
        median: 0.50,
        typicalRange: [0.45, 0.55],
        notes: 'Major setback or revelation that raises stakes',
      },
      tp4: {
        median: 0.75,
        typicalRange: [0.68, 0.82],
        notes: 'All seems lost — hero at lowest point',
      },
      tp5: {
        median: 0.88,
        typicalRange: [0.82, 0.94],
        notes: 'Final battle or confrontation',
      },
    },
    structuralNotes: [
      'Set pieces should escalate in scale and stakes',
      'Villain should be established as a credible threat early',
      'Each act should have at least one major action sequence',
      'Character development happens between action beats, not during them',
      'The ticking clock creates urgency — deadline should be clear',
      'Hero\'s skills established in Act 1 pay off in Act 3',
    ],
    exampleFilms: ['Die Hard', 'Mad Max: Fury Road', 'John Wick', 'Mission: Impossible - Fallout'],
  },

  {
    genre: 'Drama',
    sampleSize: 20,
    turningPoints: {
      tp1: {
        median: 0.14,
        typicalRange: [0.10, 0.20],
        notes: 'Event that disrupts protagonist\'s status quo',
      },
      tp2: {
        median: 0.30,
        typicalRange: [0.25, 0.38],
        notes: 'Protagonist commits to change or new direction',
      },
      tp3: {
        median: 0.53,
        typicalRange: [0.48, 0.60],
        notes: 'Moment of false hope or false defeat that shifts the dramatic question',
      },
      tp4: {
        median: 0.78,
        typicalRange: [0.72, 0.85],
        notes: 'Crisis point — protagonist faces their deepest fear or flaw',
      },
      tp5: {
        median: 0.90,
        typicalRange: [0.85, 0.96],
        notes: 'Resolution — character transformation completed',
      },
    },
    structuralNotes: [
      'Internal conflict is as important as external conflict',
      'Theme should be expressed through character choices, not dialogue',
      'Supporting characters often represent alternative paths',
      'The protagonist\'s flaw should be established in Act 1 and overcome in Act 3',
      'Quiet moments are as important as dramatic ones',
      'Resolution can be ambiguous — not everything needs to be resolved',
    ],
    exampleFilms: ['Manchester by the Sea', 'The Shawshank Redemption', 'Moonlight', 'Marriage Story'],
  },

  {
    genre: 'Science Fiction',
    sampleSize: 12,
    turningPoints: {
      tp1: {
        median: 0.12,
        typicalRange: [0.08, 0.18],
        notes: 'Discovery or event that introduces the speculative element',
      },
      tp2: {
        median: 0.28,
        typicalRange: [0.22, 0.35],
        notes: 'Protagonist commits to exploring or confronting the new reality',
      },
      tp3: {
        median: 0.52,
        typicalRange: [0.46, 0.58],
        notes: 'Major revelation about the nature of the world or threat',
      },
      tp4: {
        median: 0.76,
        typicalRange: [0.70, 0.84],
        notes: 'Consequences of the speculative element become personal',
      },
      tp5: {
        median: 0.90,
        typicalRange: [0.84, 0.96],
        notes: 'Resolution that often comments on present-day humanity',
      },
    },
    structuralNotes: [
      'World-building should be integrated into story, not exposition dumps',
      'The "rules" of the speculative element should be clear by end of Act 1',
      'Technology/concept should illuminate something about human nature',
      'Ground high-concept with relatable emotional stakes',
      'Visual storytelling is crucial — show, don\'t tell',
      'The best sci-fi uses the future to comment on the present',
    ],
    exampleFilms: ['Arrival', 'Ex Machina', 'Blade Runner 2049', 'Interstellar'],
  },

  {
    genre: 'Comedy',
    sampleSize: 16,
    turningPoints: {
      tp1: {
        median: 0.11,
        typicalRange: [0.07, 0.16],
        notes: 'Inciting incident often involves embarrassment or opportunity',
      },
      tp2: {
        median: 0.26,
        typicalRange: [0.20, 0.32],
        notes: 'Protagonist commits to plan or situation',
      },
      tp3: {
        median: 0.50,
        typicalRange: [0.45, 0.56],
        notes: 'Plans go wrong or escalate beyond control',
      },
      tp4: {
        median: 0.76,
        typicalRange: [0.70, 0.82],
        notes: 'Everything falls apart — often the most embarrassing moment',
      },
      tp5: {
        median: 0.90,
        typicalRange: [0.85, 0.95],
        notes: 'Resolution with lessons learned (or gleefully ignored)',
      },
    },
    structuralNotes: [
      'Setups must pay off — audiences remember every plant',
      'Escalation is essential — each scene should top the last',
      'Character flaws drive comedy — don\'t make protagonists too sympathetic too fast',
      'The "worst thing that could happen" should happen, then get worse',
      'Supporting characters can be broader than protagonists',
      'Leave room for improv — some of the best moments are discovered',
    ],
    exampleFilms: ['Bridesmaids', 'The Grand Budapest Hotel', 'Superbad', 'The Hangover'],
  },
];

// ---------------------------------------------------------------------------
// Lookup Functions
// ---------------------------------------------------------------------------

/**
 * Find genre-specific structural norms by genre name.
 *
 * @param genre - The genre to look up (case-insensitive)
 * @returns The genre norms or undefined if not found
 */
export function getGenreNorm(genre: string): GenreNorm | undefined {
  const normalized = genre.toLowerCase().trim();
  return GENRE_NORMS.find(
    (g) => g.genre.toLowerCase() === normalized ||
           g.genre.toLowerCase().includes(normalized) ||
           normalized.includes(g.genre.toLowerCase())
  );
}

/**
 * Get all available genre names.
 */
export function getAvailableGenres(): string[] {
  return GENRE_NORMS.map((g) => g.genre);
}

/**
 * Build a system-prompt section with genre-specific structural guidance.
 *
 * @param genre - The genre to generate guidance for
 * @returns Formatted prompt section or empty string if genre not found
 */
export function buildGenreStructurePrompt(genre: string): string {
  const norm = getGenreNorm(genre);
  if (!norm) return '';

  const lines: string[] = [
    `## ${norm.genre} Structure Reference`,
    '',
    `Based on analysis of ${norm.sampleSize} professional ${norm.genre.toLowerCase()} films:`,
    '',
    '### Turning Point Positions',
    '',
  ];

  const tpNames: Record<TurningPointKey, string> = {
    tp1: 'Catalyst/Opportunity',
    tp2: 'Break into Two',
    tp3: 'Midpoint',
    tp4: 'Break into Three/All Is Lost',
    tp5: 'Climax/Finale',
  };

  const tpKeys: TurningPointKey[] = ['tp1', 'tp2', 'tp3', 'tp4', 'tp5'];
  for (const key of tpKeys) {
    const tp = norm.turningPoints[key];
    const pctRange = `${Math.round(tp.typicalRange[0] * 100)}%-${Math.round(tp.typicalRange[1] * 100)}%`;
    lines.push(`- **${tpNames[key]}**: ~${Math.round(tp.median * 100)}% (range: ${pctRange})`);
    if (tp.notes) {
      lines.push(`  - ${tp.notes}`);
    }
  }

  lines.push('');
  lines.push('### Genre Conventions');
  lines.push('');
  for (const note of norm.structuralNotes) {
    lines.push(`- ${note}`);
  }

  lines.push('');
  lines.push('### Reference Films');
  lines.push('');
  lines.push(norm.exampleFilms.join(', '));

  return lines.join('\n');
}
