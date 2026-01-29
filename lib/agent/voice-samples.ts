// ---------------------------------------------------------------------------
// AI Agent -- Voice Calibration Samples
// ---------------------------------------------------------------------------
//
// Concrete Fountain screenplay excerpts for each preset voice profile.
// These samples are embedded in the system prompt to ground the AI's
// understanding of each voice with tangible examples rather than abstract
// descriptions alone.
//
// All excerpts are original compositions inspired by the referenced styles.
// They are not copies of any produced screenplay.
//
// Usage:
//   import { buildVoiceSamplesPrompt } from '@/lib/agent/voice-samples';
//   const section = buildVoiceSamplesPrompt('comedy');
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceSample {
  /** Which craft aspect this sample demonstrates. */
  aspect: 'dialogue' | 'action' | 'scene-description';
  /** A brief label for the sample. */
  label: string;
  /** The Fountain-formatted excerpt. */
  fountain: string;
}

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

const VOICE_SAMPLES: Record<string, VoiceSample[]> = {
  'classic-hollywood': [
    {
      aspect: 'dialogue',
      label: 'Clean, functional dialogue — every line moves the story',
      fountain: `FRANK
You're asking me to trust a man who lied to a grand jury.

HELEN
I'm asking you to trust me.

FRANK
(beat)
That's the same thing, Helen.`,
    },
    {
      aspect: 'action',
      label: 'Lean, invisible prose — camera-ready clarity',
      fountain: `Frank sets the glass down. He doesn't look at her. The silence says everything his words won't.

He picks up his hat and walks out. The door clicks shut behind him.`,
    },
    {
      aspect: 'scene-description',
      label: 'Efficient scene-setting — location and mood in minimal words',
      fountain: `INT. FEDERAL COURTHOUSE - HALLWAY - DAY

Marble floors, fluorescent hum. FRANK ALDRIDGE, 50s, walks with the heavy gait of a man who already knows the verdict.`,
    },
  ],

  'auteur-dialogue': [
    {
      aspect: 'dialogue',
      label: 'Stylized, rhythmic speech with digressions and texture',
      fountain: `VINCENT
You know what the problem with this country is? It's not the politicians, it's not the banks -- it's the fact that nobody remembers what a good sandwich tastes like anymore. I'm serious. You walk into any deli in this city and ask for a meatball sub and they look at you like you just spoke Mandarin.

JULES
We're in the middle of something here, Vincent.

VINCENT
I know we're in the middle of something. That's exactly my point. Even in the middle of something, a man should be able to get a decent sandwich.`,
    },
    {
      aspect: 'action',
      label: 'Visceral, physical writing that puts you in the moment',
      fountain: `Vincent pops the trunk. Inside: two gym bags, a shotgun wrapped in a beach towel, and a six-pack of Orange Crush. He grabs the Crush first.

Jules stares at him. Vincent shrugs. It's gonna be a long night.`,
    },
    {
      aspect: 'scene-description',
      label: 'Location as character — place has personality and history',
      fountain: `INT. JACK RABBIT SLIM'S - NIGHT

A 1950s themed restaurant that's trying too hard and knows it. Waiters dressed as Buddy Holly and Marilyn Monroe. The booths are shaped like Cadillacs. Everything is chrome and neon and deeply, profoundly fake in a way that somehow circles back to authentic.

VINCENT and MIA take a booth. He notices the $5 shake on the menu. She notices him noticing.`,
    },
  ],

  'prestige-drama': [
    {
      aspect: 'dialogue',
      label: 'Rapid-fire argument dense with rhetoric',
      fountain: `CATHERINE
You leaked the memo.

DANIEL
I circulated the memo. There's a difference.

CATHERINE
The difference is about six federal statutes, Daniel.

DANIEL
The difference is that three hundred thousand people now know what their government is doing with their money, and you're upset because it wasn't on your timeline.

CATHERINE
My timeline had lawyers.

DANIEL
Your timeline had silence.`,
    },
    {
      aspect: 'action',
      label: 'Literary-quality description that elevates without becoming novelistic',
      fountain: `The newsroom hums with the particular electricity of a story about to break -- keyboards clatter in staccato bursts, phones ring unanswered, and somewhere a printer jams and nobody cares.

Catherine stands at the glass wall of her office, watching it all happen without her.`,
    },
    {
      aspect: 'scene-description',
      label: 'Environment reflects institutional power and personal cost',
      fountain: `INT. WASHINGTON POST - NEWSROOM - NIGHT

Fluorescent purgatory. Fifty desks, forty-seven empty. The three that aren't belong to people who've forgotten what their apartments look like.

CATHERINE MERCER, 40s, stands at the window of her glass office, watching the cleaning crew vacuum around the reporters who won't go home. She hasn't been home in three days. Neither have they.`,
    },
  ],

  'horror-thriller': [
    {
      aspect: 'dialogue',
      label: 'Sparse, weighted — silence carries meaning',
      fountain: `MARI
Did you hear that?

THOMAS
It's an old house.

A long beat. Neither moves.

MARI
Thomas. That wasn't the house.`,
    },
    {
      aspect: 'action',
      label: 'Atmospheric dread through environmental detail',
      fountain: `The hallway stretches longer than it should. The wallpaper -- faded roses on cream -- peels at the seams, revealing something dark underneath. Not mold. Something deliberate.

Mari's flashlight catches the edge of a door that wasn't there before.

She reaches for the handle. The metal is warm.`,
    },
    {
      aspect: 'scene-description',
      label: 'Mood-first scene-setting that builds unease',
      fountain: `INT. FARMHOUSE - KITCHEN - NIGHT

The kind of kitchen where someone once made Sunday dinners. Copper pots hang from hooks. A child's drawing is pinned to the fridge with a magnet shaped like a sunflower.

Everything is exactly where it should be. That's what makes it wrong.`,
    },
  ],

  'nicks-voice': [
    {
      aspect: 'dialogue',
      label: 'Stylized precision — two people talking past each other with dreamlike clarity',
      fountain: `COLE
You ever notice how gas stations at night look exactly like Edward Hopper paintings? Same light. Same loneliness. Different century.

MARA
We need to talk about the money, Cole.

COLE
I'm talking about the money. I'm talking about everything. That's the whole point -- you can't separate the gas station from the money. The light is the money. The loneliness is the money.

MARA
(beat)
You took forty thousand dollars from a dead man's house.

COLE
See, now you're changing the subject.`,
    },
    {
      aspect: 'action',
      label: 'Detached observation — wrong-detail focus with photographic precision',
      fountain: `The diner is empty except for a man in a booth by the window. He's eating pancakes with a knife and fork, cutting each one into exactly six pieces. There's a system to it. There's a system to everything he does.

Outside, a dog crosses the parking lot in no particular hurry. The man watches it. The pancakes go cold. He doesn't seem to mind.

The fluorescent light above the counter flickers once. Nobody looks up.`,
    },
    {
      aspect: 'scene-description',
      label: 'Mood-first structure — Wilder efficiency describing a Lynch world',
      fountain: `INT. MOTEL ROOM 6 - NIGHT

A room that was last renovated when Nixon was president and hasn't been cleaned since. Twin bed, bolted lamp, television tuned to static at a volume that suggests company rather than entertainment.

COLE sits on the edge of the bed, fully dressed, shoes on, watching the static like it's telling him something important. Maybe it is.`,
    },
  ],

  comedy: [
    {
      aspect: 'dialogue',
      label: 'Setup-payoff timing with character-driven humor',
      fountain: `NORA
I have a system. I label everything. Color-coded. There's a spreadsheet.

BEN
You have a spreadsheet for your refrigerator?

NORA
I have a spreadsheet for my spreadsheets, Ben. Try to keep up.

BEN
(to himself)
I'm in love with a psychopath.

NORA
I heard that.

BEN
The system works.`,
    },
    {
      aspect: 'action',
      label: 'Breezy, energetic action that keeps the read fast',
      fountain: `Ben opens the fridge. Every shelf is labeled. Every container faces forward. There's a tiny laminated card that reads "ROTATE STOCK WEEKLY."

He grabs a yogurt. Puts it back. Grabs a different yogurt. Checks the label. Puts that one back too.

He closes the fridge and eats cereal out of the box.`,
    },
    {
      aspect: 'scene-description',
      label: 'Location setup that\'s already telling jokes',
      fountain: `INT. NORA'S APARTMENT - KITCHEN - MORNING

A kitchen that belongs in a magazine spread titled "How Type-A Personalities Live." Every spice alphabetized. Labels on the labels. A whiteboard with a meal prep schedule color-coded by macronutrient.

On the counter: a single unwashed mug. NORA stares at it like it's evidence of moral failure.`,
    },
  ],
};

