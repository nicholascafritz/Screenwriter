'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  showShimmer?: boolean;
}

const variantClasses: Record<string, string> = {
  default: 'bg-success-500',
  success: 'bg-success-500',
  warning: 'bg-primary',
  danger: 'bg-error-500',
};

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value, max = 100, variant = 'default', showShimmer = true, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          'w-full h-1.5 bg-secondary rounded-full overflow-hidden relative',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-slow relative',
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        >
          {showShimmer && (
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                animation: 'shimmer 2s infinite',
              }}
            />
          )}
        </div>
      </div>
    );
  }
);
ProgressBar.displayName = 'ProgressBar';

export { ProgressBar };
