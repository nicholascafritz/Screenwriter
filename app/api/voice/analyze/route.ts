// ---------------------------------------------------------------------------
// API Route -- /api/voice/analyze
// ---------------------------------------------------------------------------
//
// Analyzes a writing sample to detect voice characteristics and suggest
// voice profile settings. Uses Claude to analyze dialogue style, structure,
// action description, pacing, and tone.
//
// Request: { sampleText: string }
// Response: { suggestions: AnalysisSuggestion[], metrics: AnalysisMetrics }
// ---------------------------------------------------------------------------

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Allow longer execution for analysis.
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalyzeRequestBody {
  sampleText: string;
}

interface AnalysisSuggestion {
  aspect: 'dialogue' | 'structure' | 'action' | 'pacing' | 'tone';
  suggestedStyle: string;
  suggestedWeight: number;
  confidence: number;
  rationale: string;
}

interface AnalysisMetrics {
  wordCount: number;
  dialoguePercentage: number;
  avgSentenceLength: number;
}

interface AnalysisResult {
  suggestions: AnalysisSuggestion[];
  metrics: AnalysisMetrics;
}

// ---------------------------------------------------------------------------
// Analysis prompt
// ---------------------------------------------------------------------------

const ANALYSIS_PROMPT = `You are a screenwriting style analyst. Analyze the provided writing sample and identify the writer's voice characteristics across five dimensions.

For each dimension, provide:
1. A suggested style from the available options
2. A weight (0.0-1.0) indicating how strongly this trait appears in the sample
3. A confidence score (0.0-1.0) for your assessment
4. A brief rationale citing specific evidence from the sample (1-2 sentences)

## Dimensions and Style Options:

**Dialogue** (how characters speak):
- classic: polished, naturalistic dialogue that serves story over flash
- tarantino: distinctive, rhythmic speech with digressions and pop-culture texture
- sorkin: rapid-fire, overlapping dialogue dense with argument and wit
- sparse: minimal, carefully chosen dialogue where silence carries weight
- witty: sharp, timing-conscious dialogue built on setups and callbacks
- hypnotic: stylized, rhythmic speech oscillating between razor-sharp wit and dreamlike non-sequiturs

**Structure** (how the story is organized):
- three-act: disciplined three-act structure with clear act breaks
- nonlinear: non-chronological storytelling through juxtaposition
- classical: classical dramatic structure with escalating complications
- escalating: relentlessly escalating tension where each scene tightens the screws
- setup-payoff: meticulously planted setups that pay off with surprise
- fractured-classical: classical bones underneath a fractured, non-chronological surface

**Action** (how action lines are written):
- clean: lean, invisible action lines with camera-ready clarity
- visceral: physical, sensory action that puts the reader inside the moment
- literary: evocative, literary-quality description
- atmospheric: mood-first description building dread through environment
- light: breezy, efficient action that keeps the read fast
- detached-vivid: cool, observational prose noticing the wrong details with precision

**Pacing** (rhythm and tempo):
- measured: controlled, professional pacing that lets scenes breathe
- slow-burn: deliberate slow-burn building cumulative tension
- rapid: energetic pacing with snappy scenes and momentum
- methodical: patient pacing using restraint to amplify key moments
- quick: brisk pacing moving quickly between beats
- controlled-drift: scenes breathe at their own rhythm, alternating tight and ambient

**Tone** (overall feeling):
- professional: authoritative, industry-standard tone
- irreverent: irreverent, confident tone breaking convention when it serves
- intellectual: intellectually engaged with thematic depth
- dread: pervasive sense of unease woven into every choice
- comedic: warm, comedic sensibility finding humor in character
- wry-uncanny: dry, darkly funny surface over a bottomless sense of wrongness

## Response Format

Respond with a JSON object in this exact format (no markdown, no code blocks, just pure JSON):
{
  "suggestions": [
    {
      "aspect": "dialogue",
      "suggestedStyle": "tarantino",
      "suggestedWeight": 0.8,
      "confidence": 0.75,
      "rationale": "Extended monologues with pop-culture tangents and distinctive rhythm."
    },
    {
      "aspect": "structure",
      "suggestedStyle": "three-act",
      "suggestedWeight": 0.7,
      "confidence": 0.6,
      "rationale": "Clear setup, confrontation, and resolution beats."
    },
    {
      "aspect": "action",
      "suggestedStyle": "clean",
      "suggestedWeight": 0.6,
      "confidence": 0.7,
      "rationale": "Lean descriptions focused on essential visual information."
    },
    {
      "aspect": "pacing",
      "suggestedStyle": "measured",
      "suggestedWeight": 0.5,
      "confidence": 0.65,
      "rationale": "Balanced scene lengths allowing character moments to breathe."
    },
    {
      "aspect": "tone",
      "suggestedStyle": "professional",
      "suggestedWeight": 0.7,
      "confidence": 0.8,
      "rationale": "Industry-standard formatting and restrained prose."
    }
  ],
  "metrics": {
    "wordCount": 1500,
    "dialoguePercentage": 0.45,
    "avgSentenceLength": 12.5
  }
}

Analyze every aspect even if the sample doesn't strongly exhibit certain traits - provide your best assessment with lower confidence scores where appropriate.`;

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;
    const { sampleText } = body;

    // Validate input.
    if (!sampleText || typeof sampleText !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "sampleText" field.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Enforce word limit (2000 words).
    const words = sampleText.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    if (wordCount > 2000) {
      return new Response(
        JSON.stringify({ error: `Sample exceeds 2000 word limit (${wordCount} words).` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (wordCount < 100) {
      return new Response(
        JSON.stringify({ error: 'Sample too short for meaningful analysis (minimum 100 words).' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Call Claude API for analysis.
    const client = new Anthropic();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: ANALYSIS_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyze this writing sample:\n\n${sampleText}`,
        },
      ],
    });

    // Extract text content from response.
    const textContent = response.content.find((b) => b.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    // Parse JSON from response (handle potential markdown code blocks).
    let jsonText = textContent.text.trim();

    // Remove markdown code blocks if present.
    const jsonMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const result: AnalysisResult = JSON.parse(jsonText);

    // Validate result structure.
    if (!result.suggestions || !Array.isArray(result.suggestions)) {
      throw new Error('Invalid response structure: missing suggestions array');
    }

    if (!result.metrics || typeof result.metrics !== 'object') {
      throw new Error('Invalid response structure: missing metrics object');
    }

    // Ensure all aspects are present.
    const aspects = ['dialogue', 'structure', 'action', 'pacing', 'tone'];
    const foundAspects = new Set(result.suggestions.map((s) => s.aspect));

    for (const aspect of aspects) {
      if (!foundAspects.has(aspect as AnalysisSuggestion['aspect'])) {
        throw new Error(`Missing suggestion for aspect: ${aspect}`);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Voice analysis error:', err);
    const message = err instanceof Error ? err.message : 'Analysis failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
