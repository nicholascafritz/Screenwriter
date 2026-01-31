'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-amber-500 text-gray-950 shadow-sm hover:bg-amber-400 active:bg-amber-600 active:scale-[0.98] focus-visible:ring-amber-400',
        secondary:
          'bg-gray-800 text-gray-100 hover:bg-gray-700 active:bg-gray-750 focus-visible:ring-gray-600',
        destructive:
          'bg-red-600 text-white shadow-sm hover:bg-red-500 active:bg-red-700 focus-visible:ring-red-500',
        success:
          'bg-green-600 text-white shadow-sm hover:bg-green-500 active:bg-green-700 focus-visible:ring-green-500',
        outline:
          'border border-gray-700 bg-transparent text-gray-100 hover:bg-gray-800 hover:border-gray-600 focus-visible:ring-gray-600',
        ghost:
          'text-gray-400 hover:bg-gray-800 hover:text-gray-100 focus-visible:ring-gray-600',
        link:
          'text-amber-400 underline-offset-4 hover:underline hover:text-amber-300',
      },
      size: {
        default: 'h-9 px-3.5 text-body-sm',
        sm: 'h-7 px-2.5 text-xs rounded',
        lg: 'h-11 px-4.5 text-body',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7 rounded',
        'icon-lg': 'h-11 w-11',
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
