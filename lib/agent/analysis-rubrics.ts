// ---------------------------------------------------------------------------
// AI Agent -- Analysis Rubrics
// ---------------------------------------------------------------------------
//
// Evaluation criteria and sample outputs for different types of screenplay
// analysis. These rubrics define what "good analysis" looks like and help
// steer the AI toward specific, actionable, data-grounded feedback.
//
// Usage:
//   import { ANALYSIS_RUBRICS, buildAnalysisRubricPrompt } from '@/lib/agent/analysis-rubrics';
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalysisCriterion {
  /** Name of the quality criterion. */
  name: string;
  /** Weight (0-1) indicating relative importance. */
  weight: number;
  /** Description of what this criterion evaluates. */
  description: string;
  /** Examples showing quality levels. */
  examples: {
    excellent: string;
    adequate: string;
    poor: string;
  };
}

export interface AnalysisRubric {
  /** Type of analysis (e.g., 'structural-analysis'). */
  type: string;
  /** Brief description of this analysis type. */
  description: string;
  /** Quality criteria with weights. */
  criteria: AnalysisCriterion[];
  /** Sample output demonstrating ideal analysis format. */
  sampleOutput: string;
}

// ---------------------------------------------------------------------------
// Rubric Data
// ---------------------------------------------------------------------------

