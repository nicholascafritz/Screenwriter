'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-ui text-sm font-medium transition-all duration-normal focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:transform-none',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-white shadow-ds-sm hover:bg-[var(--color-primary-hover)] hover:-translate-y-px hover:shadow-ds-md active:bg-[var(--color-primary-active)] active:translate-y-0',
        secondary:
          'bg-surface text-foreground border border-border shadow-ds-sm hover:bg-surface-hover hover:border-[var(--color-border-strong)]',
        destructive:
          'bg-danger text-white shadow-ds-sm hover:bg-danger-hover hover:-translate-y-px hover:shadow-ds-md active:translate-y-0',
        success:
          'bg-success text-[var(--color-text-inverse)] shadow-ds-sm hover:bg-success-hover hover:-translate-y-px hover:shadow-ds-md active:translate-y-0',
        outline:
          'border border-input bg-background shadow-ds-sm hover:bg-accent hover:text-accent-foreground',
        ghost:
          'text-muted-foreground hover:bg-white/5 hover:text-foreground',
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
