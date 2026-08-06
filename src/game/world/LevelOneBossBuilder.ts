import { Color3 } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import { buildDeterministicMap, finishDeterministicMap } from './DeterministicMap';
import { LEVEL_ONE_BOSS_MAP } from './LevelOneDeterministicMaps';

/** Isolated deterministic quarry authored around local origin. */
export function buildLevelOneBoss(options: OutdoorZoneBuildOptions): LevelInstance {
  const result = buildDeterministicMap(LEVEL_ONE_BOSS_MAP, options);
  const b = result.builder;

  const structures = [
    { x: -18, z: -2, w: 7, d: 4, h: 3 },
    { x: 17, z: 5, w: 6, d: 5, h: 2.5 },
    { x: -6, z: 14, w: 8, d: 3, h: 2.2 },
    { x: 8, z: -11, w: 6, d: 5, h: 1.2 },
  ];
  structures.forEach((s, index) => {
    if (s.h <= 1.5) {
      b.bridge(`quarry-platform-${index}`, s.x, s.z, s.w, s.d, s.h);
    } else {
      b.box(`quarry-structure-${index}`, s.x, s.z, s.w, s.d, s.h, new Color3(0.38, 0.33, 0.3));
      b.boxCollider(`quarry-structure-${index}`, s.x, s.z, s.w, s.d, 'solid', s.h);
    }
  });

  b.portal('return-portal', 0, -24);
  b.worldVolumes.push({
    id: 'boss-return-portal',
    label: 'Return Portal',
    kind: 'trigger',
    footprint: { shape: 'box', centerX: 0, centerZ: -24, halfWidth: 2.6, halfDepth: 2.6 },
    eventId: 'level-one.portal-to-main',
    once: false,
  });
  b.landmark('boss-arena', 'Wolf Keeper Quarry', 0, -18);
  b.landmark('boss-center', 'Wolf Keeper Arena Center', 0, 5);
  b.landmark('boss-return', 'Return Portal', 0, -24);
  return finishDeterministicMap(result);
}
