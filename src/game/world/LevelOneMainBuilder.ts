import { MeshBuilder } from '@babylonjs/core';
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
  // Tag the visible runner path first so it remains the preferred hit target.
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

  // Keep an almost-invisible aim plane underneath the generated footprint.
  // When the cursor moves far off the narrow runner lane, main input still gets
  // a fresh world-space direction instead of keeping the last valid lane hit.
  const cells = instance.runnerMap.chunks.map(chunk => chunk.cell);
  const minCellX = Math.min(...cells.map(cell => cell.x));
  const maxCellX = Math.max(...cells.map(cell => cell.x));
  const minCellZ = Math.min(...cells.map(cell => cell.z));
  const maxCellZ = Math.max(...cells.map(cell => cell.z));
  const aimMargin = 150;
  const aimWidth = (maxCellX - minCellX + 1) * cellSize + aimMargin * 2;
  const aimDepth = (maxCellZ - minCellZ + 1) * cellSize + aimMargin * 2;
  const aimFloor = MeshBuilder.CreateGround('procedural-runner-aim-floor', {
    width: aimWidth,
    height: aimDepth,
  }, options.scene);
  aimFloor.position.set(
    originX + ((minCellX + maxCellX) * cellSize) / 2,
    0.005,
    originZ + ((minCellZ + maxCellZ) * cellSize) / 2,
  );
  aimFloor.parent = instance.root;
  aimFloor.visibility = 0.0001;
  aimFloor.isPickable = true;
  aimFloor.metadata = {
    astralGround: true,
    proceduralRunnerAimFloor: true,
  };

  // ProceduralRunnerBuilder originally supplied hard chunk-edge boundaries.
  // The runner lane system below is now the single authoritative collision
  // layer. Keeping both produces overlapping invisible walls at sockets.
  for (let index = instance.colliders.length - 1; index >= 0; index -= 1) {
    if (instance.colliders[index].label.includes('-boundary-')) {
      instance.colliders.splice(index, 1);
    }
  }

  // Keep collision clearance slightly wider than the visible 12 m path.
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
