'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal';
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation = 'vertical', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          orientation === 'vertical'
            ? 'overflow-y-auto overflow-x-hidden'
            : 'overflow-x-auto overflow-y-hidden',
          // Custom scrollbar styling
          '[&::-webkit-scrollbar]:w-2',
          '[&::-webkit-scrollbar]:h-2',
          '[&::-webkit-scrollbar-track]:bg-transparent',
          '[&::-webkit-scrollbar-thumb]:rounded-full',
          '[&::-webkit-scrollbar-thumb]:bg-border/50',
          'hover:[&::-webkit-scrollbar-thumb]:bg-border',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
