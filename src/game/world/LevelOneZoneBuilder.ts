import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import { buildLevelOneBoss } from './LevelOneBossBuilder';
import { buildLevelOneMain } from './LevelOneMainBuilder';
import { buildLevelOneTesting } from './LevelOneTestingBuilder';
import { LevelInstanceSystem, type LevelInstanceZone } from './LevelInstanceSystem';

/**
 * 0.6.9.2 level-instance facade. Only one space is constructed and owned at a
 * time; transfers dispose the old root and publish the new collision data.
 */
export function buildLevelOneZone(options: OutdoorZoneBuildOptions): LevelInstanceZone {
  return new LevelInstanceSystem(options, {
    main: buildLevelOneMain,
    boss: buildLevelOneBoss,
    testing: buildLevelOneTesting,
  });
}
