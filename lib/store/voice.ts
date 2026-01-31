// ---------------------------------------------------------------------------
// Voice Store -- Zustand state management for custom voice profiles
// ---------------------------------------------------------------------------
//
// Manages user-created voice profiles, analysis suggestions, and provides
// unified access to both preset and custom voices.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { generateId } from '@/lib/utils';
import type { VoiceProfile, VoiceComponent } from '@/lib/agent/voices';
import { PRESET_VOICES } from '@/lib/agent/voices';
import {
  loadCustomVoices,
  saveCustomVoice,
  deleteCustomVoice as deleteVoiceFromFirestore,
  MAX_CUSTOM_VOICES,
  type StoredVoiceProfile,
} from '@/lib/firebase/firestore-voice-persistence';
import { useProjectStore } from './project';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalysisSuggestion {
  aspect: VoiceComponent['aspect'];
  suggestedStyle: string;
  suggestedWeight: number;
  confidence: number;
  rationale: string;
}

export interface AnalysisMetrics {
  wordCount: number;
  dialoguePercentage: number;
  avgSentenceLength: number;
}

export interface VoiceState {
  /** User's custom voice profiles. */
  customVoices: StoredVoiceProfile[];

  /** Whether voices are being loaded from Firestore. */
  isLoading: boolean;

  /** Voice currently being edited (null if not editing). */
  editingVoice: StoredVoiceProfile | null;

  /** Whether a writing sample is being analyzed. */
  isAnalyzing: boolean;

  /** Suggestions from the most recent analysis. */
  analysisSuggestions: AnalysisSuggestion[] | null;

  /** Metrics from the most recent analysis. */
  analysisMetrics: AnalysisMetrics | null;

  /** Error message from analysis, if any. */
  analysisError: string | null;

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /** Load custom voices from Firestore. */
  loadCustomVoices: () => Promise<void>;

