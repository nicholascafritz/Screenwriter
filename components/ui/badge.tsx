'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium leading-none whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-primary/10 text-primary border border-primary/20',
        secondary:
          'bg-secondary text-secondary-foreground border border-border',
        outline: 'text-foreground border border-border',
        destructive:
          'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/20',
        status:
          'bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info)]/20',
        success:
          'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/20',
        warning:
          'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning)]/20',
        danger:
          'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/20',
        info:
          'bg-muted text-muted-foreground border border-border',
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
