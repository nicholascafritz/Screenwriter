'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: TabItem[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
}

function Tabs({
  tabs,
  defaultTab,
  onTabChange,
  className,
  ...props
}: TabsProps) {
  const [activeTab, setActiveTab] = React.useState(
    defaultTab || tabs[0]?.id || ''
  );

  const handleTabChange = React.useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange]
  );

  const activeContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div className={cn('flex flex-col h-full', className)} {...props}>
      <div
        className="flex border-b border-border bg-surface"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent transition-all duration-normal cursor-pointer',
              'text-muted-foreground',
              'hover:text-foreground hover:bg-white/[0.03]',
              'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_hsl(var(--primary))]',
              'disabled:pointer-events-none disabled:opacity-50',
              activeTab === tab.id
                ? 'text-primary border-b-primary'
                : ''
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={activeTab}
        className="flex-1 overflow-auto"
      >
        {activeContent}
      </div>
    </div>
  );
}
Tabs.displayName = 'Tabs';

export { Tabs };