export const ANALYSIS_RUBRICS: AnalysisRubric[] = [
  {
    type: 'structural-analysis',
    description: 'Evaluation of screenplay structure against professional norms',
    criteria: [
      {
        name: 'Data Grounding',
        weight: 0.3,
        description: 'Uses specific page numbers, percentages, and TRIPOD data',
        examples: {
          excellent: '"Your midpoint lands at page 72 (60% through), outside the typical range of 45-55%. In Die Hard, the midpoint hits at 43%."',
          adequate: '"Your midpoint feels late. Professional films usually hit it earlier."',
          poor: '"The structure seems off."',
        },
      },
      {
        name: 'Diagnostic Specificity',
        weight: 0.25,
        description: 'Identifies specific structural issues, not vague problems',
        examples: {
          excellent: '"The Catalyst (Jake losing his job, p.18) doesn\'t create a clear dramatic question. We know what he lost, but not what he\'s now pursuing."',
          adequate: '"The first act setup is unclear."',
          poor: '"Something feels wrong in the beginning."',
        },
      },
      {
        name: 'Actionable Prescription',
        weight: 0.25,
        description: 'Provides specific fixes, not just diagnosis',
        examples: {
          excellent: '"Move the revelation scene (p.72) to p.55-60. This requires: (1) cutting the redundant office scenes p.58-65, (2) adding a new tension beat after the revelation, (3) adjusting Maria\'s dialogue on p.78 which currently references the old timing."',
          adequate: '"Try moving the midpoint earlier."',
          poor: '"Fix the pacing."',
        },
      },
      {
        name: 'Comparative Context',
        weight: 0.2,
        description: 'References comparable films or genre conventions',
        examples: {
          excellent: '"In horror films, the All Is Lost moment typically involves a major death (see Hereditary p.82, Get Out p.76). Yours has a setback but no loss — consider whether this moment needs more weight."',
          adequate: '"Other horror films usually have higher stakes here."',
          poor: '"Needs more tension."',
        },
      },
    ],
    sampleOutput: `## Structural Analysis

**Overview**: Your screenplay runs 112 pages with turning points at: Catalyst p.14, Break into Two p.28, Midpoint p.72, Break into Three p.88, Finale p.105.

**Diagnosis**: Your Midpoint is late (p.72 = 64%, typical range 45-55%). This creates a 44-page Act 2A that drags. In comparable thrillers:
- Panic Room: Midpoint at 50%
- Die Hard: Midpoint at 43%

**The Consequence**: Your protagonist is reactive for too long. Jake is responding to events from p.28-72 without agency shift.

**Prescription**:
1. Move the warehouse revelation (currently p.72) to p.58
2. Cut or compress the three investigation scenes p.45-60 (redundant)
3. Add a new complication at p.70 that escalates from the earlier revelation
4. Adjust Sarah's "I knew all along" line (p.78) — now lands too soon after the reveal

**Estimated Impact**: This should tighten Act 2A to ~30 pages and give Jake agency by page 60.`,
  },

  {
    type: 'character-voice-analysis',
    description: 'Evaluation of dialogue distinctiveness and character voice',
    criteria: [
      {
        name: 'Quantitative Evidence',
        weight: 0.25,
        description: 'Uses dialogue statistics and specific line citations',
        examples: {
          excellent: '"Jake and Maria share 73% vocabulary overlap. Both use \'absolutely\' 8+ times, both average 12-word sentences. Compare their lines on p.34 — swap the character names and you can\'t tell the difference."',
          adequate: '"Jake and Maria sound similar."',
          poor: '"The dialogue needs work."',
        },
      },
      {
        name: 'Character Psychology',
        weight: 0.25,
        description: 'Connects speech patterns to character background and motivation',
        examples: {
          excellent: '"Jake\'s military background should show in his speech — clipped, efficient, avoiding emotional language. Instead he speaks in complete, flowing sentences like a therapist."',
          adequate: '"Jake should sound more like a soldier."',
          poor: '"Jake\'s dialogue doesn\'t fit his character."',
        },
      },
      {
        name: 'Specific Rewrites',
        weight: 0.3,
        description: 'Provides concrete alternative dialogue, not just description',
        examples: {
          excellent: '"Current: \'The thing is, I honestly don\'t think we can trust him anymore.\' → Suggested: \'Can\'t trust him. Move on.\' (14 words → 5 words, removes hedging, adds command structure)"',
          adequate: '"Make Jake\'s lines shorter."',
          poor: '"Improve the dialogue."',
        },
      },
      {
        name: 'Consistency Check',
        weight: 0.2,
        description: 'Notes when characters break voice and whether it\'s intentional',
        examples: {
          excellent: '"On p.67, Jake suddenly uses a four-line philosophical speech — this breaks his established pattern. If intentional (emotional breakthrough), set it up. If not, trim to one line."',
          adequate: '"Jake sounds different in this scene."',
          poor: '"Something\'s off in Act 2."',
        },
      },
    ],
    sampleOutput: `## Character Voice Analysis

**Characters Analyzed**: Jake, Maria, Detective Cole

**Distinctiveness Matrix**:
| Pair | Overlap | Assessment |
|------|---------|------------|
| Jake/Maria | 73% | PROBLEM - nearly identical |
| Jake/Cole | 31% | Good distinction |
| Maria/Cole | 28% | Good distinction |

**Jake vs Maria - Specific Issues**:
- Both use complete sentences with similar rhythm (avg 11-13 words)
- Neither uses contractions consistently
- Both overuse "absolutely", "honestly", "the thing is"

**Example (p.34)**:
JAKE: "The thing is, I honestly don't think we can trust him anymore."
MARIA: "Honestly, the thing that worries me is whether we can trust anyone."

**Prescription**:
- **Jake**: Give him clipped, incomplete thoughts. Ex-military background means efficiency.
  - Rewrite p.34: "Can't trust him. Move on."
  - Remove hedging words: "honestly", "I think", "the thing is"
  - Average target: 6-8 words per line

- **Maria**: She's a lawyer — give her longer, rhetorical constructions.
  - Rewrite p.34: "The question isn't whether we trust him. It's whether trust is even a variable we can afford to consider."
  - Add more questions, conditional statements, nested clauses
  - Average target: 15-20 words per line

**Quick Test**: Read their lines aloud without character names. You should immediately know who's speaking.`,
  },

  {
    type: 'scene-level-analysis',
    description: 'Evaluation of individual scene effectiveness',
    criteria: [
      {
        name: 'Scene Purpose',
        weight: 0.25,
        description: 'Identifies what the scene must accomplish in the story',
        examples: {
          excellent: '"This scene needs to: (1) reveal Jake knows about the affair, (2) show Maria\'s guilt without her admitting it, (3) plant the photo that pays off in Act 3. Currently it only does #1."',
          adequate: '"This scene reveals the affair."',
          poor: '"Important scene."',
        },
      },
      {
        name: 'Entry/Exit Analysis',
        weight: 0.2,
        description: 'Evaluates where scene starts and ends',
        examples: {
          excellent: '"Scene starts 2 pages early — cut the small talk on p.45-46, enter at the conflict (p.47, \'We need to talk\'). Scene also overstays by a page — end on Maria\'s silence, not Jake\'s exit."',
          adequate: '"The scene starts slowly."',
          poor: '"Pacing issues."',
        },
      },
      {
        name: 'Conflict Dynamics',
        weight: 0.3,
        description: 'Analyzes the push-pull of the scene',
        examples: {
          excellent: '"Jake wants to confront, Maria wants to deflect. Currently Jake dominates for 3 pages — Maria needs more pushback at p.48 to create actual conflict, not just a lecture."',
          adequate: '"Maria should fight back more."',
          poor: '"Needs more conflict."',
        },
      },
      {
        name: 'Subtext Evaluation',
        weight: 0.25,
        description: 'Identifies what\'s said vs. what\'s meant',
        examples: {
          excellent: '"On p.47, Maria says \'I was working late.\' This is on-the-nose — she\'s literally stating her lie. Better: have her ask about his day first, deflecting while gathering information."',
          adequate: '"Maria\'s lying here."',
          poor: '"The dialogue is flat."',
        },
      },
    ],
    sampleOutput: `## Scene Analysis: INT. KITCHEN - NIGHT (p.45-50)

**Scene Purpose**:
1. ✅ Reveal Jake knows about the affair
2. ❌ Show Maria's guilt (currently she's too defensive, not guilty)
3. ❌ Plant the photo (missing entirely)

**Entry Point**: Enter too early
- Current: Small talk about dinner (p.45-46)
- Suggested: Cut to p.47, "We need to talk."
- Save: 1.5 pages

**Exit Point**: Overstays
- Current: Jake storms out, Maria alone for half page
- Suggested: End on Maria's silence after "I saw you with him."
- Save: 1 page

**Conflict Dynamics**:
- Jake: Confrontation (attack mode)
- Maria: Deflection (defense mode)
- Problem: Jake dominates for 3 pages straight
- Fix: Maria needs counterattack at p.48 — turn accusation back on Jake

**Subtext Issues**:
- p.47: "I was working late" — too on-the-nose
- Better: Maria asks about his day, gathering intel while deflecting
- p.49: Jake's monologue states theme directly — should be implicit

**Revised Scene Length**: 3 pages (currently 5)`,
  },

  {
    type: 'theme-analysis',
    description: 'Evaluation of thematic coherence and expression',
    criteria: [
      {
        name: 'Theme Identification',
        weight: 0.2,
        description: 'Articulates the central theme clearly',
        examples: {
          excellent: '"The script explores the cost of ambition — each character sacrifices relationships for success, then discovers success feels hollow without connection."',
          adequate: '"The theme is about ambition."',
          poor: '"The script has themes."',
        },
      },
      {
        name: 'Character Embodiment',
        weight: 0.3,
        description: 'Shows how different characters explore the theme',
        examples: {
          excellent: '"Jake embodies unchecked ambition (he wins but loses his family). Maria embodies balanced ambition (she succeeds by building bridges). Cole embodies rejected ambition (he gave up his dreams and resents those who didn\'t)."',
          adequate: '"Jake represents ambition."',
          poor: '"The characters are thematic."',
        },
      },
      {
        name: 'Scene-Level Evidence',
        weight: 0.3,
        description: 'Points to specific scenes that express or undercut theme',
        examples: {
          excellent: '"The theme lands in the boardroom scene (p.78) when Jake gets the promotion and realizes he has no one to tell. But the hospital scene (p.85) undercuts it — Jake suddenly cares about family without earning that turn."',
          adequate: '"The boardroom scene is thematic."',
          poor: '"Theme is present."',
        },
      },
      {
        name: 'Thematic Consistency',
        weight: 0.2,
        description: 'Identifies where theme is muddled or contradicted',
        examples: {
          excellent: '"The B-plot (Jake\'s sister) seems to be about forgiveness, which doesn\'t connect to the ambition theme. Either cut it or make the sister\'s storyline about sacrificing family for career."',
          adequate: '"The sister subplot doesn\'t fit."',
          poor: '"Some scenes don\'t work."',
        },
      },
    ],
    sampleOutput: `## Theme Analysis

**Central Theme**: The cost of ambition — success achieved at the expense of human connection leaves us hollow.

**Character Embodiment**:
- **Jake** (protagonist): Unchecked ambition. Gets everything he wants, loses everyone who matters. His arc should end in recognition, not redemption.
- **Maria** (antagonist): Balanced ambition. Succeeds by building alliances. Her "villainy" is actually showing Jake what healthy ambition looks like.
- **Cole** (mentor): Rejected ambition. Gave up his dreams, now bitter. He pushes Jake forward to live vicariously — enabling the protagonist's worst impulses.

**Thematic Scenes**:
| Scene | Function | Status |
|-------|----------|--------|
| Opening (p.1-5) | Establish Jake's obsession | ✅ Works |
| Maria intro (p.15) | Contrast with balance | ❌ She seems villainous, not healthy |
| Midpoint (p.55) | Jake's first win | ✅ Costs him his marriage |
| Boardroom (p.78) | Theme stated | ✅ "I got everything I wanted and I have no one to tell" |
| Hospital (p.85) | Reconnection | ❌ Feels unearned — needs more setup |

**Thematic Contradictions**:
1. The sister subplot (p.20, 45, 72) is about forgiveness, not ambition. Either cut or reframe — make her storyline about her own career sacrifice.
2. Cole's death (p.70) is heroic, but thematically he should die bitter and alone, as a warning of Jake's future.

**Recommendation**: The theme is clear but the execution wavers. Maria needs reframing (she's the healthy alternative, not the villain). Cole's ending needs revision. The sister either connects to ambition or gets cut.`,
  },

  {
    type: 'pacing-analysis',
    description: 'Evaluation of screenplay pacing and momentum',
    criteria: [
      {
        name: 'Scene Length Distribution',
        weight: 0.25,
        description: 'Analyzes variation in scene lengths',
        examples: {
          excellent: '"Act 2 has 8 consecutive scenes averaging 4+ pages. This creates monotonous rhythm. Intercut with 1-2 page scenes to vary tempo — current draft feels like 32 pages of the same energy."',
          adequate: '"Act 2 scenes are too long."',
          poor: '"Pacing is slow."',
        },
      },
      {
        name: 'Tension Escalation',
        weight: 0.3,
        description: 'Evaluates whether stakes and tension increase',
        examples: {
          excellent: '"Tension peaks at p.45 (car chase), then flatlines p.46-70 (all dialogue scenes at same intensity). The midpoint should be higher than the Act 1 climax — currently it\'s lower."',
          adequate: '"The middle is flat."',
          poor: '"Needs more tension."',
        },
      },
      {
        name: 'Information Release',
        weight: 0.25,
        description: 'Evaluates when revelations and information drops',
        examples: {
          excellent: '"Three major revelations happen p.65-70 (affair, murder, betrayal). Space them out — put the affair at p.50, murder at p.65, betrayal at p.80. Currently they pile up and dilute each other."',
          adequate: '"Too much happens at once."',
          poor: '"Revelations are bunched."',
        },
      },
      {
        name: 'Reader Fatigue Points',
        weight: 0.2,
        description: 'Identifies where reader attention likely drops',
        examples: {
          excellent: '"Reader fatigue points: p.35-42 (exposition dump about company history), p.55-62 (repetitive argument scenes), p.80-85 (third act setup that should be half the length)."',
          adequate: '"Some sections drag."',
          poor: '"It\'s too long."',
        },
      },
    ],
    sampleOutput: `## Pacing Analysis

**Page Count**: 118 pages (target: 105-115 for this genre)

**Act Lengths**:
- Act 1: 28 pages (24%) — slightly long, target 20%
- Act 2A: 35 pages (30%) — on target
- Act 2B: 32 pages (27%) — slightly long
- Act 3: 23 pages (19%) — on target

**Scene Length Distribution**:
| Range | Count | Notes |
|-------|-------|-------|
| 1 page | 8 | Good for quick beats |
| 2-3 pages | 15 | Healthy variety |
| 4-5 pages | 12 | Starting to feel long |
| 6+ pages | 4 | Need justification |

**Problem**: Act 2A has 8 consecutive 4+ page scenes (p.35-67). This creates monotonous rhythm.

**Tension Map**:
\`\`\`
100% |                        *
 75% |        *         *
 50% |  *          * *       *
 25% |    *  *
  0% |____________________________
       p1  20  40  60  80  100
\`\`\`

**Issues**:
1. Tension DROPS after p.45 car chase — midpoint (p.55) should be HIGHER
2. p.46-70 is 24 pages at same mid-level intensity
3. Three revelations bunched at p.65-70 (affair, murder, betrayal)

**Reader Fatigue Points**:
- p.35-42: Exposition dump (company history) — compress to 3 pages
- p.55-62: Three repetitive argument scenes — combine into one
- p.80-85: Third act setup — cut in half

**Prescription**:
1. Space revelations: affair p.50, murder p.65, betrayal p.80
2. Add 1-2 page high-intensity scenes between longer dialogue scenes in Act 2A
3. Cut 8-10 pages total from identified fatigue points
4. Target length: 108-110 pages`,
  },
];

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------

