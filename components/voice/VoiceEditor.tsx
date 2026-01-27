'use client';

// ---------------------------------------------------------------------------
// VoiceEditor -- Custom voice profile builder
// ---------------------------------------------------------------------------
//
// Allows the user to edit a voice profile by adjusting the name,
// description, and individual aspect components (dialogue, structure,
// action, pacing, tone).  Each component has a style selector, a weight
// slider, and an optional custom prompt textarea.
// ---------------------------------------------------------------------------

import React, { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { VoiceProfile, VoiceComponent } from '@/lib/agent/voices';
import { buildVoicePrompt } from '@/lib/agent/voices';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  Layers,
  Clapperboard,
  Timer,
  Palette,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceEditorProps {
  voice: VoiceProfile;
  onChange: (voice: VoiceProfile) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Aspect configuration
// ---------------------------------------------------------------------------

type Aspect = VoiceComponent['aspect'];

interface AspectConfig {
  aspect: Aspect;
  label: string;
  icon: React.ElementType;
  styles: { value: string; label: string }[];
}

const ASPECT_CONFIGS: AspectConfig[] = [
  {
    aspect: 'dialogue',
    label: 'Dialogue',
    icon: MessageSquare,
    styles: [
      { value: 'classic', label: 'Classic' },
      { value: 'tarantino', label: 'Tarantino' },
      { value: 'sorkin', label: 'Sorkin' },
      { value: 'sparse', label: 'Sparse' },
      { value: 'witty', label: 'Witty' },
      { value: 'custom', label: 'Custom' },
    ],
  },
  {
    aspect: 'structure',
    label: 'Structure',
    icon: Layers,
    styles: [
      { value: 'three-act', label: 'Three-Act' },
      { value: 'nonlinear', label: 'Nonlinear' },
      { value: 'classical', label: 'Classical' },
      { value: 'escalating', label: 'Escalating' },
      { value: 'setup-payoff', label: 'Setup/Payoff' },
      { value: 'custom', label: 'Custom' },
    ],
  },
  {
    aspect: 'action',
    label: 'Action',
    icon: Clapperboard,
    styles: [
      { value: 'clean', label: 'Clean' },
      { value: 'visceral', label: 'Visceral' },
      { value: 'literary', label: 'Literary' },
      { value: 'atmospheric', label: 'Atmospheric' },
      { value: 'light', label: 'Light' },
      { value: 'custom', label: 'Custom' },
    ],
  },
  {
    aspect: 'pacing',
    label: 'Pacing',
    icon: Timer,
    styles: [
      { value: 'measured', label: 'Measured' },
      { value: 'slow-burn', label: 'Slow Burn' },
      { value: 'rapid', label: 'Rapid' },
      { value: 'methodical', label: 'Methodical' },
      { value: 'quick', label: 'Quick' },
      { value: 'custom', label: 'Custom' },
    ],
  },
  {
    aspect: 'tone',
    label: 'Tone',
    icon: Palette,
    styles: [
      { value: 'professional', label: 'Professional' },
      { value: 'irreverent', label: 'Irreverent' },
      { value: 'intellectual', label: 'Intellectual' },
      { value: 'dread', label: 'Dread' },
      { value: 'comedic', label: 'Comedic' },
      { value: 'custom', label: 'Custom' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Weight label helper
// ---------------------------------------------------------------------------

function weightLabel(weight: number): string {
  if (weight < 0.5) return 'Light';
  if (weight < 0.8) return 'Moderate';
  return 'Strong';
}

// ---------------------------------------------------------------------------
// AspectEditor -- Editor for a single voice component
// ---------------------------------------------------------------------------

function AspectEditor({
  config,
  component,
  onChange,
}: {
  config: AspectConfig;
  component: VoiceComponent;
  onChange: (updated: VoiceComponent) => void;
}) {
  const Icon = config.icon;

  const handleStyleChange = useCallback(
    (style: string) => {
      onChange({
        ...component,
        style,
        customPrompt: style === 'custom' ? (component.customPrompt ?? '') : undefined,
      });
    },
    [component, onChange],
  );

  const handleWeightChange = useCallback(
    (value: number) => {
      // The slider gives 0-100; we store 0-1.
      onChange({ ...component, weight: value / 100 });
    },
    [component, onChange],
  );

  const handleCustomPromptChange = useCallback(
    (text: string) => {
      onChange({ ...component, customPrompt: text });
    },
    [component, onChange],
  );

  const weightPercent = Math.round(component.weight * 100);

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {config.label}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {weightLabel(component.weight)} ({weightPercent}%)
        </span>
      </div>

      {/* Style selector */}
      <Select
        value={component.style}
        onChange={(e) => handleStyleChange(e.target.value)}
        options={config.styles}
        className="text-xs h-8"
      />

      {/* Weight slider */}
      <Slider
        value={weightPercent}
        onChange={handleWeightChange}
        min={0}
        max={100}
        step={5}
        label="Influence"
      />

      {/* Custom prompt textarea (shown only for "custom" style) */}
      {component.style === 'custom' && (
        <Textarea
          value={component.customPrompt ?? ''}
          onChange={(e) => handleCustomPromptChange(e.target.value)}
          placeholder="Describe the style in your own words..."
          className="text-xs min-h-[60px]"
          rows={3}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoiceEditor({
  voice,
  onChange,
  className,
}: VoiceEditorProps) {
  // -- Component update handler ---------------------------------------------

  const handleComponentChange = useCallback(
    (aspectKey: Aspect, updated: VoiceComponent) => {
      const newComponents = voice.components.map((c) =>
        c.aspect === aspectKey ? updated : c,
      );
      onChange({ ...voice, components: newComponents });
    },
    [voice, onChange],
  );

  // -- Ensure every aspect has a component ----------------------------------
  // If the voice profile is missing a component for an aspect, create a
  // default one so the editor always shows all five sliders.

  const componentMap = useMemo(() => {
    const map = new Map<Aspect, VoiceComponent>();
    for (const c of voice.components) {
      map.set(c.aspect, c);
    }
    // Fill in defaults for missing aspects.
    for (const config of ASPECT_CONFIGS) {
      if (!map.has(config.aspect)) {
        map.set(config.aspect, {
          aspect: config.aspect,
          style: config.styles[0].value,
          weight: 0.5,
        });
      }
    }
    return map;
  }, [voice.components]);

  // -- Preview of generated prompt ------------------------------------------

  const previewPrompt = useMemo(() => {
    return buildVoicePrompt(voice);
  }, [voice]);

  // -- Render ---------------------------------------------------------------

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <ScrollArea className="flex-1 p-3 space-y-4">
        {/* Name */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Voice Name
          </label>
          <Input
            value={voice.name}
            onChange={(e) => onChange({ ...voice, name: e.target.value })}
            placeholder="My Custom Voice"
            className="text-sm"
          />
        </div>

        {/* Description */}
        <div className="space-y-1 mt-3">
          <label className="text-xs font-medium text-muted-foreground">
            Description
          </label>
          <Input
            value={voice.description}
            onChange={(e) =>
              onChange({ ...voice, description: e.target.value })
            }
            placeholder="Brief description of this voice profile"
            className="text-sm"
          />
        </div>

        <Separator className="my-4" />

        {/* Aspect editors */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Style Components
          </h3>

          {ASPECT_CONFIGS.map((config) => {
            const component = componentMap.get(config.aspect)!;
            return (
              <AspectEditor
                key={config.aspect}
                config={config}
                component={component}
                onChange={(updated) =>
                  handleComponentChange(config.aspect, updated)
                }
              />
            );
          })}
        </div>

        <Separator className="my-4" />

        {/* Prompt preview */}
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Generated Prompt Preview
          </h3>
          <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {previewPrompt}
          </pre>
        </div>
      </ScrollArea>
    </div>
  );
}
