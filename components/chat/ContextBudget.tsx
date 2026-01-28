'use client';

// ---------------------------------------------------------------------------
// ContextBudget -- Token budget indicator and management UI
// ---------------------------------------------------------------------------
//
// Shows how much of the context window is being used and provides
// controls to compact chat history or start fresh.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ContextBudget } from '@/lib/context/budget-manager';
import { useChatStore } from '@/lib/store/chat';
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Minimize2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ContextBudgetIndicatorProps {
  budget: ContextBudget;
  className?: string;
}

export default function ContextBudgetIndicator({
  budget,
  className,
}: ContextBudgetIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const compactHistory = useChatStore((s) => s.compactHistory);
  const startFreshContext = useChatStore((s) => s.startFreshContext);
  const isCompacting = useChatStore((s) => s.isCompacting);
  const shouldCompactNow = useChatStore((s) => s.shouldCompactNow);

  // Color coding based on usage
  const getStatusColor = () => {
    if (budget.overBudget) return 'text-red-400';
    if (budget.percentUsed > 85) return 'text-orange-400';
    if (budget.percentUsed > 70) return 'text-yellow-400';
    return 'text-muted-foreground';
  };

  const getBarColor = () => {
    if (budget.overBudget) return 'bg-red-500';
    if (budget.percentUsed > 85) return 'bg-orange-500';
    if (budget.percentUsed > 70) return 'bg-yellow-500';
    return 'bg-primary';
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 text-xs hover:bg-muted/50 px-2 py-1 rounded transition-colors',
            getStatusColor(),
            className
          )}
        >
          {/* Warning icon if over budget or recommendations exist */}
          {(budget.overBudget || budget.recommendations.length > 0) && (
            <AlertTriangle className="w-3 h-3" />
          )}

          {/* Mini progress bar */}
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                getBarColor()
              )}
              style={{ width: `${Math.min(100, budget.percentUsed)}%` }}
            />
          </div>

          <span className="tabular-nums">{budget.percentUsed}%</span>

          {isExpanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 p-3 bg-muted/30 rounded-lg text-xs space-y-3 min-w-[280px]">
          <div className="font-medium flex items-center justify-between">
            <span>Context Budget</span>
            <span className={getStatusColor()}>
              {(budget.used / 1000).toFixed(0)}K / {(budget.total / 1000).toFixed(0)}K
              tokens
            </span>
          </div>

          {/* Breakdown */}
          <div className="space-y-1.5">
            {budget.breakdown.map((item) => (
              <div key={item.category} className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  {item.category}
                  {!item.reducible && (
                    <span className="text-[10px] text-muted-foreground/60">(fixed)</span>
                  )}
                </span>
                <span className="tabular-nums">{(item.tokens / 1000).toFixed(1)}K</span>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          {budget.recommendations.length > 0 && (
            <div className="pt-2 border-t border-border space-y-1">
              <p className="text-muted-foreground font-medium">Recommendations:</p>
              {budget.recommendations.map((rec, i) => (
                <p key={i} className="text-muted-foreground pl-2">
                  {rec}
                </p>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => compactHistory()}
              disabled={isCompacting || !shouldCompactNow()}
              className="text-xs h-7 flex-1"
            >
              {isCompacting ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Compacting...
                </>
              ) : (
                <>
                  <Minimize2 className="w-3 h-3 mr-1" />
                  Compact Chat
                </>
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  <Trash2 className="w-3 h-3 mr-1" />
                  Fresh Start
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start fresh context?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear your chat history. Your screenplay, Story Bible, and
                    key decisions from earlier conversation will be preserved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => startFreshContext()}>
                    Start Fresh
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