/**
 * Build a system-prompt section with analysis rubric for the given type.
 *
 * @param analysisType - The type of analysis rubric to build
 * @returns Formatted prompt section or empty string if type not found
 */
export function buildAnalysisRubricPrompt(analysisType: string): string {
  const rubric = ANALYSIS_RUBRICS.find((r) => r.type === analysisType);
  if (!rubric) return '';

  const lines: string[] = [
    `## Analysis Standards: ${rubric.type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`,
    '',
    rubric.description,
    '',
    '### Quality Criteria',
    '',
  ];

  for (const criterion of rubric.criteria) {
    lines.push(`**${criterion.name}** (${Math.round(criterion.weight * 100)}% weight)`);
    lines.push(criterion.description);
    lines.push(`- Excellent: ${criterion.examples.excellent}`);
    lines.push(`- Avoid: ${criterion.examples.poor}`);
    lines.push('');
  }

  lines.push('### Sample Output Format');
  lines.push('');
  lines.push('```markdown');
  lines.push(rubric.sampleOutput);
  lines.push('```');

  return lines.join('\n');
}

/**
 * Build a combined prompt section with all analysis rubrics.
 * Use for writers-room mode to provide comprehensive guidance.
 */
export function buildAllAnalysisRubricsPrompt(): string {
  const lines: string[] = [
    '## Analysis Quality Standards',
    '',
    'When performing analysis, follow these standards to ensure feedback is',
    'specific, actionable, and grounded in the actual screenplay:',
    '',
  ];

  for (const rubric of ANALYSIS_RUBRICS) {
    lines.push(`### ${rubric.type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`);
    lines.push('');
    lines.push(rubric.description);
    lines.push('');
    lines.push('**Key criteria**:');
    for (const criterion of rubric.criteria) {
      lines.push(`- **${criterion.name}**: ${criterion.description}`);
    }
    lines.push('');
  }

  lines.push('**General principles**:');
  lines.push('- Always cite specific page numbers and line examples');
  lines.push('- Quantify when possible (percentages, word counts, scene lengths)');
  lines.push('- Provide concrete fixes, not just diagnosis');
  lines.push('- Reference comparable films when relevant');
  lines.push('- Prioritize actionable feedback over comprehensive coverage');

  return lines.join('\n');
}

/**
 * Get all available analysis types.
 */
export function getAnalysisTypes(): string[] {
  return ANALYSIS_RUBRICS.map((r) => r.type);
}
