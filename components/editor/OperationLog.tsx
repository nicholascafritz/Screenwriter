'use client';

import React from 'react';
import { useOperationsStore } from '@/lib/store/operations';
import { cn } from '@/lib/utils';
import { Loader2, Check, AlertCircle } from 'lucide-react';

interface OperationLogProps {
  className?: string;
}

export default function OperationLog({ className }: OperationLogProps) {
  const operations = useOperationsStore((s) => s.operations);
  const isAIActive = useOperationsStore((s) => s.isAIActive);

  if (!isAIActive && operations.length === 0) return null;

  return (
    <div
      className={cn(
        'absolute bottom-4 right-4 z-50 w-72 rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-lg overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
        {isAIActive ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        ) : (
          <Check className="h-3.5 w-3.5 text-green-500" />
        )}
        <span className="text-xs font-medium text-foreground">
          {isAIActive ? 'AI Editing...' : 'Edits Complete'}
        </span>
      </div>

      {/* Operations list */}
      {operations.length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          {operations.map((op) => (
            <div
              key={op.id}
              className="flex items-start gap-2 px-3 py-1.5 text-xs border-b border-border/50 last:border-0"
            >
              <div className="mt-0.5 shrink-0">
                {op.status === 'running' ? (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                ) : op.status === 'completed' ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-destructive" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground truncate">
                  {op.toolName}
                </div>
                {op.sceneName && (
                  <div className="text-muted-foreground truncate text-[10px]">
                    {op.sceneName}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
