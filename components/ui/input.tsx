'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-surface px-4 py-3 font-ui text-sm leading-normal text-foreground transition-all duration-normal',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
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
Input.displayName = 'Input';

export { Input };
