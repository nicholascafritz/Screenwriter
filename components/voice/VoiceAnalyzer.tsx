'use client';

// ---------------------------------------------------------------------------
// VoiceAnalyzer -- Writing sample analysis with suggestions
// ---------------------------------------------------------------------------
//
// Side-by-side interface for:
// - Left: Writing sample input (paste/type) with word count
// - Right: Analysis suggestions with apply buttons
// ---------------------------------------------------------------------------

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useVoiceStore, type AnalysisSuggestion } from '@/lib/store/voice';
import type { VoiceProfile, VoiceComponent } from '@/lib/agent/voices';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import VoiceSuggestionCard from './VoiceSuggestionCard';
import {
  Sparkles,
  FileText,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceAnalyzerProps {
  voice: VoiceProfile;
  onApplyToVoice: (updates: Partial<VoiceProfile>) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_WORDS = 2000;
const MIN_WORDS = 100;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoiceAnalyzer({
  voice,
  onApplyToVoice,
  className,
}: VoiceAnalyzerProps) {
  const [sampleText, setSampleText] = useState('');
  const [appliedAspects, setAppliedAspects] = useState<Set<string>>(new Set());

  const {
    isAnalyzing,
    analysisSuggestions,
    analysisMetrics,
    analysisError,
    analyzeWritingSample,
    clearAnalysis,
  } = useVoiceStore();

  // Word count
  const wordCount = useMemo(() => {
    return sampleText.trim().split(/\s+/).filter(Boolean).length;
  }, [sampleText]);

  const isValidLength = wordCount >= MIN_WORDS && wordCount <= MAX_WORDS;
  const isTooShort = wordCount > 0 && wordCount < MIN_WORDS;
  const isTooLong = wordCount > MAX_WORDS;

  // Handle analysis
  const handleAnalyze = async () => {
    if (!isValidLength) return;
    setAppliedAspects(new Set());
    await analyzeWritingSample(sampleText);
  };

  // Handle applying a single suggestion
  const handleApplySuggestion = (suggestion: AnalysisSuggestion) => {
    const updatedComponents = voice.components.map((c) =>
      c.aspect === suggestion.aspect
        ? { ...c, style: suggestion.suggestedStyle, weight: suggestion.suggestedWeight }
        : c
    );
    onApplyToVoice({ components: updatedComponents });
    setAppliedAspects((prev) => new Set([...Array.from(prev), suggestion.aspect]));
  };

  // Handle applying all suggestions
  const handleApplyAll = () => {
    if (!analysisSuggestions) return;

    const suggestionMap = new Map(
      analysisSuggestions.map((s) => [s.aspect, s])
    );

    const updatedComponents = voice.components.map((c) => {
      const suggestion = suggestionMap.get(c.aspect);
      if (suggestion) {
        return {
          ...c,
          style: suggestion.suggestedStyle,
          weight: suggestion.suggestedWeight,
        };
      }
      return c;
    });

    onApplyToVoice({ components: updatedComponents });
    setAppliedAspects(new Set(analysisSuggestions.map((s) => s.aspect)));
  };

  // Get current style/weight for an aspect
  const getCurrentForAspect = (
    aspect: VoiceComponent['aspect']
  ): { style: string; weight: number } | undefined => {
    const component = voice.components.find((c) => c.aspect === aspect);
    return component ? { style: component.style, weight: component.weight } : undefined;
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* Left Panel - Sample Input */}
      <div className="w-2/5 flex flex-col border-r border-border">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Writing Sample</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste a sample of your writing (100-2000 words) to analyze your style.
          </p>
        </div>

        <div className="flex-1 p-4 flex flex-col">
          <Textarea
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            placeholder="Paste your writing sample here...

This could be a scene from a screenplay, a short story, dialogue excerpts, or any prose that represents your writing style.

The AI will analyze your word choice, sentence structure, pacing, dialogue patterns, and overall tone to suggest voice profile settings."
            className="flex-1 min-h-[300px] text-sm resize-none"
          />

          {/* Word count indicator */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  isTooLong
                    ? 'danger'
                    : isTooShort
                    ? 'warning'
                    : wordCount === 0
                    ? 'secondary'
                    : 'success'
                }
                className="text-[10px]"
              >
                {wordCount} / {MAX_WORDS} words
              </Badge>
              {isTooShort && (
                <span className="text-xs text-warning">
                  Need at least {MIN_WORDS} words
                </span>
              )}
              {isTooLong && (
                <span className="text-xs text-destructive">
                  Exceeds {MAX_WORDS} word limit
                </span>
              )}
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!isValidLength || isAnalyzing}
              size="sm"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Analyze
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Metrics section (shown after analysis) */}
        {analysisMetrics && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sample Metrics
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-lg font-semibold text-foreground">
                  {analysisMetrics.wordCount}
                </div>
                <div className="text-[10px] text-muted-foreground">Words</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-foreground">
                  {Math.round(analysisMetrics.dialoguePercentage * 100)}%
                </div>
                <div className="text-[10px] text-muted-foreground">Dialogue</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-foreground">
                  {analysisMetrics.avgSentenceLength.toFixed(1)}
                </div>
                <div className="text-[10px] text-muted-foreground">Avg Sentence</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Suggestions */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium">Style Suggestions</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Review detected patterns and apply to your voice profile
            </p>
          </div>
          {analysisSuggestions && (
            <Button
              onClick={handleApplyAll}
              size="sm"
              variant="default"
              disabled={appliedAspects.size === analysisSuggestions.length}
            >
              <CheckCircle2 className="h-3 w-3" />
              Apply All
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 p-4">
          {/* Error state */}
          {analysisError && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 mb-4">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Analysis Failed
                </p>
                <p className="text-xs text-destructive/80">{analysisError}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAnalysis}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Loading state */}
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Analyzing your writing style...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This may take a few seconds
              </p>
            </div>
          )}

          {/* Empty state */}
          {!isAnalyzing && !analysisSuggestions && !analysisError && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">
                No analysis yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Paste a writing sample and click Analyze to get started
              </p>
            </div>
          )}

          {/* Suggestions list */}
          {analysisSuggestions && (
            <div className="space-y-3">
              {analysisSuggestions.map((suggestion) => {
                const current = getCurrentForAspect(suggestion.aspect);
                return (
                  <VoiceSuggestionCard
                    key={suggestion.aspect}
                    suggestion={suggestion}
                    currentStyle={current?.style}
                    currentWeight={current?.weight}
                    isApplied={appliedAspects.has(suggestion.aspect)}
                    onApply={() => handleApplySuggestion(suggestion)}
                  />
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
