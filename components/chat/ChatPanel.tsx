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
import { Send, Trash2, Loader2, ArrowRight, GitCompare, Check, X } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatSessionList from './ChatSessionList';
import { useOperationsStore } from '@/lib/store/operations';
import {
  useLiveEditStore,
  generateEditId,
  calculateAffectedLines,
} from '@/lib/store/live-edit';
import { getEditorHandle } from '@/components/editor/ScreenplayEditor';
import { startLiveEditAnimation } from '@/lib/editor/animation-engine';
import ModeIndicator from './ModeIndicator';
import ContextBudgetIndicator from './ContextBudget';
import VoiceSelector from '@/components/voice/VoiceSelector';
import { buildContextComponents, type ContextBudget } from '@/lib/context/budget-manager';
import { useAgentTodoStore } from '@/lib/store/agent-todos';
import { useAgentQuestionStore } from '@/lib/store/agent-questions';
import AgentTodoPanel from './AgentTodoPanel';
import AgentQuestionPanel from './AgentQuestionPanel';
import type { AgentTodo } from '@/lib/agent/todo-tools';
import type { AgentQuestion, QuestionResponse } from '@/lib/agent/question-tools';
import { formatQuestionResponse } from '@/lib/agent/question-tools';

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
  const pendingProposal = useEditorStore((s) => s.pendingProposal);
  const pendingProposalDescription = useEditorStore((s) => s.pendingProposalDescription);
  const acceptPendingProposal = useEditorStore((s) => s.acceptPendingProposal);
  const rejectPendingProposal = useEditorStore((s) => s.rejectPendingProposal);

  const voiceId = useProjectStore((s) => s.voiceId);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);

  const todosVisible = useAgentTodoStore((s) => s.isVisible);
  const awaitingApproval = useAgentTodoStore((s) => s.awaitingApproval);
  const approvePlan = useAgentTodoStore((s) => s.approvePlan);
  const clearTodos = useAgentTodoStore((s) => s.clearTodos);

  const questionPending = useAgentQuestionStore((s) => s.isAwaitingResponse);
  const clearQuestion = useAgentQuestionStore((s) => s.clearQuestion);

  // -- Local state ----------------------------------------------------------

  const [inputValue, setInputValue] = useState('');
  const [contextBudget, setContextBudget] = useState<ContextBudget | null>(null);
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

  // -- Update context budget on changes -------------------------------------

  useEffect(() => {
    if (!activeProjectId) {
      setContextBudget(null);
      return;
    }

    // Debounce budget calculation to avoid excessive recalculations.
    const timeout = setTimeout(() => {
      const chatHistory = messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const { budget } = buildContextComponents({
        screenplayText: content,
        projectId: activeProjectId,
        chatMessages: chatHistory,
        cursorScene: currentScene ?? undefined,
      });

      setContextBudget(budget);
    }, 300);

    return () => clearTimeout(timeout);
  }, [content, messages, activeProjectId, currentScene]);

  // -- Slash command preprocessing ------------------------------------------

  const preprocessMessage = useCallback((text: string): { text: string; modeSwitch?: AIMode; modeOnly?: boolean } => {
    const lower = text.toLowerCase().trim();

    // Check for mode-switching slash commands
    if (lower === '/brainstorm' || lower === '/plan') {
      return { text: '', modeSwitch: 'writers-room', modeOnly: true };
    }
    if (lower === '/ask' || lower === '/review') {
      return { text: '', modeSwitch: 'diff', modeOnly: true };
    }
    if (lower === '/write' || lower === '/auto' || lower === '/agent') {
      return { text: '', modeSwitch: 'inline', modeOnly: true };
    }

    // Check for mode prefix with message (e.g., "/write fix the dialogue")
    if (lower.startsWith('/brainstorm ') || lower.startsWith('/plan ')) {
      const msg = text.replace(/^\/(brainstorm|plan)\s+/i, '');
      return { text: msg, modeSwitch: 'writers-room' };
    }
    if (lower.startsWith('/ask ') || lower.startsWith('/review ')) {
      const msg = text.replace(/^\/(ask|review)\s+/i, '');
      return { text: msg, modeSwitch: 'diff' };
    }
    if (lower.startsWith('/write ') || lower.startsWith('/auto ') || lower.startsWith('/agent ')) {
      const msg = text.replace(/^\/(write|auto|agent)\s+/i, '');
      return { text: msg, modeSwitch: 'inline' };
    }

    return { text };
  }, []);

  // -- Send message ---------------------------------------------------------

  const sendMessage = useCallback(async (overrideText?: string, overrideMode?: AIMode) => {
    const rawText = (overrideText ?? inputValue).trim();
    if (!rawText || isStreaming) return;

    // Process slash commands
    const processed = preprocessMessage(rawText);

    // If it's just a mode switch command (no message), switch mode and return
    if (processed.modeOnly && processed.modeSwitch) {
      setMode(processed.modeSwitch);
      setInputValue('');
      // Add a system-style message to indicate mode change
      const modeNames: Record<AIMode, string> = {
        'writers-room': 'Brainstorm',
        'diff': 'Ask',
        'inline': 'Write',
      };
      addMessage({
        role: 'assistant',
        content: `Switched to **${modeNames[processed.modeSwitch]}** mode.`,
        mode: processed.modeSwitch,
      });
      return;
    }

    // Apply mode switch if present
    const activeMode = overrideMode ?? processed.modeSwitch ?? mode;
    if (processed.modeSwitch) {
      setMode(processed.modeSwitch);
    }

    const text = processed.text;
    if (!text) return;

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
    // All modes use the /api/chat endpoint
    const endpoint = '/api/chat';
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

                // In Ask mode (diff), store as pending proposal for approval.
                // In Write mode (inline), queue for live animation.
                if (activeMode === 'diff') {
                  const proposedContent = parsed.updatedScreenplay || content;
                  useEditorStore.getState().setPendingProposal(proposedContent, toolName);
                } else {
                  // Flush any pending human edits and capture content before AI edit.
                  const editorState = useEditorStore.getState();
                  editorState.flushPendingDiff();
                  const beforeContent = editorState.content;

                  // Calculate affected line range from hunks.
                  const hunks = parsed.patch?.hunks || [];
                  const { startLine, endLine } = calculateAffectedLines(hunks);

                  // Queue the edit for live animation.
                  useLiveEditStore.getState().queueEdit({
                    id: generateEditId(),
                    toolName,
                    sceneName,
                    hunks,
                    fullContent: parsed.updatedScreenplay || beforeContent,
                    beforeContent,
                    startLine,
                    endLine,
                  });

                  // Start animation if not already running.
                  const liveEditState = useLiveEditStore.getState();
                  if (!liveEditState.isAnimating) {
                    const handle = getEditorHandle();
                    if (handle) {
                      // Mark as AI editing to suppress human-edit recording.
                      useEditorStore.setState({ _isAIEditing: true });
                      startLiveEditAnimation(handle);
                    }
                  }
                }
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

              // Handle todo_write tool calls - update the todo store.
              if (parsed.type === 'tool_call' && parsed.name === 'todo_write') {
                const newTodos = parsed.input?.todos as AgentTodo[] | undefined;
                if (newTodos && Array.isArray(newTodos)) {
                  useAgentTodoStore.getState().setTodos(newTodos);
                }
              }

              // Handle ask_question tool calls - show question UI and wait for response.
              if (parsed.type === 'tool_call' && parsed.name === 'ask_question') {
                const questionInput = parsed.input as Omit<AgentQuestion, 'id'> | undefined;
                if (questionInput && questionInput.options) {
                  const question: AgentQuestion = {
                    ...questionInput,
                    id: `q-${Date.now()}`,
                  };

                  // Set up question with response callback
                  useAgentQuestionStore.getState().setPendingQuestion(
                    question,
                    (response: QuestionResponse) => {
                      // Format the response and add as a user message to continue the conversation
                      const responseText = formatQuestionResponse(response);
                      // Add as assistant context (the AI will see this in the next turn)
                      const state = useChatStore.getState();
                      const msgs = [...state.messages];
                      if (msgs.length > 0) {
                        const last = { ...msgs[msgs.length - 1] };
                        last.content += `\n\n**User selected:** ${responseText}`;
                        msgs[msgs.length - 1] = last;
                        useChatStore.setState({ messages: msgs });
                      }
                    }
                  );
                }
              }

              // Prefer patch-based incremental update; fall back to full text.
              if (parsed.patch?.hunks || parsed.updatedScreenplay) {
                const toolName = parsed.name || parsed.toolName || 'AI edit';
                const sceneName = parsed.sceneName || undefined;

                // In Ask mode (diff), store as pending proposal for approval.
                // In Write mode (inline), queue for live animation.
                if (activeMode === 'diff') {
                  const proposedContent = parsed.updatedScreenplay || content;
                  useEditorStore.getState().setPendingProposal(proposedContent, toolName);
                } else {
                  // Flush any pending human edits and capture content before AI edit.
                  const editorState = useEditorStore.getState();
                  editorState.flushPendingDiff();
                  const beforeContent = editorState.content;

                  // Calculate affected line range from hunks.
                  const hunks = parsed.patch?.hunks || [];
                  const { startLine, endLine } = calculateAffectedLines(hunks);

                  // Queue the edit for live animation.
                  useLiveEditStore.getState().queueEdit({
                    id: generateEditId(),
                    toolName,
                    sceneName,
                    hunks,
                    fullContent: parsed.updatedScreenplay || beforeContent,
                    beforeContent,
                    startLine,
                    endLine,
                  });

                  // Start animation if not already running.
                  const liveEditState = useLiveEditStore.getState();
                  if (!liveEditState.isAnimating) {
                    const handle = getEditorHandle();
                    if (handle) {
                      // Mark as AI editing to suppress human-edit recording.
                      useEditorStore.setState({ _isAIEditing: true });
                      startLiveEditAnimation(handle);
                    }
                  }
                }
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

      // Auto-title the session after the first exchange.
      useChatStore.getState().autoTitleSession();
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
    setMode,
    preprocessMessage,
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
    clearTodos();
    clearQuestion();
  }, [isStreaming, clearMessages, clearTodos, clearQuestion]);

  // -- Todo panel handlers ----------------------------------------------------

  const handleTodoCancel = useCallback(() => {
    // Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Clear todos and live edit queue
    clearTodos();
    useLiveEditStore.getState().clearQueue();
  }, [clearTodos]);

  // Handle plan approval - sends a continuation message to execute the approved plan
  const handlePlanApproval = useCallback(() => {
    const todoStore = useAgentTodoStore.getState();
    const currentTodos = todoStore.todos;

    // Build a message that includes the approved plan
    const planSummary = currentTodos.map((t, i) => `${i + 1}. ${t.content}`).join('\n');
    const continuationMessage = `Plan approved. Execute these steps:\n${planSummary}`;

    // Clear approval state (but keep todos visible for progress tracking)
    todoStore.approvePlan();

    // Send follow-up message to continue execution
    sendMessage(continuationMessage, mode);
  }, [sendMessage, mode]);

  // -- Upgrade from Brainstorm to Write mode ----------------------------------

  const handleUpgrade = useCallback(() => {
    setMode('inline'); // Switch to Write mode
    sendMessage(
      'Please implement the ideas we discussed above. Analyze the screenplay first, then make the changes.',
      'inline',
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
      {/* Header: Mode indicator, voice selector, and context budget */}
      <div className="shrink-0 space-y-2 p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">AI Chat</h2>
            <ModeIndicator />
          </div>
          <div className="flex items-center gap-1">
            {contextBudget && (
              <ContextBudgetIndicator budget={contextBudget} />
            )}
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
        </div>
        <VoiceSelector className="w-full" />
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
        {/* Agent question panel (clarifying questions) */}
        {questionPending && <AgentQuestionPanel />}

        {/* Agent todo panel (Write mode multi-step tasks) */}
        {todosVisible && (
          <AgentTodoPanel
            onApprove={handlePlanApproval}
            onCancel={handleTodoCancel}
          />
        )}

        {/* Pending proposal indicator (Ask mode) */}
        {pendingProposal && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <GitCompare className="h-3.5 w-3.5" />
              <span className="font-medium">
                Changes proposed{pendingProposalDescription ? `: ${pendingProposalDescription}` : ''}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Review the diff in the editor panel, then accept or reject.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={rejectPendingProposal}
                className="flex-1 gap-1 h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <X className="h-3 w-3" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={acceptPendingProposal}
                className="flex-1 gap-1 h-7 text-xs bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Check className="h-3 w-3" />
                Accept
              </Button>
            </div>
          </div>
        )}

        {/* Upgrade to Write mode button (Brainstorm only) */}
        {mode === 'writers-room' && messages.length > 0 && !isStreaming && !pendingProposal && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpgrade}
            className="w-full gap-2 text-xs"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            Apply Ideas (Switch to Write)
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