  /** Clear all voice state (on logout). */
  clear: () => void;

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  /** Create a new custom voice profile. */
  createCustomVoice: (voice: Omit<StoredVoiceProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;

  /** Update an existing custom voice profile. */
  updateCustomVoice: (id: string, updates: Partial<VoiceProfile>) => Promise<void>;

  /** Delete a custom voice profile. */
  deleteCustomVoice: (id: string) => Promise<void>;

  /** Duplicate a preset voice as a new custom voice. */
  duplicatePreset: (presetId: string, newName?: string) => Promise<string>;

  // -------------------------------------------------------------------------
  // Editor state
  // -------------------------------------------------------------------------

  /** Set the voice being edited. */
  setEditingVoice: (voice: StoredVoiceProfile | null) => void;

  /** Update the editing voice (local state only, not persisted until save). */
  updateEditingVoice: (updates: Partial<VoiceProfile>) => void;

  /** Save the editing voice to Firestore. */
  saveEditingVoice: () => Promise<void>;

  // -------------------------------------------------------------------------
  // Analysis
  // -------------------------------------------------------------------------

  /** Analyze a writing sample and generate suggestions. */
  analyzeWritingSample: (sampleText: string) => Promise<void>;

  /** Apply a single suggestion to the editing voice. */
  applySuggestion: (aspect: VoiceComponent['aspect']) => void;

  /** Apply all suggestions to the editing voice. */
  applyAllSuggestions: () => void;

  /** Clear analysis state. */
  clearAnalysis: () => void;

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Get all voices (presets + custom). */
  getAllVoices: () => VoiceProfile[];

  /** Get a voice by ID (checks both presets and custom). */
  getVoiceById: (id: string) => VoiceProfile | undefined;

  /** Check if user can create more custom voices. */
  canCreateMoreVoices: () => boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(voice: StoredVoiceProfile) {
  if (_persistTimer) clearTimeout(_persistTimer);
  _persistTimer = setTimeout(async () => {
    _persistTimer = null;
    const userId = useProjectStore.getState().userId;
    if (!userId) return;
    await saveCustomVoice(userId, voice);
  }, 500);
}

function createDefaultComponents(): VoiceComponent[] {
  return [
    { aspect: 'dialogue', style: 'classic', weight: 0.5 },
    { aspect: 'structure', style: 'three-act', weight: 0.5 },
    { aspect: 'action', style: 'clean', weight: 0.5 },
    { aspect: 'pacing', style: 'measured', weight: 0.5 },
    { aspect: 'tone', style: 'professional', weight: 0.5 },
  ];
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useVoiceStore = create<VoiceState>((set, get) => ({
  customVoices: [],
  isLoading: false,
  editingVoice: null,
  isAnalyzing: false,
  analysisSuggestions: null,
  analysisMetrics: null,
  analysisError: null,

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  loadCustomVoices: async () => {
    const userId = useProjectStore.getState().userId;
    if (!userId) return;

    set({ isLoading: true });
    try {
      const voices = await loadCustomVoices(userId);
      set({ customVoices: voices, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  clear: () => {
    set({
      customVoices: [],
      isLoading: false,
      editingVoice: null,
      isAnalyzing: false,
      analysisSuggestions: null,
      analysisMetrics: null,
      analysisError: null,
    });
  },

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  createCustomVoice: async (voice) => {
    const userId = useProjectStore.getState().userId;
    if (!userId) throw new Error('Not authenticated');

    if (!get().canCreateMoreVoices()) {
      throw new Error(`Maximum of ${MAX_CUSTOM_VOICES} custom voices allowed`);
    }

    const now = Date.now();
    const id = generateId();
    const newVoice: StoredVoiceProfile = {
      ...voice,
      id,
      createdAt: now,
      updatedAt: now,
    };

    await saveCustomVoice(userId, newVoice);
    set((state) => ({ customVoices: [newVoice, ...state.customVoices] }));

    return id;
  },

  updateCustomVoice: async (id, updates) => {
    const userId = useProjectStore.getState().userId;
    if (!userId) return;

    set((state) => ({
      customVoices: state.customVoices.map((v) =>
        v.id === id ? { ...v, ...updates, updatedAt: Date.now() } : v
      ),
    }));

    const updated = get().customVoices.find((v) => v.id === id);
    if (updated) {
      schedulePersist(updated);
    }
  },

  deleteCustomVoice: async (id) => {
    const userId = useProjectStore.getState().userId;
    if (!userId) return;

    await deleteVoiceFromFirestore(userId, id);
    set((state) => ({
      customVoices: state.customVoices.filter((v) => v.id !== id),
    }));
  },

  duplicatePreset: async (presetId, newName) => {
    const preset = PRESET_VOICES.find((v) => v.id === presetId);
    if (!preset) throw new Error(`Preset not found: ${presetId}`);

    const id = await get().createCustomVoice({
      name: newName ?? `${preset.name} (Copy)`,
      description: preset.description,
      components: [...preset.components],
      isPresetDuplicate: true,
      sourcePresetId: presetId,
    });

    return id;
  },

  // -------------------------------------------------------------------------
  // Editor state
  // -------------------------------------------------------------------------

  setEditingVoice: (voice) => {
    set({ editingVoice: voice, analysisSuggestions: null, analysisMetrics: null, analysisError: null });
  },

  updateEditingVoice: (updates) => {
    set((state) => {
      if (!state.editingVoice) return {};
      return {
        editingVoice: { ...state.editingVoice, ...updates, updatedAt: Date.now() },
      };
    });
  },

  saveEditingVoice: async () => {
    const { editingVoice, customVoices } = get();
    if (!editingVoice) return;

    const userId = useProjectStore.getState().userId;
    if (!userId) return;

    // Check if this is a new voice or an existing one
    const existing = customVoices.find((v) => v.id === editingVoice.id);

    if (existing) {
      // Update existing
      await saveCustomVoice(userId, editingVoice);
      set((state) => ({
        customVoices: state.customVoices.map((v) =>
          v.id === editingVoice.id ? editingVoice : v
        ),
      }));
    } else {
      // Create new
      if (!get().canCreateMoreVoices()) {
        throw new Error(`Maximum of ${MAX_CUSTOM_VOICES} custom voices allowed`);
      }
      await saveCustomVoice(userId, editingVoice);
      set((state) => ({
        customVoices: [editingVoice, ...state.customVoices],
      }));
    }
  },

  // -------------------------------------------------------------------------
  // Analysis
  // -------------------------------------------------------------------------

  analyzeWritingSample: async (sampleText) => {
    set({ isAnalyzing: true, analysisError: null });

    try {
      const response = await fetch('/api/voice/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleText }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? 'Analysis failed');
      }

      const result = await response.json();

      set({
        isAnalyzing: false,
        analysisSuggestions: result.suggestions,
        analysisMetrics: result.metrics,
      });
    } catch (err) {
      set({
        isAnalyzing: false,
        analysisError: err instanceof Error ? err.message : 'Analysis failed',
      });
    }
  },

  applySuggestion: (aspect) => {
    const { editingVoice, analysisSuggestions } = get();
    if (!editingVoice || !analysisSuggestions) return;

    const suggestion = analysisSuggestions.find((s) => s.aspect === aspect);
    if (!suggestion) return;

    const updatedComponents = editingVoice.components.map((c) =>
      c.aspect === aspect
        ? { ...c, style: suggestion.suggestedStyle, weight: suggestion.suggestedWeight }
        : c
    );

    set({
      editingVoice: { ...editingVoice, components: updatedComponents, updatedAt: Date.now() },
    });
  },

  applyAllSuggestions: () => {
    const { editingVoice, analysisSuggestions } = get();
    if (!editingVoice || !analysisSuggestions) return;

    const suggestionMap = new Map(analysisSuggestions.map((s) => [s.aspect, s]));

    const updatedComponents = editingVoice.components.map((c) => {
      const suggestion = suggestionMap.get(c.aspect);
      if (suggestion) {
        return { ...c, style: suggestion.suggestedStyle, weight: suggestion.suggestedWeight };
      }
      return c;
    });

    set({
      editingVoice: { ...editingVoice, components: updatedComponents, updatedAt: Date.now() },
    });
  },

  clearAnalysis: () => {
    set({ analysisSuggestions: null, analysisMetrics: null, analysisError: null });
  },

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  getAllVoices: () => {
    return [...PRESET_VOICES, ...get().customVoices];
  },

  getVoiceById: (id) => {
    // Check custom voices first (allows user overrides with same ID)
    const custom = get().customVoices.find((v) => v.id === id);
    if (custom) return custom;

    // Fall back to presets
    return PRESET_VOICES.find((v) => v.id === id);
  },

  canCreateMoreVoices: () => {
    return get().customVoices.length < MAX_CUSTOM_VOICES;
  },
}));

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { MAX_CUSTOM_VOICES };
export { createDefaultComponents };
