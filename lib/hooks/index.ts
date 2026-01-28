// ---------------------------------------------------------------------------
// Composed Hooks -- Public API
// ---------------------------------------------------------------------------
//
// These hooks provide memoized, composed data from multiple stores.
// Components should prefer these hooks over building the same derived
// data repeatedly in useMemo blocks.
// ---------------------------------------------------------------------------

export { useBeatNameMap, useBeatName } from './use-beat-name-map';
export { useCurrentScene, useCurrentSceneId } from './use-current-scene';
export { useSceneMetadata, useScenesMetadata, type SceneMetadata } from './use-scene-metadata';
