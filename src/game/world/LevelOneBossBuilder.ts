import { Color3 } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import { LevelInstanceBuilder } from './LevelInstanceBuilderSupport';

/** Isolated quarry authored around local origin. No main-map water is loaded. */
export function buildLevelOneBoss(options: OutdoorZoneBuildOptions): LevelInstance {
  const b = new LevelInstanceBuilder('boss', options);
  b.ground('quarry-floor', 0, 0, 84, 56, new Color3(0.63, 0.43, 0.3));

  const walls = [
    { n: 'west', x: -44, z: 0, w: 4, d: 60 },
    { n: 'east', x: 44, z: 0, w: 4, d: 60 },
    { n: 'north', x: 0, z: 30, w: 92, d: 4 },
    { n: 'south-a', x: -27, z: -30, w: 38, d: 4 },
    { n: 'south-b', x: 27, z: -30, w: 38, d: 4 },
  ];
  walls.forEach(wall => {
    b.box(`quarry-wall-${wall.n}`, wall.x, wall.z, wall.w, wall.d, 7, new Color3(0.31, 0.29, 0.28));
    b.boxCollider(`quarry-wall-${wall.n}`, wall.x, wall.z, wall.w, wall.d);
  });

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
  b.worldVolumes.push({ id: 'boss-return-portal', label: 'Return Portal', kind: 'trigger', footprint: { shape: 'box', centerX: 0, centerZ: -24, halfWidth: 1.8, halfDepth: 1.8 }, eventId: 'level-one.portal-to-main', once: false });
  b.landmark('boss-arena', 'Wolf Keeper Quarry', 0, -18);
  b.landmark('boss-center', 'Wolf Keeper Arena Center', 0, 5);
  b.landmark('boss-return', 'Return Portal', 0, -24);
  return b.finish();
}
