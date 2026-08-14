import { MeshBuilder } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import { buildProceduralRunnerMain } from './ProceduralRunnerBuilder';
import { appendProceduralRunnerLaneColliders } from './ProceduralRunnerCollision';
import {
  clearProceduralRunnerWorld,
  publishProceduralRunnerWorld,
} from './ProceduralRunnerRuntime';

let levelTwoSeed: number | null = null;

function getLevelTwoSeed(): number {
  if (levelTwoSeed !== null) return levelTwoSeed;
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  levelTwoSeed = values[0] >>> 0;
  return levelTwoSeed;
}

export function buildLevelTwo(options: OutdoorZoneBuildOptions): LevelInstance {
  const originX = 0;
  const originZ = 0;
  const cellSize = 50;
  const corridorWidth = 12;
  const junctionSize = 18;
  const instance = buildProceduralRunnerMain(options, {
    seed: getLevelTwoSeed(),
    originX,
    originZ,
    cellSize,
    corridorWidth,
    junctionSize,
  });

  for (const mesh of instance.root.getChildMeshes()) {
    const isRunnerPath = mesh.name.includes('-center') || mesh.name.includes('-arm-');
    if (!isRunnerPath) continue;
    mesh.metadata = { ...(mesh.metadata ?? {}), astralGround: true, proceduralRunnerGround: true };
    mesh.isPickable = true;
  }

  const cells = instance.runnerMap.chunks.map(chunk => chunk.cell);
  const minCellX = Math.min(...cells.map(cell => cell.x));
  const maxCellX = Math.max(...cells.map(cell => cell.x));
  const minCellZ = Math.min(...cells.map(cell => cell.z));
  const maxCellZ = Math.max(...cells.map(cell => cell.z));
  const aimMargin = 150;
  const aimFloor = MeshBuilder.CreateGround('level-two-aim-floor', {
    width: (maxCellX - minCellX + 1) * cellSize + aimMargin * 2,
    height: (maxCellZ - minCellZ + 1) * cellSize + aimMargin * 2,
  }, options.scene);
  aimFloor.position.set(
    originX + ((minCellX + maxCellX) * cellSize) / 2,
    0.005,
    originZ + ((minCellZ + maxCellZ) * cellSize) / 2,
  );
  aimFloor.parent = instance.root;
  aimFloor.visibility = 0.0001;
  aimFloor.isPickable = true;
  aimFloor.metadata = { astralGround: true, proceduralRunnerAimFloor: true };

  for (let index = instance.colliders.length - 1; index >= 0; index -= 1) {
    if (instance.colliders[index].label.includes('-boundary-')) instance.colliders.splice(index, 1);
  }
  appendProceduralRunnerLaneColliders(instance.colliders, instance.runnerMap, {
    originX,
    originZ,
    cellSize,
    corridorWidth: corridorWidth + 4,
    junctionSize,
    actorRadius: 0.55,
  });

  // The generic runner Exit is only a visual endpoint in Level 2 for now.
  // Progression beyond Level 2 will be authored later.
  instance.worldVolumes.splice(0, instance.worldVolumes.length);
  const entrance = instance.landmarks.find(landmark => landmark.id === 'entrance');
  if (entrance) {
    entrance.id = 'level2-entry';
    entrance.label = 'Level 2 Arrival';
  }

  const runnerRuntime = publishProceduralRunnerWorld(instance.runnerMap, originX, originZ, cellSize);
  const disposeRunner = instance.dispose.bind(instance);
  return {
    ...instance,
    id: 'level2',
    dispose: () => {
      clearProceduralRunnerWorld(runnerRuntime);
      disposeRunner();
    },
  };
}
