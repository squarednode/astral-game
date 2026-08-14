import type { ProceduralRunnerMap, RunnerDirection } from './ProceduralRunnerMap';
import type { WorldCollider } from './WorldTypes';

export interface ProceduralRunnerCollisionOptions {
  originX: number;
  originZ: number;
  cellSize: number;
  corridorWidth: number;
  junctionSize: number;
  actorRadius: number;
}

/**
 * Converts the prototype's walkable-union rule into solid main-game
 * colliders. The clear lane is expanded by the actor diameter so the
 * character capsule never encounters a soft blocker at sockets/junctions.
 */
export function appendProceduralRunnerLaneColliders(
  colliders: WorldCollider[],
  map: ProceduralRunnerMap,
  options: ProceduralRunnerCollisionOptions,
): void {
  const half = options.cellSize / 2;
  const laneClear = options.corridorWidth + options.actorRadius * 2 + 0.5;
  const junctionClear = options.junctionSize + options.actorRadius * 2 + 0.5;
  const laneHalf = laneClear / 2;
  const junctionHalf = junctionClear / 2;
  const sideBandDepth = Math.max(0.1, half - junctionHalf);
  const sideBlockWidth = Math.max(0.1, (options.cellSize - laneClear) / 2);

  const add = (
    label: string,
    centerX: number,
    centerZ: number,
    width: number,
    depth: number,
  ): void => {
    colliders.push({
      kind: 'box',
      label,
      centerX,
      centerZ,
      halfWidth: width / 2,
      halfDepth: depth / 2,
      interaction: 'solid',
    });
  };

  const addBand = (
    chunkId: string,
    direction: RunnerDirection,
    centerX: number,
    centerZ: number,
    open: boolean,
  ): void => {
    const northSouth = direction === 'N' || direction === 'S';
    const sign = direction === 'N' || direction === 'W' ? -1 : 1;

    if (northSouth) {
      const z = centerZ + sign * (junctionHalf + sideBandDepth / 2);
      if (!open) {
        add(`${chunkId}-lane-block-${direction}`, centerX, z, options.cellSize, sideBandDepth);
        return;
      }
      const offset = laneHalf + sideBlockWidth / 2;
      add(`${chunkId}-lane-block-${direction}-a`, centerX - offset, z, sideBlockWidth, sideBandDepth);
      add(`${chunkId}-lane-block-${direction}-b`, centerX + offset, z, sideBlockWidth, sideBandDepth);
      return;
    }

    const x = centerX + sign * (junctionHalf + sideBandDepth / 2);
    if (!open) {
      add(`${chunkId}-lane-block-${direction}`, x, centerZ, sideBandDepth, options.cellSize);
      return;
    }
    const offset = laneHalf + sideBlockWidth / 2;
    add(`${chunkId}-lane-block-${direction}-a`, x, centerZ - offset, sideBandDepth, sideBlockWidth);
    add(`${chunkId}-lane-block-${direction}-b`, x, centerZ + offset, sideBandDepth, sideBlockWidth);
  };

  for (const chunk of map.chunks) {
    const centerX = options.originX + chunk.cell.x * options.cellSize;
    const centerZ = options.originZ + chunk.cell.z * options.cellSize;
    const sockets = new Set(chunk.sockets);
    (['N', 'E', 'S', 'W'] as RunnerDirection[]).forEach(direction => {
      addBand(chunk.id, direction, centerX, centerZ, sockets.has(direction));
    });
  }
}
