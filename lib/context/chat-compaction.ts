// ---------------------------------------------------------------------------
// Chat Compaction -- AI-powered summarization of chat history
// ---------------------------------------------------------------------------
//
// Replaces naive truncation with intelligent summarization that preserves:
//   - Decisions made
//   - Creative directions established
//   - Constraints identified
//   - Writer preferences expressed
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk';
import { estimateTokens } from './budget-manager';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  /** Tool calls made in this message (for assistant messages) */
  toolCalls?: { name: string; result?: string }[];
}

export interface CompactionResult {
  /** The compacted summary */
  summary: string;
  /** Key decisions preserved */
  decisions: string[];
  /** Creative directions established */
  directions: string[];
  /** Constraints or preferences identified */
  constraints: string[];
  /** Number of messages compacted */
  messagesCompacted: number;
  /** Token savings achieved */
  tokensSaved: number;
}

export interface CompactedChatHistory {
  /** Summary of compacted portion */
  compactedSummary: CompactionResult;
  /** Recent messages kept in full */
  recentMessages: ChatMessage[];
  /** Total message count (compacted + recent) */
  totalMessages: number;
}

// ---------------------------------------------------------------------------
// Compaction Implementation
// ---------------------------------------------------------------------------

const COMPACTION_SYSTEM_PROMPT = `You are a conversation summarizer for a screenwriting assistant. Your task is to extract and preserve the essential information from a conversation history.

You must identify and preserve:
1. **Decisions Made**: Concrete choices about the screenplay (character names, plot points, scene changes)
2. **Creative Directions**: Stylistic preferences, tone choices, voice adjustments
3. **Constraints**: Things the writer said NOT to do, or limits they established
4. **Context**: Background information the writer shared about their project

You must discard:
- Pleasantries and greetings
- Repeated information
- Abandoned ideas that were rejected
- Technical details about tool calls (keep only the outcomes)
- General screenwriting advice that isn't specific to this project

Output format:
<decisions>
- Decision 1
- Decision 2
</decisions>

<directions>
- Creative direction 1
- Creative direction 2
</directions>

<constraints>
- Constraint 1
- Constraint 2
</constraints>

<summary>
A 2-3 sentence summary of the conversation's main topics and outcomes.
</summary>`;

/**
 * Compact a portion of chat history using AI summarization.
 * Preserves key decisions, directions, and constraints while reducing token count.
 */
