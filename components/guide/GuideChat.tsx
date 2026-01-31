'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { useStoryBibleStore } from '@/lib/store/story-bible';
import { useProjectStore } from '@/lib/store/project';
import { useGuideChatStore } from '@/lib/store/guide-chat';
import { useAgentQuestionStore } from '@/lib/store/agent-questions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { executeGuideTool } from '@/lib/guide/tool-executor';
import AgentQuestionPanel from '@/components/chat/AgentQuestionPanel';
import type { AgentQuestion, QuestionResponse } from '@/lib/agent/question-tools';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GuideChatProps {
  /** Called when the user requests outline generation. */
  onRequestOutline: () => void;
  /** Whether the outline generation phase is active. */
  isFinalizingOutline: boolean;
  /** Called when streaming completes (AI finishes responding). */
  onStreamingComplete?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GuideChat({
  onRequestOutline,
  isFinalizingOutline,
  onStreamingComplete,
}: GuideChatProps) {
  // Store state
  const messages = useGuideChatStore((s) => s.messages);
  const hasStarted = useGuideChatStore((s) => s.hasStarted);
  const guideContext = useGuideChatStore((s) => s.guideContext);
  const addMessage = useGuideChatStore((s) => s.addMessage);
  const updateLastMessage = useGuideChatStore((s) => s.updateLastMessage);
  const setHasStarted = useGuideChatStore((s) => s.setHasStarted);
  const persistCurrentSession = useGuideChatStore((s) => s.persistCurrentSession);

  // Question panel state
  const questionPending = useAgentQuestionStore((s) => s.isAwaitingResponse);
  const setPendingQuestion = useAgentQuestionStore((s) => s.setPendingQuestion);

  // Local state for input and loading
  const [inputValue, setInputValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceId = useProjectStore((s) => s.voiceId);

  // Ref to hold the latest sendMessage function to avoid stale closures in callbacks
  const sendMessageRef = useRef<(text: string) => Promise<void>>(undefined);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      // Add user message to store
      addMessage({ role: 'user', content: text });
      setInputValue('');
      setIsLoading(true);

      // Build history from store messages
      const history = [...messages, { role: 'user' as const, content: text }].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            mode: 'story-guide',
            voiceId,
            screenplay: '',
            history,
            guideContext,
          }),
        });

        if (!response.ok) {
          addMessage({ role: 'assistant', content: 'Error communicating with AI. Please try again.' });
          setIsLoading(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setIsLoading(false);
          return;
        }

        const decoder = new TextDecoder();
        let accumulated = '';
        let lineBuffer = '';

        // Add placeholder assistant message
        addMessage({ role: 'assistant', content: '' });

        while (true) {
          const { done, value } = await reader.read();

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
            if (!trimmed) continue;

            try {
              const parsed = JSON.parse(trimmed);

              if (parsed.type === 'text' && typeof parsed.content === 'string') {
                accumulated += parsed.content;
                updateLastMessage(accumulated);
              }

              // Dispatch tool calls using the centralized executor.
              if (parsed.type === 'tool_call' && parsed.name && parsed.input) {
                // Handle ask_question tool specially - show the question UI
                if (parsed.name === 'ask_question') {
                  const input = parsed.input as {
                    header?: string;
                    question?: string;
                    options?: Array<{ id: string; label: string; description?: string }>;
                    multiSelect?: boolean;
                    allowCustom?: boolean;
                    customPlaceholder?: string;
                  };

                  if (input.header && input.question && input.options?.length) {
                    const questionData: AgentQuestion = {
                      id: `guide-q-${Date.now()}`,
                      header: input.header,
                      question: input.question,
                      options: input.options,
                      multiSelect: input.multiSelect,
                      allowCustom: input.allowCustom ?? true,
                      customPlaceholder: input.customPlaceholder,
                    };

                    // Set up the question with a callback that sends the response
                    setPendingQuestion(questionData, (response: QuestionResponse) => {
                      // Format response as a user message
                      let responseText = '';
                      if (response.selectedLabels.length > 0) {
                        responseText = response.selectedLabels.join(', ');
                      }
                      if (response.customText) {
                        responseText = responseText
                          ? `${responseText}. ${response.customText}`
                          : response.customText;
                      }
                      if (!responseText) {
                        responseText = 'Skip this question';
                      }
                      // Send the response as a new message (use ref to avoid stale closure)
                      sendMessageRef.current?.(responseText);
                    });
                  }
                } else {
                  executeGuideTool(
                    parsed.name as string,
                    parsed.input as Record<string, unknown>,
                  );
                }
              }
            } catch {
              // Skip non-JSON lines.
            }
          }

          if (done) break;
        }

        // Persist session after streaming completes
        await persistCurrentSession();
      } catch {
        // Update last message with error
        updateLastMessage('Connection error. Please try again.');
      } finally {
        setIsLoading(false);
        onStreamingComplete?.();
      }
    },
    [messages, isLoading, voiceId, guideContext, addMessage, updateLastMessage, persistCurrentSession, onStreamingComplete, setPendingQuestion],
  );

  // Keep the ref updated with the latest sendMessage function
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const handleStartGuide = useCallback(() => {
    setHasStarted(true);
    const initialPrompt = guideContext.logline
      ? `I want to develop a screenplay. Here's my initial concept: ${guideContext.logline}. Help me build this out using the Save the Cat beat sheet.`
      : 'Help me develop a screenplay from scratch using the Save the Cat beat sheet. Let\'s start with the core concept.';
    sendMessage(initialPrompt);
  }, [sendMessage, guideContext, setHasStarted]);

  const handleGenerateOutline = useCallback(() => {
    onRequestOutline();
    sendMessage(
      'I\'m ready to generate the full scene-by-scene outline. Based on everything we\'ve developed, create a complete outline using the generate_scene_outline tool for each scene. Cover the full story from opening to final image.',
    );
  }, [sendMessage, onRequestOutline]);

  const completedBeats = useStoryBibleStore(
    (s) => s.bible?.beatSheet.filter((b) => b.completed).length ?? 0,
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {!hasStarted ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-16 px-8 space-y-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Story Development Guide
              </h2>
              <p className="text-sm max-w-md">
                Build your screenplay&apos;s story bible through guided conversation.
                The AI will walk you through the Save the Cat beat sheet,
                developing your characters, world, and story structure.
              </p>
              {guideContext.projectTitle && (
                <p className="text-xs text-primary font-medium mt-2">
                  Project: {guideContext.projectTitle}
                </p>
              )}
            </div>
            <Button
              size="lg"
              className="gap-2"
              onClick={handleStartGuide}
            >
              <Sparkles className="h-4 w-4" />
              {messages.length > 0 ? 'Continue Story Development' : 'Start Story Development'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`text-sm rounded-lg px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary/10 text-foreground ml-12'
                    : 'bg-muted text-foreground mr-12'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2">
                    <ReactMarkdown>
                      {msg.content || (isLoading && idx === messages.length - 1 ? '...' : '')}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Question Panel */}
      {questionPending && (
        <div className="shrink-0 p-4 border-t border-border">
          <div className="max-w-2xl mx-auto">
            <AgentQuestionPanel />
          </div>
        </div>
      )}

      {/* Input area */}
      {hasStarted && !questionPending && (
        <div className="shrink-0 p-4 border-t border-border">
          {/* Generate outline button */}
          {completedBeats >= 5 && !isFinalizingOutline && (
            <div className="flex justify-center mb-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleGenerateOutline}
                disabled={isLoading}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate Scene Outline ({completedBeats}/15 beats ready)
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{isFinalizingOutline ? 'Generating outline...' : 'Thinking...'}</span>
            </div>
          )}

          <div className="flex items-end gap-2 max-w-2xl mx-auto">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(inputValue);
                }
              }}
              placeholder="Describe your story ideas..."
              disabled={isLoading}
              className="min-h-[44px] max-h-[120px] resize-none text-sm"
              rows={1}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={() => sendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
