'use client';

// ---------------------------------------------------------------------------
// useSceneMetadata -- Get enriched metadata for a scene
// ---------------------------------------------------------------------------
//
// Combines data from Outline store (persistent identity) and Editor store
// (ephemeral parse data) into a single unified view of scene metadata.
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { useEditorStore } from '@/lib/store/editor';
import { useOutlineStore } from '@/lib/store/outline';
import { useBeatName, useBeatNameMap } from './use-beat-name-map';
import type { OutlineEntry } from '@/lib/store/outline-types';

export interface SceneMetadata {
  /** The outline entry (persistent identity). */
  entry: OutlineEntry | null;
  /** Characters appearing in this scene (from parsed dialogue). */
  characters: string[];
  /** Number of elements in the scene. */
  elementCount: number;
  /** Beat name if assigned, undefined otherwise. */
  beatName: string | undefined;
  /** Whether the scene is drafted (has Fountain text). */
  isDrafted: boolean;
  /** The scene number if present. */
  sceneNumber: string | null;
}

/**
 * Returns enriched metadata for a scene by SceneId.
 * Combines Outline store data with ephemeral parse data.
 */
export function useSceneMetadata(sceneId: string | null): SceneMetadata {
  const entry = useOutlineStore((s) =>
    sceneId ? s.outline?.scenes.find((scene) => scene.id === sceneId) ?? null : null
  );
  const screenplay = useEditorStore((s) => s.screenplay);
  const beatName = useBeatName(entry?.beatId);

  return useMemo(() => {
    if (!entry) {
      return {
        entry: null,
        characters: [],
        elementCount: 0,
        beatName: undefined,
        isDrafted: false,
        sceneNumber: null,
      };
    }

    // Find the parsed scene data if this is a drafted scene
    let characters: string[] = [];
    let elementCount = 0;

    if (entry.fountainRange && screenplay) {
      const parsedScene = screenplay.scenes.find(
        (s) => s.startLine === entry.fountainRange!.startLine
      );
      if (parsedScene) {
        characters = parsedScene.characters;
        elementCount = parsedScene.elements.length;
      }
    }

    return {
      entry,
      characters,
      elementCount,
      beatName,
      isDrafted: entry.fountainRange !== null,
      sceneNumber: entry.sceneNumber,
    };
  }, [entry, screenplay, beatName]);
}

/**
 * Returns metadata for multiple scenes at once.
 * More efficient than calling useSceneMetadata in a loop.
 */
export function useScenesMetadata(
  sceneIds: string[]
): Map<string, SceneMetadata> {
  const entries = useOutlineStore((s) => s.outline?.scenes ?? []);
  const screenplay = useEditorStore((s) => s.screenplay);
  const beatNameMap = useBeatNameMap();

  return useMemo(() => {
    const map = new Map<string, SceneMetadata>();

    for (const sceneId of sceneIds) {
      const entry = entries.find((e) => e.id === sceneId);
      if (!entry) {
        map.set(sceneId, {
          entry: null,
          characters: [],
          elementCount: 0,
          beatName: undefined,
          isDrafted: false,
          sceneNumber: null,
        });
        continue;
      }

      let characters: string[] = [];
      let elementCount = 0;

      if (entry.fountainRange && screenplay) {
        const parsedScene = screenplay.scenes.find(
          (s) => s.startLine === entry.fountainRange!.startLine
        );
        if (parsedScene) {
          characters = parsedScene.characters;
          elementCount = parsedScene.elements.length;
        }
      }

      map.set(sceneId, {
        entry,
        characters,
        elementCount,
        beatName: entry.beatId ? beatNameMap.get(entry.beatId) : undefined,
        isDrafted: entry.fountainRange !== null,
        sceneNumber: entry.sceneNumber,
      });
    }

    return map;
  }, [sceneIds, entries, screenplay, beatNameMap]);
}
