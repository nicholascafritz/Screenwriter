'use client';

// ---------------------------------------------------------------------------
// VoiceManager -- Full interface for managing voice profiles
// ---------------------------------------------------------------------------
//
// Displays preset voices and user's custom voices with options to:
// - Select a voice for the current project
// - Duplicate a preset as a new custom voice
// - Edit or delete custom voices
// - Create a new custom voice from scratch
// ---------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useVoiceStore, MAX_CUSTOM_VOICES } from '@/lib/store/voice';
import { useProjectStore } from '@/lib/store/project';
import { PRESET_VOICES, type VoiceProfile } from '@/lib/agent/voices';
import type { StoredVoiceProfile } from '@/lib/firebase/firestore-voice-persistence';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import VoiceEditor from './VoiceEditor';
import VoiceAnalyzer from './VoiceAnalyzer';
import {
  Mic,
  Copy,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceManagerProps {
  onSelectVoice?: (voiceId: string) => void;
  onClose?: () => void;
  className?: string;
}

type View = 'list' | 'edit' | 'analyze';

// ---------------------------------------------------------------------------
// Voice Card Components
// ---------------------------------------------------------------------------

function PresetVoiceCard({
  voice,
  isSelected,
  onSelect,
  onDuplicate,
}: {
  voice: VoiceProfile;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/30'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground truncate">
              {voice.name}
            </h4>
            {isSelected && (
              <Badge variant="default" className="text-[10px] py-0">
                Active
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {voice.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button
          variant={isSelected ? 'default' : 'secondary'}
          size="sm"
          onClick={onSelect}
          className="flex-1 text-xs"
        >
          {isSelected ? (
            <>
              <Check className="h-3 w-3" />
              Selected
            </>
          ) : (
            'Use'
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDuplicate}
          className="text-xs"
        >
          <Copy className="h-3 w-3" />
          Duplicate
        </Button>
      </div>
    </div>
  );
}

function CustomVoiceCard({
  voice,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: {
  voice: StoredVoiceProfile;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/30'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground truncate">
              {voice.name}
            </h4>
            {isSelected && (
              <Badge variant="default" className="text-[10px] py-0">
                Active
              </Badge>
            )}
            {voice.isPresetDuplicate && (
              <Badge variant="secondary" className="text-[10px] py-0">
                From preset
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {voice.description || 'Custom voice profile'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        {showDeleteConfirm ? (
          <>
            <span className="text-xs text-muted-foreground">Delete?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
              className="text-xs"
            >
              Yes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-xs"
            >
              No
            </Button>
          </>
        ) : (
          <>
            <Button
              variant={isSelected ? 'default' : 'secondary'}
              size="sm"
              onClick={onSelect}
              className="flex-1 text-xs"
            >
              {isSelected ? (
                <>
                  <Check className="h-3 w-3" />
                  Selected
                </>
              ) : (
                'Use'
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="text-xs"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoiceManager({
  onSelectVoice,
  onClose,
  className,
}: VoiceManagerProps) {
  const [view, setView] = useState<View>('list');

  // Voice store
  const {
    customVoices,
    isLoading,
    editingVoice,
    loadCustomVoices,
    setEditingVoice,
    updateEditingVoice,
    saveEditingVoice,
    deleteCustomVoice,
    duplicatePreset,
    canCreateMoreVoices,
  } = useVoiceStore();

  // Project store for current voice selection
  const voiceId = useProjectStore((s) => s.voiceId);
  const setVoiceId = useProjectStore((s) => s.setVoiceId);

  // Load custom voices on mount
  useEffect(() => {
    loadCustomVoices();
  }, [loadCustomVoices]);

  // Handle voice selection
  const handleSelectVoice = (id: string) => {
    setVoiceId(id);
    onSelectVoice?.(id);
  };

  // Handle duplicating a preset
  const handleDuplicatePreset = async (presetId: string) => {
    if (!canCreateMoreVoices()) {
      return; // TODO: show toast
    }
    const newId = await duplicatePreset(presetId);
    // Start editing the new voice
    const newVoice = customVoices.find((v) => v.id === newId);
    if (newVoice) {
      setEditingVoice(newVoice);
      setView('edit');
    }
  };

  // Handle editing a custom voice
  const handleEditVoice = (voice: StoredVoiceProfile) => {
    setEditingVoice(voice);
    setView('edit');
  };

  // Handle creating a new voice
  const handleCreateNew = () => {
    if (!canCreateMoreVoices()) {
      return; // TODO: show toast
    }
    const newVoice: StoredVoiceProfile = {
      id: `custom-${Date.now()}`,
      name: 'New Custom Voice',
      description: '',
      components: [
        { aspect: 'dialogue', style: 'classic', weight: 0.5 },
        { aspect: 'structure', style: 'three-act', weight: 0.5 },
        { aspect: 'action', style: 'clean', weight: 0.5 },
        { aspect: 'pacing', style: 'measured', weight: 0.5 },
        { aspect: 'tone', style: 'professional', weight: 0.5 },
      ],
      isPresetDuplicate: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setEditingVoice(newVoice);
    setView('edit');
  };

  // Handle saving the editing voice
  const handleSave = async () => {
    await saveEditingVoice();
    setEditingVoice(null);
    setView('list');
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingVoice(null);
    setView('list');
  };

  // Render the list view
  const renderListView = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Voice Profiles</h2>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {/* Preset Voices */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Preset Voices
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRESET_VOICES.map((voice) => (
              <PresetVoiceCard
                key={voice.id}
                voice={voice}
                isSelected={voiceId === voice.id}
                onSelect={() => handleSelectVoice(voice.id)}
                onDuplicate={() => handleDuplicatePreset(voice.id)}
              />
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Custom Voices */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Your Custom Voices
            </h3>
            <Badge variant="secondary" className="text-[10px]">
              {customVoices.length}/{MAX_CUSTOM_VOICES}
            </Badge>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Loading...
            </div>
          ) : customVoices.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
              No custom voices yet. Duplicate a preset or create your own!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customVoices.map((voice) => (
                <CustomVoiceCard
                  key={voice.id}
                  voice={voice}
                  isSelected={voiceId === voice.id}
                  onSelect={() => handleSelectVoice(voice.id)}
                  onEdit={() => handleEditVoice(voice)}
                  onDelete={() => deleteCustomVoice(voice.id)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer with create button */}
      <div className="p-4 border-t border-border space-y-2">
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={handleCreateNew}
            disabled={!canCreateMoreVoices()}
            className="flex-1"
          >
            <Plus className="h-4 w-4" />
            Create Custom Voice
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              handleCreateNew();
              setView('analyze');
            }}
            disabled={!canCreateMoreVoices()}
          >
            <Sparkles className="h-4 w-4" />
            Analyze Writing
          </Button>
        </div>
        {!canCreateMoreVoices() && (
          <p className="text-xs text-muted-foreground text-center">
            Maximum of {MAX_CUSTOM_VOICES} custom voices reached
          </p>
        )}
      </div>
    </div>
  );

  // Render the edit view
  const renderEditView = () => {
    if (!editingVoice) return null;

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">
              {editingVoice.name || 'Edit Voice'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setView('analyze')}
              size="sm"
            >
              <Sparkles className="h-3 w-3" />
              Analyze Sample
            </Button>
            <Button variant="outline" onClick={handleCancelEdit} size="sm">
              Cancel
            </Button>
            <Button onClick={handleSave} size="sm">
              <Check className="h-3 w-3" />
              Save
            </Button>
          </div>
        </div>

        {/* Editor */}
        <VoiceEditor
          voice={editingVoice}
          onChange={(updated) => updateEditingVoice(updated)}
          className="flex-1"
        />
      </div>
    );
  };

  // Render the analyze view
  const renderAnalyzeView = () => {
    if (!editingVoice) return null;

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setView('edit')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">Analyze Writing Sample</h2>
          </div>
          <Button variant="outline" onClick={() => setView('edit')} size="sm">
            Back to Editor
          </Button>
        </div>

        {/* Analyzer */}
        <VoiceAnalyzer
          voice={editingVoice}
          onApplyToVoice={(updates) => {
            updateEditingVoice(updates);
            setView('edit');
          }}
          className="flex-1"
        />
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {view === 'list' && renderListView()}
      {view === 'edit' && renderEditView()}
      {view === 'analyze' && renderAnalyzeView()}
    </div>
  );
}
