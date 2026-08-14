import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import { LEVEL_ONE_LAYOUT } from './LevelOneLayout';
import { buildProceduralRunnerMain } from './ProceduralRunnerBuilder';

let sessionSeed: number | null = null;

function getSessionRunnerSeed(): number {
  if (sessionSeed !== null) return sessionSeed;
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  sessionSeed = values[0] >>> 0;
  return sessionSeed;
}

/**
 * Level One main space now uses the procedural 2.5D runner grammar.
 *
 * Important integration rule: this builder only owns level topology,
 * traversal surfaces, colliders, scenery and world volumes. Player input,
 * movement intent, dodge/jump, combat and party controls remain owned by the
 * main game runtime.
 */
export function buildLevelOneMain(options: OutdoorZoneBuildOptions): LevelInstance {
  return buildProceduralRunnerMain(options, {
    seed: getSessionRunnerSeed(),
    originX: LEVEL_ONE_LAYOUT.points.playerSpawn.x,
    originZ: LEVEL_ONE_LAYOUT.points.playerSpawn.z,
  });
}
