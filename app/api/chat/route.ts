// ---------------------------------------------------------------------------
// API Route -- /api/chat
// ---------------------------------------------------------------------------
//
// Streaming chat endpoint for inline and diff editing modes.  Accepts a user
// message along with mode, voice, and screenplay context, then streams back
// newline-delimited JSON chunks containing text, tool calls, tool results,
// and a final "done" event.
//
// Streaming format (newline-delimited JSON):
//   {"type":"text","content":"..."}
//   {"type":"tool_call","name":"edit_scene","input":{...}}
//   {"type":"tool_result","name":"edit_scene","result":"...","updatedScreenplay":"..."}
//   {"type":"text","content":"..."}
//   {"type":"done"}
// ---------------------------------------------------------------------------

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Allow longer execution for writers-room mode (many sequential tool calls).
export const maxDuration = 120;
import { buildSystemPrompt } from '@/lib/agent/prompts';
import { executeToolCall, getToolsForMode } from '@/lib/agent/tools';
import { getVoiceById, PRESET_VOICES } from '@/lib/agent/voices';
import { computePatch } from '@/lib/diff/patch-transport';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatRequestBody {
  message: string;
  mode: 'inline' | 'diff' | 'writers-room';
  voiceId?: string;
  screenplay: string;
  cursorScene?: string;
  selection?: string;
  history?: Anthropic.MessageParam[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Encode a JSON object as a newline-delimited chunk for streaming. */
function encodeChunk(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(data) + '\n');
}

/** Format tool definitions for the Anthropic API, filtered by mode. */
function formatToolsForAPI(mode: string): Anthropic.Tool[] {
  return getToolsForMode(mode).map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.input_schema as Anthropic.Tool.InputSchema,
  }));
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const { message, mode, voiceId, screenplay, cursorScene, selection, history } = body;

    // Validate required fields.
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "message" field.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (screenplay === undefined || screenplay === null) {
      return new Response(
        JSON.stringify({ error: 'Missing "screenplay" field.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Resolve the voice profile.
    const voice = (voiceId ? getVoiceById(voiceId) : undefined) ?? PRESET_VOICES[0];

    // Build the system prompt.
    const systemPrompt = buildSystemPrompt({
      mode: mode ?? 'inline',
      voice,
      screenplay,
      cursorScene,
      selection,
    });

    // Initialise the Anthropic client (reads ANTHROPIC_API_KEY from env).
    const client = new Anthropic();

    // Build the messages array from history + the new user message.
    const messages: Anthropic.MessageParam[] = [
      ...(history ?? []),
      { role: 'user', content: message },
    ];

    // Track the current screenplay state for tool execution.
    let currentScreenplay = screenplay;

    // Create the streaming response.
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const resolvedMode = mode ?? 'inline';
          const iterationLimit = resolvedMode === 'writers-room' ? 25 : 10;
          currentScreenplay = await runConversationLoop(
            client,
            systemPrompt,
            messages,
            currentScreenplay,
            controller,
            resolvedMode,
            iterationLimit,
          );

          // Signal completion.
          controller.enqueue(encodeChunk({ type: 'done' }));
          controller.close();
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          try {
            controller.enqueue(
              encodeChunk({ type: 'error', error: errorMessage }),
            );
            controller.close();
          } catch {
            // Controller may already be closed.
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

// ---------------------------------------------------------------------------
// Conversation loop with tool-use support
// ---------------------------------------------------------------------------

/**
 * Runs the streaming conversation loop.  When Claude makes a tool call,
 * the tool is executed, the result is fed back, and Claude continues
 * generating.  This loop repeats until Claude produces a final text-only
 * response (up to a maximum of {@link maxIterations} to prevent runaway loops).
 *
 * Returns the final screenplay text (which may have been updated by tools).
 */
async function runConversationLoop(
  client: Anthropic,
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  screenplay: string,
  controller: ReadableStreamDefaultController,
  mode: string,
  maxIterations = 10,
): Promise<string> {
  let currentScreenplay = screenplay;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Stream the response from Claude.
    const tokenLimit = mode === 'writers-room' ? 8192 : 4096;
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: tokenLimit,
      system: systemPrompt,
      messages,
      tools: formatToolsForAPI(mode),
    });

    // Collect streamed text deltas and forward them to the client.
    stream.on('text', (text) => {
      controller.enqueue(encodeChunk({ type: 'text', content: text }));
    });

    // Await the final message to inspect content blocks.
    const finalMessage = await stream.finalMessage();

    // Check for tool use blocks.
    const toolUseBlocks = finalMessage.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (toolUseBlocks.length === 0) {
      // No tool calls -- conversation turn is complete.
      break;
    }

    // Process each tool call.
    const toolResultContents: Anthropic.ToolResultBlockParam[] = [];

    for (const toolBlock of toolUseBlocks) {
      // Notify the client about the tool call.
      controller.enqueue(
        encodeChunk({
          type: 'tool_call',
          name: toolBlock.name,
          input: toolBlock.input,
        }),
      );

      // Execute the tool against the current screenplay.
      const toolResult = executeToolCall(
        toolBlock.name,
        toolBlock.input as Record<string, unknown>,
        currentScreenplay,
      );

      // Update screenplay state if the tool mutated it.
      if (toolResult.updatedScreenplay) {
        const patch = computePatch(currentScreenplay, toolResult.updatedScreenplay);
        currentScreenplay = toolResult.updatedScreenplay;

        // Send compact patch alongside full text (backward compat).
        controller.enqueue(
          encodeChunk({
            type: 'tool_result',
            name: toolBlock.name,
            result: toolResult.result,
            ...(patch ? { patch } : {}),
            updatedScreenplay: toolResult.updatedScreenplay,
          }),
        );
      } else {
        controller.enqueue(
          encodeChunk({
            type: 'tool_result',
            name: toolBlock.name,
            result: toolResult.result,
          }),
        );
      }

      // Collect the tool result for the next API call.
      toolResultContents.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: toolResult.result,
      });
    }

    // Append the assistant's response and tool results to the message history
    // so Claude can continue processing.
    messages.push({
      role: 'assistant',
      content: finalMessage.content,
    });
    messages.push({
      role: 'user',
      content: toolResultContents,
    });
  }

  return currentScreenplay;
}
