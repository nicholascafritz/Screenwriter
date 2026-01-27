'use client';

// ---------------------------------------------------------------------------
// ChatMessage -- Renders a single message in the AI chat conversation
// ---------------------------------------------------------------------------

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useChatStore, type ChatMessage as ChatMessageType } from '@/lib/store/chat';
import { ChevronDown, ChevronRight, Wrench, User, Bot, Info, GitBranch, Minimize2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessageProps {
  message: ChatMessageType;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a Unix timestamp (ms) into a short time string.
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Apply simple markdown-like formatting to message content.
 *
 * Supports:
 *   - **bold**
 *   - *italic*
 *   - `inline code`
 *   - ```code blocks```
 *
 * Returns an array of React nodes.
 */
function renderFormattedContent(content: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];

  // Split on code blocks first (triple-backtick).
  const codeBlockParts = content.split(/(```[\s\S]*?```)/g);

  for (let i = 0; i < codeBlockParts.length; i++) {
    const part = codeBlockParts[i];

    if (part.startsWith('```') && part.endsWith('```')) {
      // Code block -- strip the backtick fences.
      const code = part.slice(3, -3).replace(/^\w*\n/, '');
      nodes.push(
        <pre
          key={`code-${i}`}
          className="my-2 overflow-x-auto rounded-md bg-black/30 p-3 text-xs leading-relaxed"
        >
          <code>{code}</code>
        </pre>,
      );
    } else {
      // Inline formatting for non-code-block text.
      const inlineNodes = renderInlineFormatting(part, i);
      nodes.push(...inlineNodes);
    }
  }

  return nodes;
}

function renderInlineFormatting(text: string, keyPrefix: number): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];

  // Split on inline code first.
  const inlineParts = text.split(/(`[^`]+`)/g);

  for (let j = 0; j < inlineParts.length; j++) {
    const segment = inlineParts[j];

    if (segment.startsWith('`') && segment.endsWith('`')) {
      nodes.push(
        <code
          key={`inline-${keyPrefix}-${j}`}
          className="rounded bg-black/20 px-1 py-0.5 text-xs font-mono"
        >
          {segment.slice(1, -1)}
        </code>,
      );
    } else {
      // Apply bold and italic.
      let formatted: React.ReactNode = segment;

      // Bold: **text**
      const boldParts = segment.split(/(\*\*[^*]+\*\*)/g);
      if (boldParts.length > 1) {
        formatted = boldParts.map((bp, bi) => {
          if (bp.startsWith('**') && bp.endsWith('**')) {
            return (
              <strong key={`b-${keyPrefix}-${j}-${bi}`}>
                {bp.slice(2, -2)}
              </strong>
            );
          }
          // Italic within non-bold: *text*
          return renderItalic(bp, `${keyPrefix}-${j}-${bi}`);
        });
      } else {
        formatted = renderItalic(segment, `${keyPrefix}-${j}`);
      }

      nodes.push(
        <React.Fragment key={`text-${keyPrefix}-${j}`}>
          {formatted}
        </React.Fragment>,
      );
    }
  }

  return nodes;
}

function renderItalic(text: string, key: string): React.ReactNode {
  const italicParts = text.split(/(\*[^*]+\*)/g);
  if (italicParts.length <= 1) return text;

  return italicParts.map((ip, ii) => {
    if (ip.startsWith('*') && ip.endsWith('*') && !ip.startsWith('**')) {
      return <em key={`i-${key}-${ii}`}>{ip.slice(1, -1)}</em>;
    }
    return ip;
  });
}

// ---------------------------------------------------------------------------
// ToolCallDisplay -- Collapsible display for tool calls
// ---------------------------------------------------------------------------

function ToolCallDisplay({
  toolCalls,
}: {
  toolCalls: NonNullable<ChatMessageType['toolCalls']>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-2 rounded-md border border-border/50 bg-black/10">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <Wrench className="h-3 w-3" />
        <span>
          {toolCalls.length} tool call{toolCalls.length !== 1 ? 's' : ''}
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-border/50 px-2.5 py-2 space-y-2">
          {toolCalls.map((tc, idx) => (
            <div key={idx} className="text-xs">
              <div className="font-mono font-medium text-foreground/80">
                {tc.name}
              </div>
              <pre className="mt-1 overflow-x-auto rounded bg-black/20 p-1.5 text-[10px] leading-relaxed text-muted-foreground">
                {JSON.stringify(tc.input, null, 2)}
              </pre>
              {tc.result && (
                <div className="mt-1 text-muted-foreground/80 italic">
                  {tc.result.length > 200
                    ? tc.result.slice(0, 200) + '...'
                    : tc.result}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StreamingIndicator -- Pulsing dots shown while AI is generating
// ---------------------------------------------------------------------------

function StreamingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// ContextSummaryCard -- Collapsible display for compacted context summaries
// ---------------------------------------------------------------------------

function ContextSummaryCard({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Strip the "[Context Summary]" prefix and divider for display.
  const summaryText = content
    .replace(/^\[Context Summary\]\s*/, '')
    .replace(/^The following is a summary[\s\S]*?:\n\n/, '')
    .replace(/\n---\nThe conversation continues[\s\S]*$/, '')
    .trim();

  return (
    <div className="rounded-md border border-border/60 bg-muted/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <Minimize2 className="h-3 w-3 shrink-0" />
        <span className="font-medium">Context Summary</span>
        <span className="text-muted-foreground/60 text-[10px]">
          (earlier messages compacted)
        </span>
      </button>
      {isExpanded && (
        <div className="border-t border-border/40 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap">
          {renderFormattedContent(summaryText)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const isContextSummary = isSystem && message.content.startsWith('[Context Summary]');
  const showBranch = !message.isStreaming && !isSystem;

  const handleBranch = useCallback(() => {
    const messages = useChatStore.getState().messages;
    const index = messages.findIndex((m) => m.id === message.id);
    if (index >= 0) {
      useChatStore.getState().branchSession(index);
    }
  }, [message.id]);

  // Render compacted context summaries as a collapsible card.
  if (isContextSummary) {
    return (
      <div className="w-full px-1">
        <ContextSummaryCard content={message.content} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex w-full gap-2',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {/* Avatar icon for assistant / system */}
      {!isUser && (
        <div
          className={cn(
            'mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
            isAssistant
              ? 'bg-primary/20 text-primary'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {isAssistant ? (
            <Bot className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
        </div>
      )}

      {/* Message bubble */}
      <div
        className={cn(
          'relative max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed',
          isUser && 'bg-primary text-primary-foreground',
          isAssistant && 'bg-muted text-foreground',
          isSystem && 'bg-muted/50 text-muted-foreground italic',
        )}
      >
        {/* Branch button (hover-revealed) */}
        {showBranch && (
          <button
            type="button"
            onClick={handleBranch}
            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Branch from here"
          >
            <GitBranch className="h-3 w-3" />
          </button>
        )}

        {/* Content */}
        <div className="whitespace-pre-wrap break-words">
          {renderFormattedContent(message.content)}
          {message.isStreaming && <StreamingIndicator />}
        </div>

        {/* Tool calls (collapsible) */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallDisplay toolCalls={message.toolCalls} />
        )}

        {/* Timestamp */}
        <div
          className={cn(
            'mt-1 text-[10px]',
            isUser
              ? 'text-primary-foreground/60'
              : 'text-muted-foreground/60',
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>

      {/* Avatar icon for user */}
      {isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
