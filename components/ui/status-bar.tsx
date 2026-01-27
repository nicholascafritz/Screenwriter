'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface StatusBarItem {
  label: string;
  value: string | React.ReactNode;
}

export interface StatusBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: StatusBarItem[];
  actions?: React.ReactNode;
}

function StatusBar({ className, items, actions, children, ...props }: StatusBarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 bg-surface border-t border-border text-xs font-ui',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {items?.map((item, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <span className="text-[var(--color-border-strong)]">|</span>
            )}
            <span className="flex items-center gap-1">
              <span className="text-[var(--color-text-tertiary)]">{item.label}:</span>
              <span className="text-foreground font-medium">{item.value}</span>
            </span>
          </React.Fragment>
        ))}
        {children}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
}
StatusBar.displayName = 'StatusBar';

export { StatusBar };
