'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full resize-y rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2.5',
          'text-sm text-gray-100 placeholder:text-gray-500',
          'transition-all duration-150',
          'hover:border-gray-600',
          'focus-visible:outline-none focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/20',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-900',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
