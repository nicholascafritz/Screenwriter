// ---------------------------------------------------------------------------
// API Route -- /api/generate-title
// ---------------------------------------------------------------------------
//
// Generates a short title for a chat session based on the first exchange.
//
// Model routing:
//   Uses Haiku 3.5 — this is a simple, fast generation task that doesn't
//   require creative reasoning. Ideal for the cheapest, fastest model.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildModelParams } from '@/lib/ai/models';
import { getModelForTask } from '@/lib/ai/model-router';

export const maxDuration = 15;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GenerateTitleRequestBody {
  userMessage: string;
  assistantMessage: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TITLE_MODEL = getModelForTask('generate-title');

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  try {
    const body = (await request.json()) as GenerateTitleRequestBody;
    const { userMessage, assistantMessage } = body;

    if (!userMessage) {
      return NextResponse.json(
        { error: 'Missing "userMessage" field.' },
        { status: 400 },
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 },
      );
    }

    const client = new Anthropic({
      apiKey,
    });
    const modelParams = buildModelParams(TITLE_MODEL);

    // Use streaming and collect the final message
    const stream = client.messages.stream({
      ...modelParams,
      max_tokens: 30,
      system:
        'Generate a very short title (3-6 words) for this chat conversation. ' +
        'The title should capture the main topic or intent. ' +
        'Do NOT use quotes, punctuation at the end, or prefixes like "Title:". ' +
        'Just output the title text directly.',
      messages: [
        {
          role: 'user',
          content: `User: ${userMessage.slice(0, 500)}\n\nAssistant: ${assistantMessage.slice(0, 500)}`,
        },
      ],
    });

    const response = await stream.finalMessage();
    const textBlock = response.content.find((b) => b.type === 'text');
    const title = textBlock?.text?.trim().replace(/^["']|["']$/g, '') ?? '';

    return NextResponse.json({ title });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
