// ---------------------------------------------------------------------------
// AI Agent -- Voice Profile Definitions
// ---------------------------------------------------------------------------
//
// Defines writing voice profiles that shape how the AI assistant generates
// and edits screenplay content.  Each voice profile contains weighted
// components covering dialogue style, narrative structure, action
// description, pacing, and overall tone.
//
// Usage:
//   import { PRESET_VOICES, buildVoicePrompt, getVoiceById } from '@/lib/agent/voices';
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single aspect of a writing voice.
 *
 * Each component describes one dimension of the writing style (e.g. how
 * dialogue sounds, how action lines are written) along with a weight that
 * controls how prominently that aspect influences the output.
 */
export interface VoiceComponent {
  /** The craft dimension this component controls. */
  aspect: 'dialogue' | 'structure' | 'action' | 'pacing' | 'tone';

  /** Short label describing the stylistic approach (e.g. "classic", "witty"). */
  style: string;

  /**
   * Influence weight between 0 and 1.
   *
   * - 0.0 -- 0.49: lightly influenced by this style
   * - 0.5 -- 0.79: moderately guided by this style
   * - 0.8 -- 1.0 : strongly channeling this style
   */
  weight: number;

  /** Optional freeform prompt text that overrides the default phrasing. */
  customPrompt?: string;
}

/**
 * A complete voice profile that defines the overall writing personality
 * the AI assistant should adopt when generating or editing screenplay
 * content.
 */
export interface VoiceProfile {
  /** Machine-readable identifier (e.g. "classic-hollywood"). */
  id: string;

  /** Human-readable display name. */
  name: string;

  /** One-line description of the voice's character. */
  description: string;

  /** Weighted style components that compose this voice. */
  components: VoiceComponent[];
}

// ---------------------------------------------------------------------------
// Preset Voices
// ---------------------------------------------------------------------------