// ---------------------------------------------------------------------------
// Transformation Samples (Before/After)
// ---------------------------------------------------------------------------

interface TransformationSample {
  /** Which voice this transformation demonstrates. */
  voice: string;
  /** Which craft aspect this sample demonstrates. */
  aspect: 'dialogue' | 'action';
  /** A brief label for the transformation. */
  label: string;
  /** The generic/flat version. */
  before: string;
  /** The voice-specific version. */
  after: string;
  /** What changed and why. */
  notes: string;
}

const TRANSFORMATION_SAMPLES: TransformationSample[] = [
  {
    voice: 'classic-hollywood',
    aspect: 'dialogue',
    label: 'On-the-nose → Subtext',
    before: `FRANK
I'm angry that you lied to me about the money.

HELEN
I was scared you would leave me if you knew the truth.`,
    after: `FRANK
The accountant called. Third time this week.

HELEN
I was going to tell you.

FRANK
When? Before or after the mortgage company?`,
    notes: 'Removed emotional declarations. Let the situation carry the weight. Characters talk about the problem, not their feelings about the problem.',
  },
  {
    voice: 'horror-thriller',
    aspect: 'action',
    label: 'Neutral → Dread-infused',
    before: `Mari walks down the hallway. She sees a door at the end. She opens it and looks inside.`,
    after: `The hallway stretches. Mari counts the doors — four, five, six — but there should only be five.

The sixth door is new. Or it was always there and she never noticed.

She reaches for the handle. Her hand stops an inch away.

The metal is warm.`,
    notes: 'Added sensory wrongness, hesitation beats, and detail that implies threat without naming it. Dread comes from noticing what shouldn\'t be.',
  },
  {
    voice: 'comedy',
    aspect: 'dialogue',
    label: 'Functional → Character-driven humor',
    before: `NORA
I'm very organized.

BEN
I noticed.`,
    after: `NORA
I have a system. I label everything. Color-coded. There's a spreadsheet.

BEN
You have a spreadsheet for your refrigerator?

NORA
I have a spreadsheet for my spreadsheets, Ben. Try to keep up.`,
    notes: 'Escalation creates comedy. Each line raises the stakes of her organizational obsession. Ben\'s straight-man reaction grounds the absurdity.',
  },
  {
    voice: 'prestige-drama',
    aspect: 'dialogue',
    label: 'Simple conflict → Rhetorical sparring',
    before: `CATHERINE
You shared the confidential document.

DANIEL
I thought people should know.`,
    after: `CATHERINE
You leaked the memo.

DANIEL
I circulated the memo. There's a difference.

CATHERINE
The difference is about six federal statutes, Daniel.

DANIEL
The difference is that three hundred thousand people now know what their government is doing with their money.`,
    notes: 'Each line is a parry and thrust. Characters don\'t just state positions — they argue semantics, weaponize word choice, and score points.',
  },
  {
    voice: 'auteur-dialogue',
    aspect: 'dialogue',
    label: 'Direct → Digressive with texture',
    before: `VINCENT
This country has problems.

JULES
We need to focus.`,
    after: `VINCENT
You know what the problem with this country is? It's not the politicians, it's not the banks -- it's the fact that nobody remembers what a good sandwich tastes like anymore.

JULES
We're in the middle of something here, Vincent.

VINCENT
I know we're in the middle of something. That's exactly my point.`,
    notes: 'The tangent IS the character. Vincent\'s sandwich rant reveals his worldview while Jules\'s impatience reveals his. The digression creates contrast and rhythm.',
  },
  {
    voice: 'nicks-voice',
    aspect: 'action',
    label: 'Ordinary → Uncanny precision',
    before: `A man sits in a diner eating breakfast. He watches a dog outside.`,
    after: `The diner is empty except for a man in a booth by the window. He's eating pancakes with a knife and fork, cutting each one into exactly six pieces. There's a system to it. There's a system to everything he does.

Outside, a dog crosses the parking lot in no particular hurry. The man watches it. The pancakes go cold. He doesn't seem to mind.`,
    notes: 'Wrong details get focus. The precision of "exactly six pieces" and "no particular hurry" creates unease. The cold pancakes suggest obsession or detachment.',
  },
];

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------

