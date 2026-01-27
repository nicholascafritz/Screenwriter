// ---------------------------------------------------------------------------
// API Route -- /api/agent
// ---------------------------------------------------------------------------
//
// Full autonomous agent mode endpoint.  Accepts a user message with
// screenplay context, first asks Claude to create a plan, then executes
// that plan step-by-step using tool calls.  Streams progress back as
// newline-delimited JSON.
//
// Streaming format (newline-delimited JSON):
//   {"type":"plan","plan":{"steps":["...","..."],"summary":"..."}}
//   {"type":"step","index":0,"status":"in_progress","description":"..."}
//   {"type":"text","content":"..."}
//   {"type":"tool_call","name":"edit_scene","input":{...}}
//   {"type":"tool_result","name":"edit_scene","result":"...","updatedScreenplay":"..."}
//   {"type":"step","index":0,"status":"completed"}
//   {"type":"step","index":1,"status":"in_progress","description":"..."}
//   ...
//   {"type":"done"}
// ---------------------------------------------------------------------------

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Agent mode runs many sequential API calls — allow extended execution time.
export const maxDuration = 120;
import { buildSystemPrompt } from '@/lib/agent/prompts';
import { SCREENPLAY_TOOLS, executeToolCall } from '@/lib/agent/tools';
import { getVoiceById, PRESET_VOICES } from '@/lib/agent/voices';
import { computePatch } from '@/lib/diff/patch-transport';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentRequestBody {
  message: string;
  voiceId?: string;
  screenplay: string;
  history?: Anthropic.MessageParam[];
}

interface AgentPlan {
  summary: string;
  steps: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum tool-use loop iterations to prevent infinite loops. */
const MAX_ITERATIONS = 20;

/** Model configuration for agent mode (higher token budget). */
const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS = 8192;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Encode a JSON object as a newline-delimited chunk for streaming. */
function encodeChunk(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(data) + '\n');
}