export const PRESET_VOICES: VoiceProfile[] = [
  // 1. Classic Hollywood
  {
    id: 'classic-hollywood',
    name: 'Classic Hollywood',
    description:
      'Clean, efficient, invisible prose (Billy Wilder, William Goldman)',
    components: [
      { aspect: 'dialogue', style: 'classic', weight: 1.0 },
      { aspect: 'structure', style: 'three-act', weight: 1.0 },
      { aspect: 'action', style: 'clean', weight: 1.0 },
      { aspect: 'pacing', style: 'measured', weight: 0.8 },
      { aspect: 'tone', style: 'professional', weight: 1.0 },
    ],
  },

  // 2. Auteur Dialogue
  {
    id: 'auteur-dialogue',
    name: 'Auteur Dialogue',
    description:
      'Stylized, distinct speech patterns (Tarantino, Coen Brothers)',
    components: [
      { aspect: 'dialogue', style: 'tarantino', weight: 0.8 },
      { aspect: 'structure', style: 'nonlinear', weight: 0.6 },
      { aspect: 'action', style: 'visceral', weight: 0.7 },
      { aspect: 'pacing', style: 'slow-burn', weight: 0.7 },
      { aspect: 'tone', style: 'irreverent', weight: 0.9 },
    ],
  },

  // 3. Prestige Drama
  {
    id: 'prestige-drama',
    name: 'Prestige Drama',
    description: 'Dense subtext, literary quality (Sorkin, PTA)',
    components: [
      { aspect: 'dialogue', style: 'sorkin', weight: 0.7 },
      { aspect: 'structure', style: 'classical', weight: 0.8 },
      { aspect: 'action', style: 'literary', weight: 0.8 },
      { aspect: 'pacing', style: 'rapid', weight: 0.9 },
      { aspect: 'tone', style: 'intellectual', weight: 0.8 },
    ],
  },

  // 4. Horror / Thriller
  {
    id: 'horror-thriller',
    name: 'Horror/Thriller',
    description: 'Atmospheric, tension-building (Peele, Aster)',
    components: [
      { aspect: 'dialogue', style: 'sparse', weight: 0.8 },
      { aspect: 'structure', style: 'escalating', weight: 0.9 },
      { aspect: 'action', style: 'atmospheric', weight: 1.0 },
      { aspect: 'pacing', style: 'methodical', weight: 0.9 },
      { aspect: 'tone', style: 'dread', weight: 1.0 },
    ],
  },

  // 5. Comedy
  {
    id: 'comedy',
    name: 'Comedy',
    description: 'Timing-aware, punchy, setup-payoff (Apatow, Ephron)',
    components: [
      { aspect: 'dialogue', style: 'witty', weight: 1.0 },
      { aspect: 'structure', style: 'setup-payoff', weight: 0.9 },
      { aspect: 'action', style: 'light', weight: 0.7 },
      { aspect: 'pacing', style: 'quick', weight: 0.9 },
      { aspect: 'tone', style: 'comedic', weight: 1.0 },
    ],
  },

  // 6. Nick's Voice
  {
    id: 'nicks-voice',
    name: "Nick's Voice",
    description:
      'Surreal precision — Tarantino\'s ear, Lynch\'s atmosphere, Wilder\'s structure, Ellis\'s detachment',
    components: [
      { aspect: 'dialogue', style: 'hypnotic', weight: 0.9 },
      { aspect: 'structure', style: 'fractured-classical', weight: 0.8 },
      { aspect: 'action', style: 'detached-vivid', weight: 0.9 },
      { aspect: 'pacing', style: 'controlled-drift', weight: 0.7 },
      { aspect: 'tone', style: 'wry-uncanny', weight: 1.0 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Aspect label mapping (for human-readable prompt generation)
// ---------------------------------------------------------------------------

const ASPECT_LABELS: Record<VoiceComponent['aspect'], string> = {
  dialogue: 'Dialogue style',
  structure: 'Narrative structure',
  action: 'Action/description lines',
  pacing: 'Pacing',
  tone: 'Overall tone',
};

/**
 * Map a style key to a more descriptive natural-language phrase.
 *
 * These descriptions are intentionally evocative so that the LLM
 * understands the creative intent behind each style label.
 */
function describeStyle(aspect: VoiceComponent['aspect'], style: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    dialogue: {
      classic:
        'polished, naturalistic dialogue that serves story over flash -- every line earns its place',
      tarantino:
        'distinctive, rhythmic speech patterns with digressions, pop-culture texture, and unexpected eloquence',
      sorkin:
        'rapid-fire, overlapping dialogue dense with argument, wit, and rhetorical precision',
      sparse:
        'minimal, carefully chosen dialogue where silence and what is left unsaid carry weight',
      witty:
        'sharp, timing-conscious dialogue built on setups, callbacks, and comedic rhythm',
      hypnotic:
        'stylized, rhythmic speech that oscillates between razor-sharp wit and dreamlike non-sequiturs -- characters say exactly what they mean and nothing they mean in the same breath',
    },
    structure: {
      'three-act':
        'disciplined three-act structure with clear act breaks, rising stakes, and a satisfying resolution',
      nonlinear:
        'non-chronological storytelling that reveals information through juxtaposition and recontextualization',
      classical:
        'classical dramatic structure with escalating complications, reversals, and thematic unity',
      escalating:
        'relentlessly escalating tension architecture where each scene tightens the screws',
      'setup-payoff':
        'meticulously planted setups that pay off with comedic or dramatic surprise',
      'fractured-classical':
        'classical three-act bones underneath a fractured, non-chronological surface -- the architecture is disciplined, the presentation is not',
    },
    action: {
      clean:
        'lean, invisible action lines -- no wasted words, camera-ready clarity',
      visceral:
        'physical, sensory action writing that puts the reader inside the moment',
      literary:
        'evocative, literary-quality description that elevates prose without becoming novelistic',
      atmospheric:
        'mood-first description that builds dread through environmental detail and negative space',
      light:
        'breezy, efficient action lines that keep the read fast and energetic',
      'detached-vivid':
        'cool, observational prose that notices the wrong details with unsettling precision -- minimalist sentences that land like photographs',
    },
    pacing: {
      measured:
        'controlled, professional pacing that lets scenes breathe without dragging',
      'slow-burn':
        'deliberate slow-burn pacing that builds cumulative tension across sequences',
      rapid:
        'energetic pacing with snappy scenes and momentum that pulls the reader forward',
      methodical:
        'methodical, patient pacing that uses restraint to amplify key moments',
      quick:
        'brisk pacing that moves quickly between beats, keeping comedy timing tight',
      'controlled-drift':
        'scenes breathe at their own rhythm, alternating between tight exchanges and long, ambient passages where nothing and everything happens',
    },
    tone: {
      professional:
        'authoritative, industry-standard tone that reads like a shooting script',
      irreverent:
        'irreverent, confident tone that breaks convention when it serves the story',
      intellectual:
        'intellectually engaged tone with thematic depth and layered meaning',
      dread:
        'pervasive sense of dread and unease woven into every descriptive choice',
      comedic:
        'warm, comedic sensibility that finds humor in character and situation',
      'wry-uncanny':
        'dry, darkly funny surface over a bottomless sense of wrongness -- the world is funny because it is broken and nobody mentions it',
    },
  };

  return descriptions[aspect]?.[style] ?? `${style} approach to ${aspect}`;
}

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------

/**
 * Generate a system-prompt segment that instructs the AI to write in
 * the given voice profile's style.
 *
 * The weight of each component determines the intensity of the
 * instruction language:
 * - weight < 0.5  => "lightly influenced by"
 * - weight 0.5-0.79 => "moderately guided by"
 * - weight >= 0.8 => "strongly channeling"
 */
export function buildVoicePrompt(voice: VoiceProfile): string {
  const lines: string[] = [];

  lines.push(`## Writing Voice: ${voice.name}`);
  lines.push('');
  lines.push(voice.description);
  lines.push('');
  lines.push('When writing or editing screenplay content, adopt the following style:');
  lines.push('');

  for (const component of voice.components) {
    const label = ASPECT_LABELS[component.aspect];

    // Determine emphasis language from weight.
    let emphasis: string;
    if (component.weight < 0.5) {
      emphasis = 'lightly influenced by';
    } else if (component.weight < 0.8) {
      emphasis = 'moderately guided by';
    } else {
      emphasis = 'strongly channeling';
    }

    // Use custom prompt if provided; otherwise generate from style map.
    const description =
      component.customPrompt ?? describeStyle(component.aspect, component.style);

    lines.push(
      `- **${label}** (${emphasis}): ${description}`,
    );
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

/**
 * Find a preset voice profile by its id.
 *
 * Returns `undefined` if no preset matches.
 */
export function getVoiceById(id: string): VoiceProfile | undefined {
  return PRESET_VOICES.find((v) => v.id === id);
}
