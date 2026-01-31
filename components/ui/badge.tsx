'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded px-2 h-5 text-micro font-semibold whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground',
        secondary:
          'bg-secondary text-secondary-foreground',
        outline:
          'border border-border text-foreground bg-transparent',
        success:
          'bg-success-500/15 text-success-400 border border-success-500/30',
        warning:
          'bg-primary/15 text-primary border border-primary/30',
        error:
          'bg-error-500/15 text-error-400 border border-error-500/30',
        info:
          'bg-info-500/15 text-info-400 border border-info-500/30',
        destructive:
          'bg-error-500/15 text-error-400 border border-error-500/30',
        danger:
          'bg-error-500/15 text-error-400 border border-error-500/30',
        status:
          'bg-info-500/15 text-info-400 border border-info-500/30',
        // Scene-specific badges
        int:
          'bg-success-500/15 text-success-400 border border-success-500/30',
        ext:
          'bg-info-500/15 text-info-400 border border-info-500/30',
        mixed:
          'bg-purple-500/15 text-purple-400 border border-purple-500/30',
        // Mode badges
        'mode-inline':
          'bg-success-500/15 text-success-400 border border-success-500/30',
        'mode-diff':
          'bg-info-500/15 text-info-400 border border-info-500/30',
        'mode-agent':
          'bg-teal-500/15 text-teal-400 border border-teal-500/30',
        'mode-writers-room':
          'bg-primary/15 text-primary border border-primary/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
