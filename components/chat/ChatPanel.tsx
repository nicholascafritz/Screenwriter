'use client';

// ---------------------------------------------------------------------------
// ChatPanel -- Main AI chat sidebar panel
// ---------------------------------------------------------------------------
//
// Displays the chat message history, a text input for sending messages,
// the current AI mode indicator, a voice selector, and streaming support.
// Messages are sent to /api/chat (or /api/agent for agent mode) and
// streamed back via ReadableStream.
// ---------------------------------------------------------------------------

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { useChatStore, type AIMode } from '@/lib/store/chat';
import { useEditorStore } from '@/lib/store/editor';
import { useProjectStore } from '@/lib/store/project';
import { getVoiceById, PRESET_VOICES } from '@/lib/agent/voices';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Send, Trash2, Loader2, ArrowRight } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatSessionList from './ChatSessionList';
import { useOperationsStore } from '@/lib/store/operations';
import ModeSelector from './ModeSelector';
import VoiceSelector from '@/components/voice/VoiceSelector';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatPanelProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatPanel({ className }: ChatPanelProps) {
  // -- Store bindings -------------------------------------------------------

  const messages = useChatStore((s) => s.messages);
  const mode = useChatStore((s) => s.mode);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateLastMessage = useChatStore((s) => s.updateLastMessage);
  const setMode = useChatStore((s) => s.setMode);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const isCompacting = useChatStore((s) => s.isCompacting);

  const content = useEditorStore((s) => s.content);
  const currentScene = useEditorStore((s) => s.currentScene);
  const selection = useEditorStore((s) => s.selection);
  const setContent = useEditorStore((s) => s.setContent);

  const voiceId = useProjectStore((s) => s.voiceId);

  // -- Local state ----------------------------------------------------------

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // -- Auto-scroll to bottom on new messages --------------------------------

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // -- Send message ---------------------------------------------------------

  const sendMessage = useCallback(async (overrideText?: string, overrideMode?: AIMode) => {
    const text = (overrideText ?? inputValue).trim();
    const activeMode = overrideMode ?? mode;
    if (!text || isStreaming) return;

    // Add the user message.
    addMessage({
      role: 'user',
      content: text,
      mode: activeMode,
    });
    if (!overrideText) setInputValue('');

    // Create the assistant placeholder message.
    addMessage({
      role: 'assistant',
      content: '',
      mode: activeMode,
      isStreaming: true,
    });

    setStreaming(true);
    useOperationsStore.getState().setAIActive(true);

    // Check if context should be compacted before sending.
    try {
      const { shouldCompact, estimateTokens } = await import('@/lib/chat/token-estimator');
      const chatState = useChatStore.getState();
      const historyMessages = chatState.messages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const screenplayTokens = estimateTokens(content);
      if (shouldCompact(historyMessages, screenplayTokens)) {
        await chatState.compactHistory();
      }
    } catch {
      // If compaction check fails, proceed with the full history.
    }

    // Resolve the current voice profile.
    const voice = getVoiceById(voiceId) ?? PRESET_VOICES[0];

    // Build the request payload (re-read messages after possible compaction).
    const endpoint = activeMode === 'agent' ? '/api/agent' : '/api/chat';
    const payload = {
      message: text,
      mode: activeMode,
      voiceId: voice.id,
      screenplay: content,
      cursorScene: currentScene ?? undefined,
      selection: selection ?? undefined,
      history: useChatStore.getState().messages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    // Abort any previous in-flight request.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        updateLastMessage(`Error: ${response.status} - ${errorText}`);
        setStreaming(false);
        return;
      }

      // Stream the response.
      const reader = response.body?.getReader();
      if (!reader) {
        updateLastMessage('Error: No response stream available.');
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = '';
      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();

        // Buffer chunks and split on newlines so that large NDJSON
        // lines (e.g. tool results containing the full updated
        // screenplay) are fully assembled before JSON.parse.
        let lines: string[];
        if (done) {
          lines = lineBuffer ? [lineBuffer] : [];
        } else {
          const chunk = decoder.decode(value, { stream: true });
          lineBuffer += chunk;
          const splitLines = lineBuffer.split('\n');
          lineBuffer = splitLines.pop() ?? '';
          lines = splitLines;
        }

        for (const line of lines) {
          const trimmed = line.trim();

          // Skip empty lines.
          if (!trimmed) continue;

          // Check for SSE data lines.
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);

            // End-of-stream marker.
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              // Prefer patch-based incremental update; fall back to full text.
              if (parsed.patch?.hunks || parsed.updatedScreenplay) {
                const toolName = parsed.toolName || parsed.name || 'AI edit';
                const sceneName = parsed.sceneName || undefined;

                // Log the operation.
                const opId = useOperationsStore.getState().startOperation(
                  toolName, `Editing${sceneName ? `: ${sceneName}` : ''}`, sceneName,
                );

                // Flush any pending human edits and capture content before AI edit.
                const editorState = useEditorStore.getState();
                editorState.flushPendingDiff();
                const beforeContent = editorState.content;

                // Mark as AI editing to suppress human-edit recording.
                useEditorStore.setState({ _isAIEditing: true });

                if (parsed.patch?.hunks) {
                  useEditorStore.getState().applyPatch(parsed.patch.hunks);
                } else if (parsed.updatedScreenplay) {
                  setContent(parsed.updatedScreenplay);
                }

                // Record the AI edit to the timeline.
                useEditorStore.getState().recordAIEdit(
                  beforeContent,
                  `AI: ${toolName}`,
                  sceneName,
                );

                useEditorStore.setState({ _isAIEditing: false });

                // Mark operation complete.
                useOperationsStore.getState().completeOperation(opId);
              }

              // If it contains a text delta, append it.
              if (parsed.delta) {
                accumulated += parsed.delta;
                updateLastMessage(accumulated);
              }

              // If it contains a full content replacement.
              if (parsed.content && !parsed.delta) {
                accumulated = parsed.content;
                updateLastMessage(accumulated);
              }

              // If it has tool calls, update the last message to include them.
              if (parsed.toolCalls) {
                const state = useChatStore.getState();
                const msgs = [...state.messages];
                if (msgs.length > 0) {
                  const last = { ...msgs[msgs.length - 1] };
                  last.toolCalls = parsed.toolCalls;
                  msgs[msgs.length - 1] = last;
                  useChatStore.setState({ messages: msgs });
                }
              }
            } catch {
              // Not JSON -- treat as plain text delta.
              accumulated += data;
              updateLastMessage(accumulated);
            }
          } else {
            // Try to parse as NDJSON (newline-delimited JSON from /api/chat).
            try {
              const parsed = JSON.parse(trimmed);

              // Skip the done marker.
              if (parsed.type === 'done') continue;

              // Prefer patch-based incremental update; fall back to full text.
              if (parsed.patch?.hunks || parsed.updatedScreenplay) {
                const toolName = parsed.name || parsed.toolName || 'AI edit';
                const sceneName = parsed.sceneName || undefined;

                // Log the operation.
                const opId = useOperationsStore.getState().startOperation(
                  toolName, `Editing${sceneName ? `: ${sceneName}` : ''}`, sceneName,
                );

                // Flush any pending human edits and capture content before AI edit.
                const editorState = useEditorStore.getState();
                editorState.flushPendingDiff();
                const beforeContent = editorState.content;

                // Mark as AI editing to suppress human-edit recording.
                useEditorStore.setState({ _isAIEditing: true });

                if (parsed.patch?.hunks) {
                  useEditorStore.getState().applyPatch(parsed.patch.hunks);
                } else if (parsed.updatedScreenplay) {
                  setContent(parsed.updatedScreenplay);
                }

                // Record the AI edit to the timeline.
                useEditorStore.getState().recordAIEdit(
                  beforeContent,
                  `AI: ${toolName}`,
                  sceneName,
                );

                useEditorStore.setState({ _isAIEditing: false });

                // Mark operation complete.
                useOperationsStore.getState().completeOperation(opId);
              }

              // Accumulate text content.
              if (parsed.type === 'text' && typeof parsed.content === 'string') {
                accumulated += parsed.content;
                updateLastMessage(accumulated);
              }

              // Handle tool calls metadata.
              if (parsed.toolCalls) {
                const state = useChatStore.getState();
                const msgs = [...state.messages];
                if (msgs.length > 0) {
                  const last = { ...msgs[msgs.length - 1] };
                  last.toolCalls = parsed.toolCalls;
                  msgs[msgs.length - 1] = last;
                  useChatStore.setState({ messages: msgs });
                }
              }
            } catch {
              // Not JSON -- treat as plain text delta.
              accumulated += trimmed;
              updateLastMessage(accumulated);
            }
          }
        }

        if (done) break;
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Request was cancelled by the user or a new request.
        return;
      }
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred';
      updateLastMessage(`Error: ${errorMessage}`);
    } finally {
      setStreaming(false);
      useOperationsStore.getState().setAIActive(false);
      abortControllerRef.current = null;
    }
  }, [
    inputValue,
    isStreaming,
    mode,
    content,
    currentScene,
    selection,
    voiceId,
    addMessage,
    updateLastMessage,
    setStreaming,
    setContent,
  ]);

  // -- Keyboard handler for textarea ----------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  // -- Clear chat -----------------------------------------------------------

  const handleClear = useCallback(() => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    clearMessages();
  }, [isStreaming, clearMessages]);

  // -- Hand off writers room to agent mode ------------------------------------

  const handleHandoff = useCallback(() => {
    setMode('agent');
    sendMessage(
      'Execute the ideas and plan from the Writers Room session above. Analyze the screenplay first, then work through the changes step by step.',
      'agent',
    );
  }, [setMode, sendMessage]);

  // -- Render ---------------------------------------------------------------

  return (
    <div
      className={cn(
        'flex h-full flex-col bg-background border-l border-border',
        className,
      )}
    >
      {/* Header: Voice selector and mode */}
      <div className="shrink-0 space-y-2 p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">AI Chat</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Clear chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <VoiceSelector className="w-full" />
        <ModeSelector className="w-full" />
      </div>

      {/* Chat session list */}
      <ChatSessionList className="border-b border-border" />

      {/* Messages area */}
      <ScrollArea className="flex-1 p-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground p-6">
            <div>
              <p className="font-medium">No messages yet</p>
              <p className="mt-1 text-xs">
                Ask the AI to help with your screenplay. It can edit scenes,
                suggest dialogue, analyze structure, and more.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <Separator />

      {/* Input area */}
      <div className="shrink-0 p-3 space-y-2">
        {/* Hand off to agent button (writers room only) */}
        {mode === 'writers-room' && messages.length > 0 && !isStreaming && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleHandoff}
            className="w-full gap-2 text-xs"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Hand Off to Agent
          </Button>
        )}

        {/* Compacting indicator */}
        {isCompacting && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Compacting context...</span>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && !isCompacting && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>AI is responding...</span>
          </div>
        )}

        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your screenplay..."
            disabled={isStreaming}
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button
            size="icon"
            onClick={() => sendMessage()}
            disabled={isStreaming || !inputValue.trim()}
            className="h-9 w-9 shrink-0"
            aria-label="Send message"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