/**
 * Build a system-prompt section containing concrete Fountain excerpts
 * for the given voice profile.
 *
 * Includes both preset samples and user-contributed samples (up to 3).
 *
 * Returns an empty string if the voiceId has no registered samples,
 * which the `filter(Boolean)` in `buildSystemPrompt` will silently skip.
 */
export function buildVoiceSamplesPrompt(voiceId: string): string {
  const presetSamples = VOICE_SAMPLES[voiceId] || [];

  // Try to get user-contributed samples if the store is available
  let userSamples: VoiceSample[] = [];
  try {
    // Dynamic import to avoid circular dependencies and SSR issues
    const { getUserVoiceSamplesForPrompt } = require('@/lib/store/training-feedback');
    const rawUserSamples = getUserVoiceSamplesForPrompt(voiceId, 3);
    userSamples = rawUserSamples.map((s: { aspect: 'dialogue' | 'action' | 'scene-description'; label: string; fountain: string }) => ({
      aspect: s.aspect,
      label: `[User example] ${s.label}`,
      fountain: s.fountain,
    }));
  } catch {
    // Store may not be available (SSR, etc.) — continue with preset samples only
  }

  const allSamples = [...presetSamples, ...userSamples];
  if (allSamples.length === 0) return '';

  const lines: string[] = [
    '## Voice Calibration Samples',
    '',
    'The following original Fountain excerpts demonstrate the target voice.',
    'Use them to calibrate your writing style — match their rhythm, density,',
    'and sensibility when generating or editing screenplay content.',
    '',
  ];

  for (const sample of allSamples) {
    lines.push(`### ${sample.label}`);
    lines.push('');
    lines.push('```fountain');
    lines.push(sample.fountain);
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Build a system-prompt section with transformation examples showing
 * before/after pairs for the given voice profile.
 *
 * Returns an empty string if no transformations exist for this voice.
 */
export function buildTransformationSamplesPrompt(voiceId: string): string {
  const transformations = TRANSFORMATION_SAMPLES.filter(t => t.voice === voiceId);
  if (transformations.length === 0) return '';

  const lines: string[] = [
    '## Voice Transformation Examples',
    '',
    'The following before/after pairs show how to transform flat writing into',
    'the target voice style:',
    '',
  ];

  for (const t of transformations) {
    lines.push(`### ${t.label}`);
    lines.push('');
    lines.push('**Before** (generic):');
    lines.push('```fountain');
    lines.push(t.before);
    lines.push('```');
    lines.push('');
    lines.push('**After** (voice-specific):');
    lines.push('```fountain');
    lines.push(t.after);
    lines.push('```');
    lines.push('');
    lines.push(`**What changed**: ${t.notes}`);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
