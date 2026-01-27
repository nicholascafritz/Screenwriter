'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ToastProps {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  duration?: number;
  onDismiss?: () => void;
}

const variantClasses: Record<string, string> = {
  default: 'bg-surface border-border text-foreground',
  success: 'bg-surface border-success/30 text-foreground',
  warning: 'bg-surface border-warning/30 text-foreground',
  danger: 'bg-surface border-danger/30 text-foreground',
};

function Toast({ message, action, variant = 'default', duration = 5000, onDismiss }: ToastProps) {
  const [visible, setVisible] = React.useState(false);
  const [exiting, setExiting] = React.useState(false);

  React.useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));

    if (duration > 0) {
      const timer = setTimeout(() => {
        dismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const dismiss = React.useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      onDismiss?.();
    }, 150);
  }, [onDismiss]);

  return (
    <div
      role="alert"
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-tooltip',
        'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-ds-lg',
        'font-ui text-sm transition-all',
        variantClasses[variant],
        visible && !exiting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
        exiting ? 'duration-fast' : 'duration-normal'
      )}
    >
      <span>{message}</span>
      {action && (
        <button
          onClick={() => {
            action.onClick();
            dismiss();
          }}
          className="text-primary font-medium hover:text-primary/80 transition-colors whitespace-nowrap"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
Toast.displayName = 'Toast';

export { Toast };
