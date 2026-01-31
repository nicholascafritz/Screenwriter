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
          'bg-amber-500 text-gray-950',
        secondary:
          'bg-gray-800 text-gray-400',
        outline:
          'border border-gray-700 text-gray-100 bg-transparent',
        success:
          'bg-green-500/15 text-green-400 border border-green-500/30',
        warning:
          'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        error:
          'bg-red-500/15 text-red-400 border border-red-500/30',
        info:
          'bg-blue-500/15 text-blue-400 border border-blue-500/30',
        destructive:
          'bg-red-500/15 text-red-400 border border-red-500/30',
        danger:
          'bg-red-500/15 text-red-400 border border-red-500/30',
        status:
          'bg-blue-500/15 text-blue-400 border border-blue-500/30',
        // Scene-specific badges
        int:
          'bg-green-500/15 text-green-400 border border-green-500/30',
        ext:
          'bg-blue-500/15 text-blue-400 border border-blue-500/30',
        mixed:
          'bg-purple-500/15 text-purple-400 border border-purple-500/30',
        // Mode badges
        'mode-inline':
          'bg-green-500/15 text-green-400 border border-green-500/30',
        'mode-diff':
          'bg-blue-500/15 text-blue-400 border border-blue-500/30',
        'mode-agent':
          'bg-teal-500/15 text-teal-400 border border-teal-500/30',
        'mode-writers-room':
          'bg-amber-500/15 text-amber-400 border border-amber-500/30',
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
