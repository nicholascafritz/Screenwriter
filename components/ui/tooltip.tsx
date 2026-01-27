'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const positionClasses: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = React.useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, 400);
  }, []);

  const hideTooltip = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 whitespace-nowrap rounded-md bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md border border-border',
            'animate-in fade-in-0 zoom-in-95',
            positionClasses[side],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
Tooltip.displayName = 'Tooltip';

export { Tooltip };
