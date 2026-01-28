'use client';

// ---------------------------------------------------------------------------
// DialogueAnalysisResult -- Rich UI for dialogue analysis tool results
// ---------------------------------------------------------------------------
//
// Renders dialogue analysis results with:
// - Summary statistics header
// - Per-comparison cards with distinctive features and investigation prompts
// - Dismiss/undo functionality for investigation prompts
// - Expandable examples
// ---------------------------------------------------------------------------

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useDialogueDismissalsStore } from '@/lib/store/dialogue-dismissals';
import { useProjectStore } from '@/lib/store/project';
import {
  PATTERN_CONFIG,
  type DialogueAnalysisResult,
  type CharacterComparison,
  type InvestigationPrompt,
} from '@/lib/agent/dialogue-types';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Check,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X,
  Undo2,
  Users,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DialogueAnalysisResultProps {
  /** The structured analysis result. */
  result: DialogueAnalysisResult;
  /** Additional CSS classes. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ComparisonCardProps {
  comparison: CharacterComparison;
  projectId: string | null;
}

function ComparisonCard({ comparison, projectId }: ComparisonCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const dismiss = useDialogueDismissalsStore((s) => s.dismiss);
  const undismiss = useDialogueDismissalsStore((s) => s.undismiss);
  const getForPair = useDialogueDismissalsStore((s) => s.getForPair);

  // Track locally dismissed prompts for immediate UI feedback
  const [localDismissals, setLocalDismissals] = useState<Set<string>>(new Set());

  const handleDismiss = useCallback(
    (prompt: InvestigationPrompt) => {
      if (!projectId) return;
      dismiss(
        projectId,
        comparison.characterA,
        comparison.characterB,
        prompt.patternType,
        'Marked as intentional by user'
      );
      setLocalDismissals((prev) => new Set(prev).add(prompt.patternType));
    },
    [projectId, comparison.characterA, comparison.characterB, dismiss]
  );

  const handleUndismiss = useCallback(
    (prompt: InvestigationPrompt) => {
      if (!projectId) return;
      const dismissals = getForPair(
        projectId,
        comparison.characterA,
        comparison.characterB
      );
      const dismissal = dismissals.find((d) => d.patternType === prompt.patternType);
      if (dismissal) {
        undismiss(dismissal.id);
      }
      setLocalDismissals((prev) => {
        const next = new Set(prev);
        next.delete(prompt.patternType);
        return next;
      });
    },
    [projectId, comparison.characterA, comparison.characterB, getForPair, undismiss]
  );

  // Filter out dismissed prompts
  const activePrompts = comparison.investigationPrompts.filter(
    (p) => !localDismissals.has(p.patternType)
  );

  // Determine border color based on assessment
  const borderColor =
    comparison.assessment === 'distinct'
      ? 'border-l-green-500'
      : comparison.assessment === 'similar'
        ? 'border-l-amber-500'
        : 'border-l-blue-500';

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/30 overflow-hidden',
        'border-l-4',
        borderColor
      )}
    >
      {/* Header */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full px-3 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">
                {comparison.characterA} vs {comparison.characterB}
              </span>
              {comparison.assessment === 'distinct' && (
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              )}
              {comparison.assessment === 'similar' && (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            {/* Assessment */}
            <p className="text-xs text-muted-foreground">
              {comparison.assessmentDescription}
            </p>

            {/* What's Working */}
            {(comparison.distinctiveFeaturesA.length > 0 ||
              comparison.distinctiveFeaturesB.length > 0) && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  What&apos;s working
                </p>
                <div className="space-y-1 pl-4">
                  {comparison.distinctiveFeaturesA.map((f, i) => (
                    <div key={`a-${i}`} className="text-xs text-foreground">
                      <span className="font-medium">{comparison.characterA}:</span>{' '}
                      {f.observation}
                      {f.example && (
                        <span className="text-muted-foreground italic ml-1">
                          &ldquo;{f.example}&rdquo;
                        </span>
                      )}
                    </div>
                  ))}
                  {comparison.distinctiveFeaturesB.map((f, i) => (
                    <div key={`b-${i}`} className="text-xs text-foreground">
                      <span className="font-medium">{comparison.characterB}:</span>{' '}
                      {f.observation}
                      {f.example && (
                        <span className="text-muted-foreground italic ml-1">
                          &ldquo;{f.example}&rdquo;
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Worth Investigating */}
            {activePrompts.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  Worth investigating
                </p>
                <div className="space-y-2 pl-4">
                  {activePrompts.map((prompt, i) => (
                    <InvestigationPromptItem
                      key={`${prompt.patternType}-${i}`}
                      prompt={prompt}
                      onDismiss={() => handleDismiss(prompt)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Dismissed prompts (collapsed) */}
            {localDismissals.size > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground mb-1">
                  {localDismissals.size} pattern(s) marked as intentional
                </p>
                <div className="flex flex-wrap gap-1">
                  {comparison.investigationPrompts
                    .filter((p) => localDismissals.has(p.patternType))
                    .map((prompt) => (
                      <button
                        key={prompt.patternType}
                        onClick={() => handleUndismiss(prompt)}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-muted rounded hover:bg-muted-foreground/20 transition-colors"
                      >
                        <Undo2 className="w-2.5 h-2.5" />
                        {PATTERN_CONFIG[prompt.patternType].label}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface InvestigationPromptItemProps {
  prompt: InvestigationPrompt;
  onDismiss: () => void;
}

function InvestigationPromptItem({ prompt, onDismiss }: InvestigationPromptItemProps) {
  const [showExamples, setShowExamples] = useState(false);

  return (
    <div className="text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-foreground">{prompt.question}</p>
          {prompt.metric !== undefined && (
            <p className="text-muted-foreground text-[10px] mt-0.5">
              {prompt.metricLabel}: {prompt.metric}
              {prompt.metricLabel?.includes('%') ? '' : ''}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
        >
          <X className="w-3 h-3 mr-0.5" />
          Intentional
        </Button>
      </div>

      {/* Examples toggle */}
      {prompt.examples && prompt.examples.length > 0 && (
        <Collapsible open={showExamples} onOpenChange={setShowExamples}>
          <CollapsibleTrigger asChild>
            <button className="text-[10px] text-muted-foreground hover:text-foreground mt-1 flex items-center gap-0.5">
              {showExamples ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              See examples
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 space-y-1 pl-2 border-l-2 border-border">
              {prompt.examples.map((ex, i) => (
                <p key={i} className="text-muted-foreground">
                  <span className="font-medium">{ex.character}:</span>{' '}
                  &ldquo;{ex.line}&rdquo;
                </p>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DialogueAnalysisResultView({
  result,
  className,
}: DialogueAnalysisResultProps) {
  const projectId = useProjectStore((s) => s.activeProjectId);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Summary Header */}
      <div className="bg-muted/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold">Dialogue Analysis</h4>
          <span className="text-xs text-muted-foreground">
            {result.summary.charactersAnalyzed} characters analyzed
          </span>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-xs">
          {result.summary.distinctPairs > 0 && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              <span>{result.summary.distinctPairs} distinct</span>
            </div>
          )}
          {result.summary.overlapPairs > 0 && (
            <div className="flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              <span>{result.summary.overlapPairs} to explore</span>
            </div>
          )}
          {result.summary.similarPairs > 0 && (
            <div className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>{result.summary.similarPairs} similar</span>
            </div>
          )}
        </div>

        {/* Top strengths */}
        {result.summary.topStrengths.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground mb-1">Top strengths:</p>
            <div className="space-y-0.5">
              {result.summary.topStrengths.map((strength, i) => (
                <p key={i} className="text-xs text-foreground">
                  {strength}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comparison Cards */}
      {result.comparisons.length > 0 && (
        <div className="space-y-2">
          {result.comparisons.map((comparison, i) => (
            <ComparisonCard
              key={`${comparison.characterA}-${comparison.characterB}-${i}`}
              comparison={comparison}
              projectId={projectId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
