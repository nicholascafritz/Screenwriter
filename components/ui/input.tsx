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
          'flex h-9 w-full rounded-md border border-gray-700 bg-gray-800/50 px-3 py-2',
          'text-sm text-gray-100 placeholder:text-gray-500',
          'transition-all duration-150',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-gray-100',
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
Input.displayName = 'Input';

export { Input };
