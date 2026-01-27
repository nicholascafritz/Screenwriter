'use client';

// ---------------------------------------------------------------------------
// VoiceSelector -- Dropdown to select a writing voice preset
// ---------------------------------------------------------------------------

import React from 'react';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/lib/store/project';
import { PRESET_VOICES } from '@/lib/agent/voices';
import { Select } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { Mic } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceSelectorProps {
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoiceSelector({ className }: VoiceSelectorProps) {
  const voiceId = useProjectStore((s) => s.voiceId);
  const setVoiceId = useProjectStore((s) => s.setVoiceId);

  // Find the current voice for description display.
  const currentVoice = PRESET_VOICES.find((v) => v.id === voiceId);

  // Build the options list.
  const options = PRESET_VOICES.map((voice) => ({
    value: voice.id,
    label: voice.name,
  }));

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-1.5">
        <Mic className="h-3.5 w-3.5 text-muted-foreground" />
        <label className="text-xs font-medium text-muted-foreground">
          Voice
        </label>
      </div>

      <Tooltip
        content={currentVoice?.description ?? 'Select a writing voice'}
        side="bottom"
      >
        <div className="w-full">
          <Select
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            options={options}
            className="text-xs h-8"
          />
        </div>
      </Tooltip>

      {/* Brief description shown below the selector */}
      {currentVoice && (
        <p className="text-[10px] text-muted-foreground/70 leading-tight px-0.5">
          {currentVoice.description}
        </p>
      )}
    </div>
  );
}
