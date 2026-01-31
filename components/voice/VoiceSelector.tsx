'use client';

// ---------------------------------------------------------------------------
// VoiceSelector -- Dropdown to select a writing voice (preset or custom)
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useProjectStore } from '@/lib/store/project';
import { useVoiceStore } from '@/lib/store/voice';
import { PRESET_VOICES } from '@/lib/agent/voices';
import { Select } from '@/components/ui/select';
import { Tooltip } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, Settings2 } from 'lucide-react';
import VoiceManager from './VoiceManager';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceSelectorProps {
  className?: string;
  showManageButton?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoiceSelector({
  className,
  showManageButton = true,
}: VoiceSelectorProps) {
  const [showManager, setShowManager] = useState(false);

  const voiceId = useProjectStore((s) => s.voiceId);
  const setVoiceId = useProjectStore((s) => s.setVoiceId);

  const { customVoices, loadCustomVoices, getVoiceById } = useVoiceStore();

  // Load custom voices on mount
  useEffect(() => {
    loadCustomVoices();
  }, [loadCustomVoices]);

  // Find the current voice (from presets or custom)
  const currentVoice = getVoiceById(voiceId);

  // Build the options list with grouped presets and custom voices
  const presetOptions = PRESET_VOICES.map((voice) => ({
    value: voice.id,
    label: voice.name,
  }));

  const customOptions = customVoices.map((voice) => ({
    value: voice.id,
    label: `${voice.name} ★`,
  }));

  // Combine options with a separator-like approach
  const options =
    customOptions.length > 0
      ? [
          ...presetOptions,
          { value: '__separator__', label: '── Custom ──', disabled: true },
          ...customOptions,
        ]
      : presetOptions;

  // Check if current voice is custom
  const isCustomVoice = customVoices.some((v) => v.id === voiceId);

  return (
    <>
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Mic className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="text-xs font-medium text-muted-foreground">
              Voice
            </label>
            {isCustomVoice && (
              <Badge variant="default" className="text-[9px] py-0 px-1">
                Custom
              </Badge>
            )}
          </div>
          {showManageButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowManager(true)}
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Tooltip
          content={currentVoice?.description ?? 'Select a writing voice'}
          side="bottom"
        >
          <div className="w-full">
            <Select
              value={voiceId}
              onChange={(e) => {
                if (e.target.value !== '__separator__') {
                  setVoiceId(e.target.value);
                }
              }}
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

        {/* Custom voices count */}
        {customVoices.length > 0 && (
          <button
            onClick={() => setShowManager(true)}
            className="text-[10px] text-primary/70 hover:text-primary transition-colors"
          >
            {customVoices.length} custom voice{customVoices.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Voice Manager Modal */}
      {showManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-4xl h-[80vh] bg-background rounded-lg shadow-xl overflow-hidden">
            <VoiceManager
              onSelectVoice={() => {}}
              onClose={() => setShowManager(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
