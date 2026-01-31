// ---------------------------------------------------------------------------
// API Route -- /api/agent
// ---------------------------------------------------------------------------
//
// Full autonomous agent mode endpoint.  Accepts a user message with
// screenplay context, first asks Claude to create a plan, then executes
// that plan step-by-step using tool calls.
//
// Multimodel routing:
//   - Planning phase:   Opus 4.5 + thinking  (deepest strategic reasoning)
//   - Execution phase:  Sonnet 4.5 + thinking (creative writing with tools)
//
// This two-model approach uses the strongest model (Opus) for the high-level
// planning that determines the overall approach, then delegates creative
// execution to Sonnet with thinking for fast, high-quality screenplay output.
//
// Streaming format (newline-delimited JSON):
//   {"type":"metadata","phase":"plan","model":"...","thinking":true}
//   {"type":"plan","plan":{"steps":["...","..."],"summary":"..."}}
//   {"type":"metadata","phase":"execute","model":"...","thinking":true}
//   {"type":"step","index":0,"status":"in_progress","description":"..."}
//   {"type":"text","content":"..."}
//   {"type":"tool_call","name":"edit_scene","input":{...}}
//   {"type":"tool_result","name":"edit_scene","result":"...","updatedScreenplay":"..."}
//   {"type":"step","index":0,"status":"completed"}
//   ...
//   {"type":"done"}
// ---------------------------------------------------------------------------

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Agent mode runs many sequential API calls — allow extended execution time.
export const maxDuration = 120;
import { buildSystemPrompt } from '@/lib/agent/prompts';
import { SCREENPLAY_TOOLS, executeToolCall } from '@/lib/agent/tools';
import { getVoiceById, PRESET_VOICES, type VoiceProfile } from '@/lib/agent/voices';
import { computePatch } from '@/lib/diff/patch-transport';
import { buildModelParams } from '@/lib/ai/models';
import { getModelForTask } from '@/lib/ai/model-router';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentRequestBody {
  message: string;
  /** Full voice profile object (preferred for custom voices). */
  voice?: VoiceProfile;
  /** Voice ID for preset lookup (legacy, for backward compatibility). */
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

/** Model configuration for the planning phase (Opus + thinking). */
const PLAN_MODEL = getModelForTask('agent-plan');

/** Model configuration for the execution phase (Sonnet + thinking). */
const EXECUTE_MODEL = getModelForTask('agent-execute');

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
    const { message, voice: bodyVoice, voiceId, screenplay, history } = body;

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
    // Priority: full voice object > voiceId lookup > default preset
    const voice = bodyVoice ?? (voiceId ? getVoiceById(voiceId) : undefined) ?? PRESET_VOICES[0];

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
 * 1. (Opus + thinking) Asks Claude to create a plan for the requested task.
 * 2. Streams the plan to the client.
 * 3. (Sonnet + thinking) Executes the plan by continuing the conversation with tool calls.
 * 4. Streams each step's progress.
 *
 * The planning phase uses Opus with extended thinking for the deepest
 * strategic reasoning.  The execution phase switches to Sonnet with
 * thinking for fast, high-quality creative output with tool coordination.
 *
 * Because the execution phase starts a fresh conversation (with the plan
 * context), there is no cross-model thinking block conflict — each model
 * operates within its own conversation history.
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
  // Phase 1: Ask Claude (Opus + thinking) to create a plan
  // -----------------------------------------------------------------------

  // Emit metadata for the planning phase.
  controller.enqueue(
    encodeChunk({
      type: 'metadata',
      phase: 'plan',
      model: PLAN_MODEL.model,
      label: PLAN_MODEL.label,
      thinking: !!PLAN_MODEL.thinking,
    }),
  );

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

  // Build Opus model parameters for the planning call.
  const planModelParams = buildModelParams(PLAN_MODEL);

  // Use a non-streaming call for the plan to reliably parse the JSON.
  const planResponse = await client.messages.create({
    ...planModelParams,
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

  // -----------------------------------------------------------------------
  // Phase 2: Execute the plan step-by-step (Sonnet + thinking)
  // -----------------------------------------------------------------------

  // Emit metadata for the execution phase.
  controller.enqueue(
    encodeChunk({
      type: 'metadata',
      phase: 'execute',
      model: EXECUTE_MODEL.model,
      label: EXECUTE_MODEL.label,
      thinking: !!EXECUTE_MODEL.thinking,
    }),
  );

  // Build a fresh conversation for execution (avoids cross-model thinking
  // block issues).  Include the original user request and the plan summary
  // so the execution model has full context.
  const executionMessages: Anthropic.MessageParam[] = [
    ...messages,
  ];

  // Inject the plan as an assistant message (text only, no thinking blocks
  // from the Opus call — those belong to a different model's conversation).
  const planTextBlocks = planResponse.content.filter(
    (block): block is Anthropic.TextBlock => block.type === 'text',
  );
  if (planTextBlocks.length > 0) {
    executionMessages.push({
      role: 'assistant',
      content: planTextBlocks,
    });
  }

  // Add a user message instructing Claude to execute the plan.
  executionMessages.push({
    role: 'user',
    content:
      'Great plan. Now execute it step by step. Use the available tools to ' +
      'read, analyze, and modify the screenplay. Announce each step before ' +
      'executing it.',
  });

  // Build Sonnet model parameters for execution.
  const execModelParams = buildModelParams(EXECUTE_MODEL);

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

    // Stream the next response from Claude using the execution model.
    const stream = client.messages.stream({
      ...execModelParams,
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
    // Thinking blocks from Sonnet are preserved in the content array to
    // satisfy the API requirement for multi-turn thinking conversations.
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
