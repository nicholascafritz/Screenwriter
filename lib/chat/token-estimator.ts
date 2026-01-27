// ---------------------------------------------------------------------------
// Token Estimator -- Heuristic token counting for context management
// ---------------------------------------------------------------------------
//
// Uses the ~4 characters per token heuristic for quick estimation.
// This is intentionally conservative (overestimates slightly) to ensure
// we compact before hitting actual token limits.
// ---------------------------------------------------------------------------

const CHARS_PER_TOKEN = 4;

/** Threshold at which we trigger auto-compaction (in estimated tokens). */
export const COMPACT_THRESHOLD = 150_000;

/** How many recent messages to preserve verbatim after compaction. */
export const PRESERVE_RECENT = 6;

/**
 * Estimate the number of tokens in a string.
 * Uses the ~4 characters/token heuristic common for English text.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimate the total token count for a conversation history.
 * Includes both user and assistant messages.
 */
export function estimateConversationTokens(
  messages: { role: string; content: string }[],
): number {
  let total = 0;
  for (const msg of messages) {
    // Account for role overhead (~4 tokens per message for role/formatting).
    total += 4;
    total += estimateTokens(msg.content);
  }
  return total;
}

/**
 * Check if the conversation should be compacted.
 */
export function shouldCompact(
  messages: { role: string; content: string }[],
  screenplayTokens: number = 0,
): boolean {
  const conversationTokens = estimateConversationTokens(messages);
  return conversationTokens + screenplayTokens > COMPACT_THRESHOLD;
}
