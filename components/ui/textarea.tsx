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
          'flex min-h-[80px] w-full resize-y rounded-md border border-input bg-surface px-4 py-3 font-ui text-sm leading-normal text-foreground transition-all duration-normal',
          'placeholder:text-[var(--color-text-tertiary)]',
          'hover:border-[var(--color-border-strong)]',
          'focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
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
