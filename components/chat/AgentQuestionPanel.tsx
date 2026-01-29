'use client';

// ---------------------------------------------------------------------------
// AgentQuestionPanel -- Displays AI clarifying questions with selectable options
// ---------------------------------------------------------------------------
//
// Shows a question from the AI with chip-style options the user can select.
// Supports single-select, multi-select, and optional custom text input.
// Styled to match Claude Code's question presentation.
// ---------------------------------------------------------------------------

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelpCircle, Check, X, ChevronRight } from 'lucide-react';
import {
  useAgentQuestionStore,
  selectCanSubmit,
} from '@/lib/store/agent-questions';
import type { QuestionOption } from '@/lib/agent/question-tools';

// ---------------------------------------------------------------------------
// Option Chip Component
// ---------------------------------------------------------------------------

interface OptionChipProps {
  option: QuestionOption;
  isSelected: boolean;
  onToggle: () => void;
  multiSelect: boolean;
}

function OptionChip({ option, isSelected, onToggle, multiSelect }: OptionChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        // Base chip styles
        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
        'transition-all duration-150 cursor-pointer text-left',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        // Selection states
        isSelected
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-muted/60 text-foreground border border-border hover:bg-muted hover:border-muted-foreground/30'
      )}
    >
      {/* Selection indicator for multi-select */}
      {multiSelect && (
        <div
          className={cn(
            'h-4 w-4 rounded border flex items-center justify-center shrink-0',
            isSelected
              ? 'bg-primary-foreground/20 border-primary-foreground/40'
              : 'border-muted-foreground/40'
          )}
        >
          {isSelected && <Check className="h-3 w-3" />}
        </div>
      )}

      {/* Single-select check */}
      {!multiSelect && isSelected && (
        <Check className="h-4 w-4 shrink-0" />
      )}

      {/* Label */}
      <span className="font-medium">{option.label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface AgentQuestionPanelProps {
  className?: string;
}

export default function AgentQuestionPanel({ className }: AgentQuestionPanelProps) {
  const pendingQuestion = useAgentQuestionStore((s) => s.pendingQuestion);
  const isAwaitingResponse = useAgentQuestionStore((s) => s.isAwaitingResponse);
  const selectedOptionIds = useAgentQuestionStore((s) => s.selectedOptionIds);
  const currentCustomText = useAgentQuestionStore((s) => s.currentCustomText);
  const toggleOption = useAgentQuestionStore((s) => s.toggleOption);
  const setCustomText = useAgentQuestionStore((s) => s.setCustomText);
  const submitResponse = useAgentQuestionStore((s) => s.submitResponse);
  const clearQuestion = useAgentQuestionStore((s) => s.clearQuestion);
  const canSubmit = useAgentQuestionStore(selectCanSubmit);

  if (!isAwaitingResponse || !pendingQuestion) {
    return null;
  }

  const handleSubmit = () => {
    submitResponse();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && canSubmit) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Get selected option descriptions for display
  const selectedDescriptions = pendingQuestion.options
    .filter((opt) => selectedOptionIds.includes(opt.id) && opt.description)
    .map((opt) => ({ label: opt.label, description: opt.description! }));

  const showCustomInput = pendingQuestion.allowCustom !== false;

  return (
    <div
      className={cn(
        'rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
          {pendingQuestion.header}
        </span>
      </div>

      {/* Question text */}
      <p className="text-sm text-foreground leading-relaxed">
        {pendingQuestion.question}
      </p>

      {/* Option chips */}
      <div className="flex flex-wrap gap-2">
        {pendingQuestion.options.map((option) => (
          <OptionChip
            key={option.id}
            option={option}
            isSelected={selectedOptionIds.includes(option.id)}
            onToggle={() => toggleOption(option.id)}
            multiSelect={pendingQuestion.multiSelect ?? false}
          />
        ))}
      </div>

      {/* Selected option descriptions */}
      {selectedDescriptions.length > 0 && (
        <div className="space-y-1 pl-1">
          {selectedDescriptions.map(({ label, description }) => (
            <p key={label} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{label}:</span>{' '}
              {description}
            </p>
          ))}
        </div>
      )}

      {/* Custom input */}
      {showCustomInput && (
        <Input
          type="text"
          placeholder={pendingQuestion.customPlaceholder ?? 'Or describe something else...'}
          value={currentCustomText}
          onChange={(e) => setCustomText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-9 text-sm bg-background"
        />
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="gap-1.5"
        >
          Continue
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearQuestion}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Skip
        </Button>
      </div>

      {/* Multi-select hint */}
      {pendingQuestion.multiSelect && (
        <p className="text-[10px] text-muted-foreground">
          Select all that apply
        </p>
      )}
    </div>
  );
}
