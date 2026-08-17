import { MeshBuilder, Vector3 } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import { LEVEL_ONE_LAYOUT } from './LevelOneLayout';
import { LEVEL_ONE_AUTHORED_RUNNER_MAP } from './LevelOneAuthoredRunnerMap';
import { buildProceduralRunnerMain } from './ProceduralRunnerBuilder';
import { appendProceduralRunnerLaneColliders } from './ProceduralRunnerCollision';
import { applyRunnerGroundMaterialTest } from './GroundSurfaceMaterials';
import {
  clearProceduralRunnerWorld,
  publishProceduralRunnerWorld,
} from './ProceduralRunnerRuntime';

/**
 * Authored Level One route built with the production runner grammar.
 * Controls/combat remain owned by the main runtime; this layer provides world
 * topology, collisions, camera metadata, portals and semantic content points.
 */
export function buildLevelOneMain(options: OutdoorZoneBuildOptions): LevelInstance {
  const originX = LEVEL_ONE_LAYOUT.points.playerSpawn.x;
  const originZ = LEVEL_ONE_LAYOUT.points.playerSpawn.z;
  const cellSize = 50;
  const corridorWidth = 12;
  const junctionSize = 18;
  const instance = buildProceduralRunnerMain(options, {
    seed: 1,
    map: LEVEL_ONE_AUTHORED_RUNNER_MAP,
    originX,
    originZ,
    cellSize,
    corridorWidth,
    junctionSize,
  });

  // First production graphics test: grass POM on the forest floor and dirt POM
  // on the runner itself. These are procedural placeholder textures so we can
  // tune depth/performance before committing final art assets.
  applyRunnerGroundMaterialTest(options.scene, instance.root.getChildMeshes());

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

  const cells = instance.runnerMap.chunks.map(chunk => chunk.cell);
  const minCellX = Math.min(...cells.map(cell => cell.x));
  const maxCellX = Math.max(...cells.map(cell => cell.x));
  const minCellZ = Math.min(...cells.map(cell => cell.z));
  const maxCellZ = Math.max(...cells.map(cell => cell.z));
  const aimMargin = 150;
  const aimFloor = MeshBuilder.CreateGround('level-one-aim-floor', {
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
    if (instance.colliders[index].label.includes('-boundary-')) {
      instance.colliders.splice(index, 1);
    }
  }

  appendProceduralRunnerLaneColliders(instance.colliders, instance.runnerMap, {
    originX,
    originZ,
    cellSize,
    corridorWidth: corridorWidth + 4,
    junctionSize,
    actorRadius: 0.55,
  });

  const center = (chunkId: string): { x: number; z: number } => {
    const chunk = instance.runnerMap.chunks.find(candidate => candidate.id === chunkId);
    if (!chunk) throw new Error(`Missing authored Level 1 chunk: ${chunkId}`);
    return {
      x: originX + chunk.cell.x * cellSize,
      z: originZ + chunk.cell.z * cellSize,
    };
  };

  const town = center('level1-town-end');
  instance.worldVolumes.push({
    id: 'level-one-town-portal',
    label: 'Town Portal',
    kind: 'trigger',
    footprint: { shape: 'box', centerX: town.x, centerZ: town.z, halfWidth: 3.5, halfDepth: 3.5 },
    eventId: 'level-one.portal-to-town',
    once: false,
  });

  const semanticLandmarks = [
    ['level1-movement-learning', 'Movement Training', 'level1-movement'],
    ['level1-crab-spawn', 'Crab Encounter', 'level1-crab'],
    ['level1-road-guide', 'Road Guide', 'level1-town-junction'],
    ['level1-town-portal', 'Town Portal', 'level1-town-end'],
    ['level1-wolf-spawn-1', 'Wolf Encounter I', 'level1-wolf-straight'],
    ['level1-wolf-spawn-2', 'Wolf Encounter II', 'level1-wolf-corner'],
    ['level1-wolf-spawn-3', 'Wolf Encounter III', 'level1-wolf-junction'],
    ['level1-mother-wolf', 'Mother Wolf Den', 'level1-mother-end'],
    ['level1-boss-portal', 'Wolf Keeper Portal', 'level1-boss-exit'],
  ] as const;
  semanticLandmarks.forEach(([id, label, chunkId]) => {
    const point = center(chunkId);
    instance.landmarks.push({ id, label, position: new Vector3(point.x, 0.18, point.z) });
  });

  const runnerRuntime = publishProceduralRunnerWorld(instance.runnerMap, originX, originZ, cellSize);
  instance.dispose = (): void => {
    clearProceduralRunnerWorld(runnerRuntime);
    // Materials/textures are scene-shared. Dispose meshes only; allowing a
    // temporary space to dispose shared materials caused first-load white worlds.
    instance.root.dispose(false, false);
  };
  return instance;
}
