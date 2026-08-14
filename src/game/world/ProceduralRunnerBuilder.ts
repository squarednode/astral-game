import { Color3, MeshBuilder, TransformNode, Vector3 } from '@babylonjs/core';
import type { Mesh } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import type { DynamicBoxCollider, TraversalSurface, WorldCollider, WorldLandmark } from './WorldTypes';
import type { WorldVolume } from './WorldVolumeTypes';
import {
  createProceduralRunnerMap,
  RUNNER_DELTA,
  type ProceduralRunnerMap,
  type RunnerChunk,
  type RunnerDirection,
} from './ProceduralRunnerMap';

export interface ProceduralRunnerBuildOptions {
  seed: number;
  originX: number;
  originZ: number;
  cellSize?: number;
  corridorWidth?: number;
  junctionSize?: number;
}

const PLAYER_RADIUS = 0.55;
const TRANSITION_OVERLAP = PLAYER_RADIUS * 2 + 1.2;

export interface ProceduralRunnerInstance extends LevelInstance {
  readonly runnerMap: ProceduralRunnerMap;
}

export function buildProceduralRunnerMain(
  options: OutdoorZoneBuildOptions,
  config: ProceduralRunnerBuildOptions,
): ProceduralRunnerInstance {
  const cellSize = config.cellSize ?? 50;
  const corridorWidth = config.corridorWidth ?? 12;
  const junctionSize = config.junctionSize ?? 18;
  const map = createProceduralRunnerMap(config.seed);
  const root = new TransformNode('level-main-procedural-runner', options.scene);
  const colliders: WorldCollider[] = [];
  const traversalSurfaces: TraversalSurface[] = [];
  const worldVolumes: WorldVolume[] = [];
  const dynamicColliders: DynamicBoxCollider[] = [];
  const landmarks: WorldLandmark[] = [];
  const traversalHighlights: Mesh[] = [];

  const forestMaterial = options.material('runner-forest-floor', new Color3(0.12, 0.25, 0.10));
  const mainPathMaterial = options.material('runner-main-path', new Color3(0.30, 0.23, 0.14));
  const secretPathMaterial = options.material('runner-secret-path', new Color3(0.22, 0.18, 0.11));
  const treeTrunk = options.material('runner-tree-trunk', new Color3(0.19, 0.11, 0.055));
  const treeLeaf = options.material('runner-tree-leaf', new Color3(0.10, 0.31, 0.12));
  const exitMaterial = options.material('runner-exit', new Color3(1, 0.72, 0.18), 0.28);
  const endMaterial = options.material('runner-end', new Color3(0.95, 0.32, 0.40), 0.28);

  const centerOf = (chunk: RunnerChunk): Vector3 => new Vector3(
    config.originX + chunk.cell.x * cellSize,
    0,
    config.originZ + chunk.cell.z * cellSize,
  );

  const addWalkableBox = (
    id: string,
    center: Vector3,
    width: number,
    depth: number,
    chunk: RunnerChunk,
  ): void => {
    const mesh = MeshBuilder.CreateBox(id, { width, height: 0.18, depth }, options.scene);
    mesh.position.set(center.x, 0.09, center.z);
    mesh.parent = root;
    mesh.material = chunk.role === 'secret' ? secretPathMaterial : mainPathMaterial;
    mesh.receiveShadows = true;
    traversalSurfaces.push({
      mode: 'free',
      shape: 'box',
      id: `${id}-surface`,
      label: id,
      colliderLabel: id,
      center: new Vector3(center.x, 0.18, center.z),
      halfWidth: width / 2,
      halfDepth: depth / 2,
      surfaceHeight: 0.18,
      entryPadding: 0.8,
      exitDistance: 1.1,
    });
  };

  const addBoundary = (label: string, x: number, z: number, width: number, depth: number): void => {
    colliders.push({
      kind: 'box', label, centerX: x, centerZ: z,
      halfWidth: width / 2, halfDepth: depth / 2,
      interaction: 'solid',
    });
  };

  const addTree = (name: string, x: number, z: number, scale: number): void => {
    const trunk = MeshBuilder.CreateCylinder(`${name}-trunk`, {
      height: 5.3 * scale,
      diameterTop: 0.5 * scale,
      diameterBottom: 0.85 * scale,
      tessellation: 7,
    }, options.scene);
    trunk.position.set(x, 2.65 * scale, z);
    trunk.parent = root;
    trunk.material = treeTrunk;
    const crown = MeshBuilder.CreateCylinder(`${name}-crown`, {
      height: 6.4 * scale,
      diameterTop: 0,
      diameterBottom: 4.7 * scale,
      tessellation: 7,
    }, options.scene);
    crown.position.set(x, 7 * scale, z);
    crown.parent = root;
    crown.material = treeLeaf;
  };

  const isRunnerLane = (chunk: RunnerChunk, lx: number, lz: number): boolean => {
    if (Math.abs(lx) <= 10.5 && Math.abs(lz) <= 10.5) return true;
    const sockets = new Set(chunk.sockets);
    if ((sockets.has('N') || sockets.has('S')) && Math.abs(lx) <= 7.5) return true;
    if ((sockets.has('E') || sockets.has('W')) && Math.abs(lz) <= 7.5) return true;
    return false;
  };

  for (const chunk of map.chunks) {
    const center = centerOf(chunk);
    const green = MeshBuilder.CreateBox(`${chunk.id}-forest-floor`, {
      width: cellSize,
      height: 0.08,
      depth: cellSize,
    }, options.scene);
    green.position.set(center.x, 0.04, center.z);
    green.parent = root;
    green.material = forestMaterial;

    const armInner = junctionSize / 2 - TRANSITION_OVERLAP;
    const armOuter = cellSize / 2 + TRANSITION_OVERLAP;
    const armLength = armOuter - armInner;
    const armCenterOffset = (armInner + armOuter) / 2;

    addWalkableBox(`${chunk.id}-center`, center, junctionSize, junctionSize, chunk);
    for (const direction of chunk.sockets) {
      const delta = RUNNER_DELTA[direction];
      const horizontal = direction === 'E' || direction === 'W';
      addWalkableBox(
        `${chunk.id}-arm-${direction}`,
        new Vector3(
          center.x + delta.x * armCenterOffset,
          0,
          center.z + delta.z * armCenterOffset,
        ),
        horizontal ? armLength : corridorWidth,
        horizontal ? corridorWidth : armLength,
        chunk,
      );
    }

    const half = cellSize / 2;
    const wall = 0.6;
    const gap = corridorWidth + 0.8;
    const sideSpan = (cellSize - gap) / 2;
    const sockets = new Set(chunk.sockets);
    const addEdge = (direction: RunnerDirection): void => {
      const open = sockets.has(direction);
      const horizontalEdge = direction === 'N' || direction === 'S';
      const sign = direction === 'N' || direction === 'W' ? -1 : 1;
      if (!open) {
        addBoundary(
          `${chunk.id}-boundary-${direction}`,
          center.x + (!horizontalEdge ? sign * half : 0),
          center.z + (horizontalEdge ? sign * half : 0),
          horizontalEdge ? cellSize : wall,
          horizontalEdge ? wall : cellSize,
        );
        return;
      }
      const offset = gap / 2 + sideSpan / 2;
      if (horizontalEdge) {
        addBoundary(`${chunk.id}-boundary-${direction}-a`, center.x - offset, center.z + sign * half, sideSpan, wall);
        addBoundary(`${chunk.id}-boundary-${direction}-b`, center.x + offset, center.z + sign * half, sideSpan, wall);
      } else {
        addBoundary(`${chunk.id}-boundary-${direction}-a`, center.x + sign * half, center.z - offset, wall, sideSpan);
        addBoundary(`${chunk.id}-boundary-${direction}-b`, center.x + sign * half, center.z + offset, wall, sideSpan);
      }
    };
    (['N', 'E', 'S', 'W'] as RunnerDirection[]).forEach(addEdge);

    const candidates: Array<[number, number]> = [
      [-19,-19],[-12,-19],[12,-19],[19,-19],[-19,-12],[19,-12],
      [-19,12],[19,12],[-19,19],[-12,19],[12,19],[19,19],
    ];
    candidates.forEach(([lx,lz], index) => {
      if (isRunnerLane(chunk, lx, lz)) return;
      if ((index + chunk.cell.x * 3 + chunk.cell.z * 5) % 3 === 0) return;
      addTree(`${chunk.id}-tree-${index}`, center.x + lx, center.z + lz, 0.72 + (index % 4) * 0.08);
    });

    if (chunk.type === 'start') {
      landmarks.push({ id: 'entrance', label: 'Forest Arrival', position: new Vector3(center.x, 0.18, center.z) });
    }
    if (chunk.type === 'exit') {
      const marker = MeshBuilder.CreateCylinder(`${chunk.id}-exit-marker`, { diameter: 4, height: 0.14, tessellation: 28 }, options.scene);
      marker.position.set(center.x, 0.25, center.z);
      marker.parent = root;
      marker.material = exitMaterial;
      landmarks.push({ id: 'exit', label: 'Boss Portal', position: new Vector3(center.x, 0.18, center.z) });
      worldVolumes.push({
        id: 'main-boss-portal',
        label: 'Boss Area Portal',
        kind: 'trigger',
        footprint: { shape: 'box', centerX: center.x, centerZ: center.z, halfWidth: 3.5, halfDepth: 3.5 },
        eventId: 'level-one.portal-to-boss',
        once: false,
      });
    }
    if (chunk.type === 'end') {
      const marker = MeshBuilder.CreateCylinder(`${chunk.id}-end-marker`, { diameter: 3.6, height: 0.14, tessellation: 28 }, options.scene);
      marker.position.set(center.x, 0.25, center.z);
      marker.parent = root;
      marker.material = endMaterial;
      landmarks.push({ id: `secret-${chunk.id}`, label: 'Secret End', position: new Vector3(center.x, 0.18, center.z) });
    }
  }

  const dispose = (): void => root.dispose(false, true);
  return {
    id: 'main',
    root,
    groundName: `${map.startId}-center`,
    colliders,
    traversalSurfaces,
    worldVolumes,
    dynamicColliders,
    landmarks,
    traversalHighlights,
    runnerMap: map,
    update: () => undefined,
    dispose,
  };
}
