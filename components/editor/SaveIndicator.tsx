'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, AlertCircle, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface SaveIndicatorProps {
  status: SaveStatus;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SaveIndicator({ status, className }: SaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);

  // Show "Saved" briefly after a save completes, then fade back to idle
  useEffect(() => {
    if (status === 'saved') {
      setShowSaved(true);
      const timer = setTimeout(() => {
        setShowSaved(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Determine what to display
  const displayStatus = status === 'saved' && !showSaved ? 'idle' : status;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs transition-opacity duration-300',
        displayStatus === 'idle' && 'opacity-50',
        className
      )}
    >
      {displayStatus === 'idle' && (
        <>
          <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground hidden sm:inline">Saved to cloud</span>
        </>
      )}

      {displayStatus === 'saving' && (
        <>
          <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}

      {displayStatus === 'saved' && showSaved && (
        <>
          <Check className="h-3.5 w-3.5 text-green-500" />
          <span className="text-green-500">Saved</span>
        </>
      )}

      {displayStatus === 'error' && (
        <>
          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          <span className="text-destructive">Save failed</span>
        </>
      )}
    </div>
  );
}
