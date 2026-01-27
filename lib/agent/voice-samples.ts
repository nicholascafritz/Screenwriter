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
  ],
};

// ---------------------------------------------------------------------------
// Prompt Builder
// ---------------------------------------------------------------------------

/**
 * Build a system-prompt section containing concrete Fountain excerpts
 * for the given voice profile.
 *
 * Returns an empty string if the voiceId has no registered samples,
 * which the `filter(Boolean)` in `buildSystemPrompt` will silently skip.
 */
export function buildVoiceSamplesPrompt(voiceId: string): string {
  const samples = VOICE_SAMPLES[voiceId];
  if (!samples || samples.length === 0) return '';

  const lines: string[] = [
    '## Voice Calibration Samples',
    '',
    'The following original Fountain excerpts demonstrate the target voice.',
    'Use them to calibrate your writing style — match their rhythm, density,',
    'and sensibility when generating or editing screenplay content.',
    '',
  ];

  for (const sample of samples) {
    lines.push(`### ${sample.label}`);
    lines.push('');
    lines.push('```fountain');
    lines.push(sample.fountain);
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
