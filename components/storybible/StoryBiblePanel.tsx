'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import OverviewTab from './OverviewTab';
import CharactersTab from './CharactersTab';
import LocationsTab from './LocationsTab';
import BeatSheetTab from './BeatSheetTab';
import AIGuideTab from './AIGuideTab';
import { BookOpen, Users, MapPin, ListChecks, Sparkles } from 'lucide-react';

type StoryBibleTab = 'overview' | 'characters' | 'locations' | 'beats' | 'guide';

interface StoryBiblePanelProps {
  className?: string;
}

const tabs: { id: StoryBibleTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <BookOpen className="h-3 w-3" /> },
  { id: 'characters', label: 'Characters', icon: <Users className="h-3 w-3" /> },
  { id: 'locations', label: 'Locations', icon: <MapPin className="h-3 w-3" /> },
  { id: 'beats', label: 'Beats', icon: <ListChecks className="h-3 w-3" /> },
  { id: 'guide', label: 'AI Guide', icon: <Sparkles className="h-3 w-3" /> },
];

export default function StoryBiblePanel({ className }: StoryBiblePanelProps) {
  const [activeTab, setActiveTab] = useState<StoryBibleTab>('overview');

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Sub-tab bar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-border shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              'flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'characters' && <CharactersTab />}
        {activeTab === 'locations' && <LocationsTab />}
        {activeTab === 'beats' && <BeatSheetTab />}
        {activeTab === 'guide' && <AIGuideTab />}
      </div>
    </div>
  );
}
