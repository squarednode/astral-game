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

  // Main mouse projection intentionally ray-picks only astralGround meshes.
  // Tag only the procedural runner path surfaces so mouse-facing, hybrid
  // movement and click-to-move work on the lane without allowing clicks onto
  // decorative forest floor/scenery.
  for (const mesh of instance.root.getChildMeshes()) {
    const isRunnerPath = mesh.name.includes('-center') || mesh.name.includes('-arm-');
    if (!isRunnerPath) continue;
    mesh.metadata = {
      ...(mesh.metadata ?? {}),
      astralGround: true,
      proceduralRunnerGround: true,
    };
    mesh.isPickable = true;
  }

  // ProceduralRunnerBuilder originally supplied hard chunk-edge boundaries.
  // The runner lane system below is now the single authoritative collision
  // layer. Keeping both produces overlapping invisible walls at sockets,
  // especially where Start narrows into its first straight.
  for (let index = instance.colliders.length - 1; index >= 0; index -= 1) {
    if (instance.colliders[index].label.includes('-boundary-')) {
      instance.colliders.splice(index, 1);
    }
  }

  // Keep collision clearance slightly wider than the visible 12 m path.
  // This creates a forgiving transition throat from the 18 m Start/junction
  // pad into a straight while still constraining the player to runner space.
  appendProceduralRunnerLaneColliders(instance.colliders, instance.runnerMap, {
    originX,
    originZ,
    cellSize,
    corridorWidth: corridorWidth + 4,
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
