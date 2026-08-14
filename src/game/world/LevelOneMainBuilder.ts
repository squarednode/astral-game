import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import { LEVEL_ONE_LAYOUT } from './LevelOneLayout';
import { buildProceduralRunnerMain } from './ProceduralRunnerBuilder';
import { appendProceduralRunnerLaneColliders } from './ProceduralRunnerCollision';
import {
  clearProceduralRunnerWorld,
  publishProceduralRunnerWorld,
} from './ProceduralRunnerRuntime';

let sessionSeed: number | null = null;

function getSessionRunnerSeed(): number {
  if (sessionSeed !== null) return sessionSeed;
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  sessionSeed = values[0] >>> 0;
  return sessionSeed;
}

/**
 * Level One main space uses the procedural 2.5D runner grammar.
 * Player input, movement intent, dodge/jump, combat and party controls remain
 * owned by the main game runtime.
 */
export function buildLevelOneMain(options: OutdoorZoneBuildOptions): LevelInstance {
  const originX = LEVEL_ONE_LAYOUT.points.playerSpawn.x;
  const originZ = LEVEL_ONE_LAYOUT.points.playerSpawn.z;
  const cellSize = 50;
  const corridorWidth = 12;
  const junctionSize = 18;
  const instance = buildProceduralRunnerMain(options, {
    seed: getSessionRunnerSeed(),
    originX,
    originZ,
    cellSize,
    corridorWidth,
    junctionSize,
  });

  appendProceduralRunnerLaneColliders(instance.colliders, instance.runnerMap, {
    originX,
    originZ,
    cellSize,
    corridorWidth,
    junctionSize,
    actorRadius: 0.55,
  });

  const runnerRuntime = publishProceduralRunnerWorld(
    instance.runnerMap,
    originX,
    originZ,
    cellSize,
  );
  const disposeRunner = instance.dispose.bind(instance);
  instance.dispose = (): void => {
    clearProceduralRunnerWorld(runnerRuntime);
    disposeRunner();
  };
  return instance;
}
