import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import { buildLevelOneBossArena } from './LevelOneBossArenaBuilder';
import { buildLevelOneMain } from './LevelOneMainBuilder';
import { buildLevelOneTesting } from './LevelOneTestingBuilder';
import { buildLevelOneTown } from './LevelOneTownBuilder';
import { buildLevelTwo } from './LevelTwoBuilder';
import { LevelInstanceSystem, type LevelInstanceZone } from './LevelInstanceSystem';
import { installWorldPortalRuntime } from './WorldPortalRuntime';

installWorldPortalRuntime();

/**
 * World-space facade. Only one gameplay space is constructed at a time;
 * transfers dispose the old root and publish the new collision/surface data.
 */
export function buildLevelOneZone(options: OutdoorZoneBuildOptions): LevelInstanceZone {
  return new LevelInstanceSystem(options, {
    main: buildLevelOneMain,
    town: buildLevelOneTown,
    boss: buildLevelOneBossArena,
    level2: buildLevelTwo,
    testing: buildLevelOneTesting,
  });
}
