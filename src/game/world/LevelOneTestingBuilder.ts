import { Color3 } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import { LevelInstanceBuilder } from './LevelInstanceBuilderSupport';

export function buildLevelOneTesting(options: OutdoorZoneBuildOptions): LevelInstance {
  const b = new LevelInstanceBuilder('testing', options);
  b.ground('testing-ground', 0, 0, 58, 48, new Color3(0.12, 0.14, 0.18));
  b.box('testing-block', -10, 4, 8, 8, 1.2, new Color3(0.24, 0.28, 0.34));
  b.boxCollider('testing-block', -10, 4, 8, 8, 'traversable', 1.2);
  b.landmark('developer-testing-grounds', 'Developer Testing Grounds', 0, -16);
  b.landmark('movement-course', 'Developer Testing Grounds', 0, -16);
  return b.finish();
}
