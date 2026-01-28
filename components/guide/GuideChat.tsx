'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useStoryBibleStore } from '@/lib/store/story-bible';
import { useProjectStore } from '@/lib/store/project';
import { useOutlineStore } from '@/lib/store/outline';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GuideMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GuideChatProps {
  /** Context from the project creation form. */
  guideContext: {
    projectTitle?: string;
    genre?: string;
    logline?: string;
    notes?: string;
  };
  /** Called when the user requests outline generation. */
  onRequestOutline: () => void;
  /** Whether the outline generation phase is active. */
  isFinalizingOutline: boolean;
}

// ---------------------------------------------------------------------------
// Tool call dispatcher -- maps NDJSON tool_call events to Zustand actions
// ---------------------------------------------------------------------------

function dispatchGuideToolCall(name: string, input: Record<string, unknown>) {
  const store = useStoryBibleStore.getState();

  switch (name) {
    case 'update_genre':
      store.setGenre(input.genre as string);
      break;
    case 'update_tone':
      store.setTone(input.tone as string);
      break;
    case 'update_logline':
      store.setLogline(input.logline as string);
      break;
    case 'update_synopsis':
      store.setSynopsis(input.synopsis as string);
      break;
    case 'add_theme':
      store.addTheme(input.theme as string);
      break;
    case 'add_character': {
      store.addCharacter(input.name as string);
      // Update the just-added character with extra fields.
      const bible = useStoryBibleStore.getState().bible;
      const char = bible?.characters.find((c) => c.name === input.name);
      if (char) {
        const updates: Record<string, string> = {};
        if (input.description) updates.description = input.description as string;
        if (input.arc) updates.arc = input.arc as string;
        if (input.notes) updates.notes = input.notes as string;
        if (Object.keys(updates).length > 0) {
          store.updateCharacter(char.id, updates);
        }
      }
      break;
    }
    case 'add_character_relationship': {
      const bible = useStoryBibleStore.getState().bible;
      const charName = (input.characterName as string) ?? '';
      const relatedName = (input.relatedCharacterName as string) ?? '';
      const relationship = (input.relationship as string) ?? '';
      const char = bible?.characters.find(
        (c) => c.name.toLowerCase() === charName.toLowerCase(),
      );
      if (char) {
        store.updateCharacter(char.id, {
          relationships: [
            ...char.relationships,
            { characterId: relatedName, relationship },
          ],
        });
      }
      break;
    }
    case 'add_location': {
      store.addLocation(input.name as string);
      // Update the just-added location with description.
      if (input.description) {
        const bible = useStoryBibleStore.getState().bible;
        const loc = bible?.locations.find((l) => l.name === input.name);
        if (loc) {
          store.updateLocation(loc.id, {
            description: input.description as string,
          });
        }
      }
      break;
    }
    case 'update_beat': {
      const bible = useStoryBibleStore.getState().bible;
      const beatName = input.beatName as string;
      const beat = bible?.beatSheet.find((b) => b.beat === beatName);
      if (beat) {
        store.updateBeat(beat.id, {
          description: (input.description as string) ?? '',
          completed: true,
        });
      }
      break;
    }
    case 'generate_scene_outline': {
      const outlineStore = useOutlineStore.getState();
      const bible = useStoryBibleStore.getState().bible;
      const lastScene = outlineStore.outline?.scenes.at(-1);
      const beatName = input.beat as string | undefined;
      const beatId = beatName
        ? bible?.beatSheet.find((b) => b.beat === beatName)?.id ?? null
        : null;
      outlineStore.addPlannedScene(lastScene?.id ?? null, {
        heading: input.heading as string,
        summary: input.summary as string,
        beatId,
      });
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GuideChat({
  guideContext,
  onRequestOutline,
  isFinalizingOutline,
}: GuideChatProps) {
  const [messages, setMessages] = useState<GuideMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceId = useProjectStore((s) => s.voiceId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: GuideMessage = { role: 'user', content: text };
      const updated = [...messages, userMsg];
      setMessages(updated);
      setInputValue('');
      setIsLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            mode: 'story-guide',
            voiceId,
            screenplay: '',
            history: updated.map((m) => ({ role: m.role, content: m.content })),
            guideContext,
          }),
        });

        if (!response.ok) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: 'Error communicating with AI. Please try again.' },
          ]);
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

        // Add placeholder assistant message.
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

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
                setMessages((prev) => {
                  const msgs = [...prev];
                  msgs[msgs.length - 1] = { role: 'assistant', content: accumulated };
                  return msgs;
                });
              }

              // Dispatch tool calls to the Bible store.
              if (parsed.type === 'tool_call' && parsed.name && parsed.input) {
                dispatchGuideToolCall(
                  parsed.name as string,
                  parsed.input as Record<string, unknown>,
                );
              }
            } catch {
              // Skip non-JSON lines.
            }
          }

          if (done) break;
        }
      } catch {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: 'Connection error. Please try again.' },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, voiceId, guideContext],
  );

  const handleStartGuide = useCallback(() => {
    setHasStarted(true);
    const initialPrompt = guideContext.logline
      ? `I want to develop a screenplay. Here's my initial concept: ${guideContext.logline}. Help me build this out using the Save the Cat beat sheet.`
      : 'Help me develop a screenplay from scratch using the Save the Cat beat sheet. Let\'s start with the core concept.';
    sendMessage(initialPrompt);
  }, [sendMessage, guideContext]);

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
              Start Story Development
            </Button>
          </div>
        ) : (
          <div className="space-y-4 max-w-2xl mx-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
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

      {/* Input area */}
      {hasStarted && (
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
