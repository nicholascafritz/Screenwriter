'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useStoryBibleStore, SAVE_THE_CAT_BEATS } from '@/lib/store/story-bible';
import { useProjectStore } from '@/lib/store/project';
import { useEditorStore } from '@/lib/store/editor';
import { getVoiceById, PRESET_VOICES } from '@/lib/agent/voices';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface GuideMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIGuideTab() {
  const bible = useStoryBibleStore((s) => s.bible);
  const voiceId = useProjectStore((s) => s.voiceId);
  const content = useEditorStore((s) => s.content);

  const [messages, setMessages] = useState<GuideMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      const voice = getVoiceById(voiceId) ?? PRESET_VOICES[0];

      // Build a story bible context string.
      const bibleContext = bible
        ? [
            bible.genre && `Genre: ${bible.genre}`,
            bible.tone && `Tone: ${bible.tone}`,
            bible.themes.length > 0 && `Themes: ${bible.themes.join(', ')}`,
            bible.logline && `Logline: ${bible.logline}`,
            bible.characters.length > 0 &&
              `Characters: ${bible.characters.map((c) => c.name).join(', ')}`,
          ]
            .filter(Boolean)
            .join('\n')
        : '';

      // Build the guide system prompt.
      const guideSystemPrompt = [
        'You are a story development guide helping a screenwriter develop their screenplay.',
        'Use the Save the Cat beat sheet structure to ask targeted questions.',
        'Be conversational, encouraging, and specific.',
        '',
        'The 15 Save the Cat beats are:',
        ...SAVE_THE_CAT_BEATS.map((b, i) => `${i + 1}. ${b.beat}: ${b.hint}`),
        '',
        bibleContext && `Current story bible context:\n${bibleContext}`,
        '',
        'Ask one focused question at a time. Help the writer develop their ideas.',
        'When they answer, acknowledge their idea and ask a follow-up that deepens it.',
      ]
        .filter(Boolean)
        .join('\n');

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            mode: 'writers-room',
            voiceId: voice.id,
            screenplay: content,
            history: updated.map((m) => ({ role: m.role, content: m.content })),
            systemPromptOverride: guideSystemPrompt,
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

        // Read the streaming response.
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
    [messages, isLoading, bible, voiceId, content],
  );

  const handleStartGuide = useCallback(() => {
    sendMessage(
      'Help me develop my story using the Save the Cat beat sheet. Start with the first beat and ask me about my Opening Image.',
    );
  }, [sendMessage]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 p-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-xs text-muted-foreground py-8 px-4 space-y-3">
            <Sparkles className="h-6 w-6 opacity-40" />
            <div>
              <p className="font-medium">AI Story Guide</p>
              <p className="mt-1 text-[10px]">
                Develop your story bible through guided conversation. The AI will walk you through the Save the Cat beats.
              </p>
            </div>
            <Button size="sm" className="h-7 text-[11px] gap-1" onClick={handleStartGuide}>
              <Sparkles className="h-3 w-3" />
              Start Guided Development
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`text-xs p-2 rounded-md ${
                  msg.role === 'user'
                    ? 'bg-primary/10 text-foreground ml-4'
                    : 'bg-muted text-foreground mr-4'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content || (isLoading && idx === messages.length - 1 ? '...' : '')}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 p-2 border-t border-border">
        {isLoading && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
        <div className="flex items-end gap-1">
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
            className="min-h-[36px] max-h-[80px] resize-none text-xs"
            rows={1}
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => sendMessage(inputValue)}
            disabled={isLoading || !inputValue.trim()}
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
