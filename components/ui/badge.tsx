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
          'bg-[var(--color-success-bg)] text-[var(--badge-int-text)] border border-[var(--badge-int-border)]',
        warning:
          'bg-primary/15 text-primary border border-primary/30',
        error:
          'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/30',
        info:
          'bg-[var(--color-info-bg)] text-[var(--badge-ext-text)] border border-[var(--badge-ext-border)]',
        destructive:
          'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/30',
        danger:
          'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/30',
        status:
          'bg-[var(--color-info-bg)] text-[var(--badge-ext-text)] border border-[var(--badge-ext-border)]',
        // Scene-specific badges
        int:
          'bg-[var(--badge-int-bg)] text-[var(--badge-int-text)] border border-[var(--badge-int-border)]',
        ext:
          'bg-[var(--badge-ext-bg)] text-[var(--badge-ext-text)] border border-[var(--badge-ext-border)]',
        mixed:
          'bg-[var(--badge-mixed-bg)] text-[var(--badge-mixed-text)] border border-[var(--badge-mixed-border)]',
        // Mode badges
        'mode-inline':
          'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30',
        'mode-diff':
          'bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info)]/30',
        'mode-agent':
          'bg-[var(--teal-500)]/15 text-[var(--teal-400)] border border-[var(--teal-500)]/30',
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
