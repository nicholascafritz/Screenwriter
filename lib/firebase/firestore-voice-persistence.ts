// ---------------------------------------------------------------------------
// Firestore Voice Profile Persistence -- per-user custom voices
// ---------------------------------------------------------------------------
//
// Stores user-created voice profiles in Firestore at:
//   users/{userId}/voices/{voiceId}
//
// Each user can have up to MAX_CUSTOM_VOICES profiles.
// ---------------------------------------------------------------------------

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './config';
import type { VoiceProfile, VoiceComponent } from '@/lib/agent/voices';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_CUSTOM_VOICES = 5;

// ---------------------------------------------------------------------------
// Extended types for storage
// ---------------------------------------------------------------------------

export interface StoredVoiceProfile extends VoiceProfile {
  /** Whether this voice was duplicated from a preset. */
  isPresetDuplicate: boolean;

  /** ID of the source preset if duplicated. */
  sourcePresetId?: string;

  /** Creation timestamp. */
  createdAt: number;

  /** Last update timestamp. */
  updatedAt: number;

  /** Metadata from writing sample analysis, if any. */
  analysisMetadata?: {
    analyzedAt: number;
    sampleWordCount: number;
  };
}

// ---------------------------------------------------------------------------
// Collection helpers
// ---------------------------------------------------------------------------

function voicesCollection(userId: string) {
  return collection(db, 'users', userId, 'voices');
}

function voiceDoc(userId: string, voiceId: string) {
  return doc(db, 'users', userId, 'voices', voiceId);
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Load all custom voice profiles for a user.
 */
export async function loadCustomVoices(
  userId: string,
): Promise<StoredVoiceProfile[]> {
  try {
    const snapshot = await getDocs(voicesCollection(userId));
    const voices: StoredVoiceProfile[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      voices.push({
        id: docSnap.id,
        name: data.name ?? 'Untitled Voice',
        description: data.description ?? '',
        components: (data.components ?? []) as VoiceComponent[],
        isPresetDuplicate: data.isPresetDuplicate ?? false,
        sourcePresetId: data.sourcePresetId,
        createdAt: data.createdAt ?? Date.now(),
        updatedAt: data.updatedAt ?? Date.now(),
        analysisMetadata: data.analysisMetadata,
      });
    });

    // Sort by most recently updated first
    voices.sort((a, b) => b.updatedAt - a.updatedAt);

    return voices;
  } catch {
    return [];
  }
}

/**
 * Load a single custom voice by ID.
 */
export async function loadCustomVoice(
  userId: string,
  voiceId: string,
): Promise<StoredVoiceProfile | null> {
  try {
    const snap = await getDoc(voiceDoc(userId, voiceId));
    if (!snap.exists()) return null;

    const data = snap.data();
    return {
      id: snap.id,
      name: data.name ?? 'Untitled Voice',
      description: data.description ?? '',
      components: (data.components ?? []) as VoiceComponent[],
      isPresetDuplicate: data.isPresetDuplicate ?? false,
      sourcePresetId: data.sourcePresetId,
      createdAt: data.createdAt ?? Date.now(),
      updatedAt: data.updatedAt ?? Date.now(),
      analysisMetadata: data.analysisMetadata,
    };
  } catch {
    return null;
  }
}

/**
 * Save a custom voice profile.
 */
export async function saveCustomVoice(
  userId: string,
  voice: StoredVoiceProfile,
): Promise<void> {
  try {
    await setDoc(voiceDoc(userId, voice.id), {
      name: voice.name,
      description: voice.description,
      components: voice.components,
      isPresetDuplicate: voice.isPresetDuplicate,
      sourcePresetId: voice.sourcePresetId ?? null,
      createdAt: voice.createdAt,
      updatedAt: voice.updatedAt,
      analysisMetadata: voice.analysisMetadata ?? null,
    });
  } catch {
    // Silently fail.
  }
}

/**
 * Delete a custom voice profile.
 */
export async function deleteCustomVoice(
  userId: string,
  voiceId: string,
): Promise<void> {
  try {
    await deleteDoc(voiceDoc(userId, voiceId));
  } catch {
    // Silently fail.
  }
}

/**
 * Get the count of custom voices for a user.
 */
export async function getCustomVoiceCount(userId: string): Promise<number> {
  try {
    const snapshot = await getDocs(voicesCollection(userId));
    return snapshot.size;
  } catch {
    return 0;
  }
}
