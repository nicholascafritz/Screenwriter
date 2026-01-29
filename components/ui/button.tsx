'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-ui text-sm font-medium transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 disabled:transform-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-white shadow-sm hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-active)]',
        secondary:
          'bg-secondary text-foreground border border-border hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)]',
        destructive:
          'bg-[var(--color-danger)] text-white shadow-sm hover:bg-[var(--color-danger-hover)]',
        success:
          'bg-[var(--color-success)] text-white shadow-sm hover:bg-[var(--color-success-hover)]',
        outline:
          'border border-border bg-transparent hover:bg-secondary hover:border-[var(--color-border-strong)]',
        ghost:
          'text-muted-foreground hover:bg-secondary hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-3',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-6 text-base',
        icon: 'h-9 w-9 p-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      const childElement = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(childElement, {
        ...props,
        ref,
        className: cn(buttonVariants({ variant, size, className }), childElement.props?.className),
      } as Record<string, unknown>);
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
