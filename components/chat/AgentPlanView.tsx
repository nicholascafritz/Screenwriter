'use client';

// ---------------------------------------------------------------------------
// AgentPlanView -- Displays the agent's execution plan and progress
// ---------------------------------------------------------------------------

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Pause,
  Play,
  XCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentPlanViewProps {
  plan: {
    steps: {
      description: string;
      status: 'pending' | 'in_progress' | 'completed';
    }[];
    approach: string;
  };
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  isRunning: boolean;
  isPaused: boolean;
}

// ---------------------------------------------------------------------------
// Step status icon
// ---------------------------------------------------------------------------

function StepIcon({ status }: { status: 'pending' | 'in_progress' | 'completed' }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'in_progress':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    case 'pending':
      return <Circle className="h-4 w-4 text-muted-foreground/50" />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AgentPlanView({
  plan,
  onPause,
  onResume,
  onCancel,
  isRunning,
  isPaused,
}: AgentPlanViewProps) {
  const completedCount = plan.steps.filter((s) => s.status === 'completed').length;
  const totalSteps = plan.steps.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      {/* Approach summary */}
      <div className="text-sm font-medium text-foreground">
        {plan.approach}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>
            {completedCount}/{totalSteps} steps ({progressPercent}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              progressPercent === 100
                ? 'bg-green-500'
                : 'bg-primary',
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-1.5">
        {plan.steps.map((step, idx) => (
          <div
            key={idx}
            className={cn(
              'flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              step.status === 'in_progress' && 'bg-primary/5',
              step.status === 'completed' && 'text-muted-foreground',
            )}
          >
            <div className="mt-0.5 shrink-0">
              <StepIcon status={step.status} />
            </div>
            <span
              className={cn(
                step.status === 'completed' && 'line-through opacity-60',
                step.status === 'in_progress' && 'font-medium text-foreground',
              )}
            >
              {idx + 1}. {step.description}
            </span>
          </div>
        ))}
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-2 pt-1">
        {isRunning && !isPaused && onPause && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPause}
            className="gap-1.5"
          >
            <Pause className="h-3.5 w-3.5" />
            Pause
          </Button>
        )}

        {isPaused && onResume && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResume}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Resume
          </Button>
        )}

        {(isRunning || isPaused) && onCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </Button>
        )}

        {!isRunning && !isPaused && progressPercent === 100 && (
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            All steps completed
          </div>
        )}
      </div>
    </div>
  );
}