export async function compactChatHistory(
  messages: ChatMessage[],
  keepRecentCount: number = 4,
): Promise<CompactedChatHistory> {
  // If not enough messages to compact, return as-is
  if (messages.length <= keepRecentCount) {
    return {
      compactedSummary: {
        summary: '',
        decisions: [],
        directions: [],
        constraints: [],
        messagesCompacted: 0,
        tokensSaved: 0,
      },
      recentMessages: messages,
      totalMessages: messages.length,
    };
  }

  // Split into messages to compact and messages to keep
  const toCompact = messages.slice(0, -keepRecentCount);
  const toKeep = messages.slice(-keepRecentCount);

  // Format messages for compaction
  const formattedConversation = formatMessagesForCompaction(toCompact);

  // Estimate original tokens
  const originalTokens = estimateTokens(formattedConversation);

  // Call AI for compaction
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 1000,
    system: COMPACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Please summarize this screenwriting conversation, preserving all important decisions, creative directions, and constraints:\n\n${formattedConversation}`,
      },
    ],
  });

  // Parse the response
  const responseText =
    response.content[0].type === 'text' ? response.content[0].text : '';

  const compactionResult = parseCompactionResponse(
    responseText,
    toCompact.length,
    originalTokens
  );

  return {
    compactedSummary: compactionResult,
    recentMessages: toKeep,
    totalMessages: messages.length,
  };
}

/**
 * Format messages for the compaction prompt.
 */
function formatMessagesForCompaction(messages: ChatMessage[]): string {
  const lines: string[] = [];

  for (const msg of messages) {
    const role =
      msg.role === 'user'
        ? 'WRITER'
        : msg.role === 'assistant'
          ? 'ASSISTANT'
          : 'SYSTEM';

    let content = msg.content;

    // Summarize tool calls if present
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      const toolSummary = msg.toolCalls.map((t) => t.name).join(', ');
      content += `\n[Used tools: ${toolSummary}]`;
    }

    lines.push(`${role}: ${content}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Parse the AI's compaction response into structured data.
 */
function parseCompactionResponse(
  response: string,
  messagesCompacted: number,
  originalTokens: number,
): CompactionResult {
  const decisions: string[] = [];
  const directions: string[] = [];
  const constraints: string[] = [];
  let summary = '';

  // Extract decisions
  const decisionsMatch = response.match(/<decisions>([\s\S]*?)<\/decisions>/);
  if (decisionsMatch) {
    const items = decisionsMatch[1].match(/^-\s*(.+)$/gm) || [];
    decisions.push(...items.map((i) => i.replace(/^-\s*/, '')));
  }

  // Extract directions
  const directionsMatch = response.match(/<directions>([\s\S]*?)<\/directions>/);
  if (directionsMatch) {
    const items = directionsMatch[1].match(/^-\s*(.+)$/gm) || [];
    directions.push(...items.map((i) => i.replace(/^-\s*/, '')));
  }

  // Extract constraints
  const constraintsMatch = response.match(/<constraints>([\s\S]*?)<\/constraints>/);
  if (constraintsMatch) {
    const items = constraintsMatch[1].match(/^-\s*(.+)$/gm) || [];
    constraints.push(...items.map((i) => i.replace(/^-\s*/, '')));
  }

  // Extract summary
  const summaryMatch = response.match(/<summary>([\s\S]*?)<\/summary>/);
  if (summaryMatch) {
    summary = summaryMatch[1].trim();
  }

  // Calculate token savings
  const compactedText = formatCompactionResultForContext({
    summary,
    decisions,
    directions,
    constraints,
    messagesCompacted,
    tokensSaved: 0, // Will be calculated
  });
  const compactedTokens = estimateTokens(compactedText);
  const tokensSaved = Math.max(0, originalTokens - compactedTokens);

  return {
    summary,
    decisions,
    directions,
    constraints,
    messagesCompacted,
    tokensSaved,
  };
}

/**
 * Format a compaction result for inclusion in context.
 */
export function formatCompactionResultForContext(result: CompactionResult): string {
  if (result.messagesCompacted === 0) return '';

  const lines: string[] = [
    `## Earlier Conversation (${result.messagesCompacted} messages summarized)`,
    '',
  ];

  if (result.summary) {
    lines.push(result.summary);
    lines.push('');
  }

  if (result.decisions.length > 0) {
    lines.push('**Decisions made:**');
    for (const d of result.decisions) {
      lines.push(`- ${d}`);
    }
    lines.push('');
  }

  if (result.directions.length > 0) {
    lines.push('**Creative directions:**');
    for (const d of result.directions) {
      lines.push(`- ${d}`);
    }
    lines.push('');
  }

  if (result.constraints.length > 0) {
    lines.push('**Constraints established:**');
    for (const c of result.constraints) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Incremental Compaction
// ---------------------------------------------------------------------------

/**
 * Merge a new compaction result with an existing one.
 * Used when compacting happens multiple times in a session.
 */
export function mergeCompactionResults(
  existing: CompactionResult,
  newResult: CompactionResult,
): CompactionResult {
  return {
    summary: newResult.summary || existing.summary,
    decisions: [...existing.decisions, ...newResult.decisions],
    directions: [...existing.directions, ...newResult.directions],
    constraints: [...existing.constraints, ...newResult.constraints],
    messagesCompacted: existing.messagesCompacted + newResult.messagesCompacted,
    tokensSaved: existing.tokensSaved + newResult.tokensSaved,
  };
}

/**
 * Check if compaction is recommended based on message count and token usage.
 */
export function shouldCompact(
  messageCount: number,
  estimatedChatTokens: number,
  thresholds = { messages: 10, tokens: 15000 }
): boolean {
  return messageCount > thresholds.messages || estimatedChatTokens > thresholds.tokens;
}
