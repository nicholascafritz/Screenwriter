// ---------------------------------------------------------------------------
// API Route -- /api/summarize-chat
// ---------------------------------------------------------------------------
//
// Summarizes a chat conversation for branching context.
// Uses Claude to generate a concise 2-3 sentence summary.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 30;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SummarizeRequestBody {
  messages: { role: string; content: string }[];
  purpose?: 'branch' | 'compact';
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SummarizeRequestBody;
    const { messages, purpose = 'branch' } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "messages" array.' },
        { status: 400 },
      );
    }

    const client = new Anthropic();

    // Format conversation for summarization
    const conversationText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n\n');

    const systemPrompt = purpose === 'compact'
      ? 'You are summarizing a screenwriting assistant conversation to preserve context. ' +
        'Provide a comprehensive summary covering: (1) key creative decisions made, ' +
        '(2) screenplay changes discussed or applied, (3) character/story notes, ' +
        '(4) any pending tasks or open questions. Be thorough but concise — ' +
        'this summary replaces the original messages. Use bullet points for clarity. ' +
        'Maximum 500 words.'
      : 'Provide a concise 2-3 sentence summary of the key discussion points, decisions, and screenplay changes discussed in the following conversation. Focus on actionable context that would help continue the conversation in a new branch.';

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: purpose === 'compact' ? 1024 : 512,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Summarize this conversation:\n\n${conversationText}`,
        },
      ],
    });

    // Extract text from the response
    const textBlock = response.content.find((b) => b.type === 'text');
    const summary = textBlock?.text ?? '';

    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
