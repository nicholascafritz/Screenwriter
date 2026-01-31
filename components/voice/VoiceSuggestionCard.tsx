'use client';

// ---------------------------------------------------------------------------
// VoiceSuggestionCard -- Display a single voice analysis suggestion
// ---------------------------------------------------------------------------
//
// Shows the detected style, weight, and confidence for one aspect of the
// writing voice, with an "Apply" button to transfer the suggestion to the
// voice editor.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { VoiceComponent } from '@/lib/agent/voices';
import type { AnalysisSuggestion } from '@/lib/store/voice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  MessageSquare,
  Layers,
  Clapperboard,
  Timer,
  Palette,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceSuggestionCardProps {
  suggestion: AnalysisSuggestion;
  currentStyle?: string;
  currentWeight?: number;
  isApplied?: boolean;
  onApply: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ASPECT_ICONS: Record<VoiceComponent['aspect'], React.ElementType> = {
  dialogue: MessageSquare,
  structure: Layers,
  action: Clapperboard,
  pacing: Timer,
  tone: Palette,
};

const ASPECT_LABELS: Record<VoiceComponent['aspect'], string> = {
  dialogue: 'Dialogue',
  structure: 'Structure',
  action: 'Action',
  pacing: 'Pacing',
  tone: 'Tone',
};

function formatStyle(style: string): string {
  return style
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Medium';
  return 'Low';
}

function getConfidenceVariant(
  confidence: number
): 'success' | 'warning' | 'default' {
  if (confidence >= 0.8) return 'success';
  if (confidence >= 0.6) return 'default';
  return 'warning';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoiceSuggestionCard({
  suggestion,
  currentStyle,
  currentWeight,
  isApplied,
  onApply,
  className,
}: VoiceSuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const Icon = ASPECT_ICONS[suggestion.aspect];
  const label = ASPECT_LABELS[suggestion.aspect];
  const weightPercent = Math.round(suggestion.suggestedWeight * 100);
  const confidencePercent = Math.round(suggestion.confidence * 100);

  // Check if suggestion differs from current
  const isDifferent =
    currentStyle !== suggestion.suggestedStyle ||
    (currentWeight !== undefined &&
      Math.abs(currentWeight - suggestion.suggestedWeight) > 0.05);

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all',
        isApplied
          ? 'border-success/50 bg-success/5'
          : isDifferent
          ? 'border-primary/30 bg-primary/5'
          : 'border-border',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'p-1.5 rounded-md',
              isApplied ? 'bg-success/10' : 'bg-muted'
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4',
                isApplied ? 'text-success' : 'text-muted-foreground'
              )}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium text-foreground">{label}</h4>
            <p className="text-xs text-muted-foreground">
              {formatStyle(suggestion.suggestedStyle)} at {weightPercent}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={getConfidenceVariant(suggestion.confidence)}
            className="text-[10px]"
          >
            {getConfidenceLabel(suggestion.confidence)} ({confidencePercent}%)
          </Badge>
          {isApplied ? (
            <Badge variant="success" className="text-[10px]">
              <Check className="h-2.5 w-2.5 mr-0.5" />
              Applied
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onApply}
              className="text-xs h-7"
            >
              Apply
            </Button>
          )}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Confidence</span>
          <span>{confidencePercent}%</span>
        </div>
        <ProgressBar
          value={confidencePercent}
          variant={getConfidenceVariant(suggestion.confidence)}
          showShimmer={false}
        />
      </div>

      {/* Current vs Suggested comparison */}
      {isDifferent && currentStyle && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Current:</span>
          <Badge variant="secondary" className="text-[10px]">
            {formatStyle(currentStyle)}{' '}
            {currentWeight !== undefined && `(${Math.round(currentWeight * 100)}%)`}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant="default" className="text-[10px]">
            {formatStyle(suggestion.suggestedStyle)} ({weightPercent}%)
          </Badge>
        </div>
      )}

      {/* Expandable rationale */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
      >
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {isExpanded ? 'Hide rationale' : 'Show rationale'}
      </button>

      {isExpanded && (
        <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
          {suggestion.rationale}
        </p>
      )}
    </div>
  );
}