/** Format tool definitions for the Anthropic API. */
function formatToolsForAPI(): Anthropic.Tool[] {
  return SCREENPLAY_TOOLS.map((tool) => ({
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
    const body = (await request.json()) as AgentRequestBody;
    const { message, voiceId, screenplay, history } = body;

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

    // Build the system prompt in agent mode.
    const systemPrompt = buildSystemPrompt({
      mode: 'agent',
      voice,
      screenplay,
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
          currentScreenplay = await runAgentLoop(
            client,
            systemPrompt,
            messages,
            currentScreenplay,
            controller,
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
// Agent loop
// ---------------------------------------------------------------------------

/**
 * Runs the full agent loop:
 * 1. Asks Claude to create a plan for the requested task.
 * 2. Streams the plan to the client.
 * 3. Executes the plan by continuing the conversation with tool calls.
 * 4. Streams each step's progress.
 *
 * Returns the final screenplay text.
 */
async function runAgentLoop(
  client: Anthropic,
  systemPrompt: string,
  messages: Anthropic.MessageParam[],
  screenplay: string,
  controller: ReadableStreamDefaultController,
): Promise<string> {
  let currentScreenplay = screenplay;

  // -----------------------------------------------------------------------
  // Phase 1: Ask Claude to create a plan
  // -----------------------------------------------------------------------
  const planMessages: Anthropic.MessageParam[] = [
    ...messages,
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text:
            'Before making any changes, first create a detailed plan. ' +
            'Respond with a JSON object in this exact format:\n' +
            '```json\n' +
            '{\n' +
            '  "summary": "Brief description of what you will do",\n' +
            '  "steps": ["Step 1 description", "Step 2 description", ...]\n' +
            '}\n' +
            '```\n' +
            'Then explain your reasoning briefly after the JSON block.',
        },
      ],
    },
  ];

  // Use a non-streaming call for the plan to reliably parse the JSON.
  const planResponse = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: planMessages,
    tools: formatToolsForAPI(),
  });

  // Extract the plan from the response.
  const plan = extractPlan(planResponse);

  // Stream the plan to the client.
  controller.enqueue(
    encodeChunk({ type: 'plan', plan }),
  );

  // Also stream any text content from the plan response.
  for (const block of planResponse.content) {
    if (block.type === 'text') {
      controller.enqueue(
        encodeChunk({ type: 'text', content: block.text }),
      );
    }
  }

  // Add the plan response to the message history.
  // Replace the planning prompt with the original messages.
  const executionMessages: Anthropic.MessageParam[] = [
    ...messages,
  ];

  // Add an assistant message containing the plan.
  executionMessages.push({
    role: 'assistant',
    content: planResponse.content,
  });

  // Add a user message instructing Claude to execute the plan.
  executionMessages.push({
    role: 'user',
    content:
      'Great plan. Now execute it step by step. Use the available tools to ' +
      'read, analyze, and modify the screenplay. Announce each step before ' +
      'executing it.',
  });

  // -----------------------------------------------------------------------
  // Phase 2: Execute the plan step-by-step
  // -----------------------------------------------------------------------
  let stepIndex = 0;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Notify client about step progress if we have plan steps.
    if (plan.steps.length > 0 && stepIndex < plan.steps.length) {
      controller.enqueue(
        encodeChunk({
          type: 'step',
          index: stepIndex,
          status: 'in_progress',
          description: plan.steps[stepIndex],
        }),
      );
    }

    // Stream the next response from Claude.
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: executionMessages,
      tools: formatToolsForAPI(),
    });

    // Forward text deltas to the client.
    stream.on('text', (text) => {
      controller.enqueue(encodeChunk({ type: 'text', content: text }));
    });

    // Await the final message.
    const finalMessage = await stream.finalMessage();

    // Check for tool use blocks.
    const toolUseBlocks = finalMessage.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    );

    if (toolUseBlocks.length === 0) {
      // No tool calls -- mark current step as completed and finish.
      if (plan.steps.length > 0 && stepIndex < plan.steps.length) {
        controller.enqueue(
          encodeChunk({
            type: 'step',
            index: stepIndex,
            status: 'completed',
          }),
        );
      }
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

    // Mark the current step as completed and advance.
    if (plan.steps.length > 0 && stepIndex < plan.steps.length) {
      controller.enqueue(
        encodeChunk({
          type: 'step',
          index: stepIndex,
          status: 'completed',
        }),
      );
      stepIndex++;
    }

    // Append the assistant response and tool results for the next iteration.
    executionMessages.push({
      role: 'assistant',
      content: finalMessage.content,
    });
    executionMessages.push({
      role: 'user',
      content: toolResultContents,
    });
  }

  return currentScreenplay;
}

// ---------------------------------------------------------------------------
// Plan extraction
// ---------------------------------------------------------------------------

/**
 * Extract a structured plan from Claude's response.  Attempts to parse
 * a JSON block from the text content.  Falls back to a single-step plan
 * if parsing fails.
 */
function extractPlan(response: Anthropic.Message): AgentPlan {
  const defaultPlan: AgentPlan = {
    summary: 'Executing the requested changes.',
    steps: ['Execute the requested changes.'],
  };

  for (const block of response.content) {
    if (block.type !== 'text') continue;

    // Try to extract JSON from a fenced code block.
    const jsonMatch = block.text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    const jsonText = jsonMatch ? jsonMatch[1].trim() : block.text.trim();

    try {
      const parsed = JSON.parse(jsonText);
      if (parsed && typeof parsed.summary === 'string' && Array.isArray(parsed.steps)) {
        return {
          summary: parsed.summary,
          steps: parsed.steps.filter((s: unknown) => typeof s === 'string'),
        };
      }
    } catch {
      // JSON parsing failed -- try to find a JSON object in the text.
      const objectMatch = block.text.match(/\{[\s\S]*"summary"[\s\S]*"steps"[\s\S]*\}/);
      if (objectMatch) {
        try {
          const parsed = JSON.parse(objectMatch[0]);
          if (parsed && typeof parsed.summary === 'string' && Array.isArray(parsed.steps)) {
            return {
              summary: parsed.summary,
              steps: parsed.steps.filter((s: unknown) => typeof s === 'string'),
            };
          }
        } catch {
          // Fall through to default.
        }
      }
    }
  }

  return defaultPlan;
}
