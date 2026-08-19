import { Color3, Mesh, MeshBuilder, TransformNode, Vector3, VertexBuffer, VertexData } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import type { DynamicBoxCollider, TraversalSurface, WorldCollider, WorldLandmark } from './WorldTypes';
import type { WorldVolume } from './WorldVolumeTypes';
import { graphicsProfile } from '../../engine/graphics/GraphicsQuality';
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
  map?: ProceduralRunnerMap;
}

const PLAYER_RADIUS = 0.55;
const TRANSITION_OVERLAP = PLAYER_RADIUS * 2 + 1.2;
const FOREST_GROUND_AMPLITUDE = 0.22;

export interface ProceduralRunnerInstance extends LevelInstance {
  readonly runnerMap: ProceduralRunnerMap;
}

function terrainHash(x: number, z: number, seed: number): number {
  const value = Math.sin(x * 12.9898 + z * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function smoothNoise(worldX: number, worldZ: number, scale: number, seed: number): number {
  const x = worldX / scale;
  const z = worldZ / scale;
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = x - x0;
  const tz = z - z0;
  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);
  const a = terrainHash(x0, z0, seed);
  const b = terrainHash(x0 + 1, z0, seed);
  const c = terrainHash(x0, z0 + 1, seed);
  const d = terrainHash(x0 + 1, z0 + 1, seed);
  const north = a + (b - a) * sx;
  const south = c + (d - c) * sx;
  return north + (south - north) * sz;
}

function forestGroundHeight(worldX: number, worldZ: number, seed: number): number {
  const broad = smoothNoise(worldX, worldZ, 19, seed + 11) * 2 - 1;
  const medium = smoothNoise(worldX, worldZ, 7.5, seed + 29) * 2 - 1;
  const fine = smoothNoise(worldX, worldZ, 3, seed + 53) * 2 - 1;
  return (broad * 0.60 + medium * 0.28 + fine * 0.12) * FOREST_GROUND_AMPLITUDE;
}

function createIrregularForestFloor(
  scene: OutdoorZoneBuildOptions['scene'],
  id: string,
  center: Vector3,
  cellSize: number,
  seed: number,
): Mesh {
  const mesh = MeshBuilder.CreateGround(id, {
    width: cellSize,
    height: cellSize,
    subdivisions: graphicsProfile().terrainSubdivisions,
    updatable: true,
  }, scene);
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  const indices = mesh.getIndices();
  if (positions && indices) {
    for (let index = 0; index < positions.length; index += 3) {
      const worldX = center.x + positions[index];
      const worldZ = center.z + positions[index + 2];
      positions[index + 1] = forestGroundHeight(worldX, worldZ, seed);
    }
    const normals = new Array<number>(positions.length).fill(0);
    VertexData.ComputeNormals(positions, indices, normals);
    mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    mesh.updateVerticesData(VertexBuffer.NormalKind, normals);
  }
  mesh.position.set(center.x, 0.055, center.z);
  mesh.receiveShadows = true;
  return mesh;
}

export function buildProceduralRunnerMain(
  options: OutdoorZoneBuildOptions,
  config: ProceduralRunnerBuildOptions,
): ProceduralRunnerInstance {
  const quality = graphicsProfile();
  const cellSize = config.cellSize ?? 50;
  const corridorWidth = config.corridorWidth ?? 12;
  const junctionSize = config.junctionSize ?? 18;
  const map = config.map ?? createProceduralRunnerMap(config.seed);
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
  const grassTuftMaterial = options.material('runner-grass-tuft', new Color3(0.18, 0.42, 0.14));
  const rockMaterial = options.material('runner-ground-rock', new Color3(0.30, 0.31, 0.27));
  const rootMaterial = options.material('runner-ground-root', new Color3(0.18, 0.10, 0.045));
  const exitMaterial = options.material('runner-exit', new Color3(1, 0.72, 0.18), 0.28);
  const endMaterial = options.material('runner-end', new Color3(0.95, 0.32, 0.40), 0.28);

  const grassPrototype = MeshBuilder.CreateCylinder('runner-grass-tuft-prototype', {
    height: 0.75,
    diameterTop: 0.06,
    diameterBottom: 0.48,
    tessellation: 4,
  }, options.scene);
  grassPrototype.position.y = -1000;
  grassPrototype.material = grassTuftMaterial;
  grassPrototype.isPickable = false;

  const rockPrototype = MeshBuilder.CreateIcoSphere('runner-ground-rock-prototype', {
    radius: 0.5,
    subdivisions: 1,
  }, options.scene);
  rockPrototype.position.y = -1000;
  rockPrototype.material = rockMaterial;
  rockPrototype.isPickable = false;

  const rootPrototype = MeshBuilder.CreateCylinder('runner-ground-root-prototype', {
    height: 1.8,
    diameter: 0.18,
    tessellation: 6,
  }, options.scene);
  rootPrototype.position.y = -1000;
  rootPrototype.material = rootMaterial;
  rootPrototype.isPickable = false;

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

  const scatterGroundDressing = (chunk: RunnerChunk, center: Vector3): void => {
    const grassCount = Math.round(34 * quality.dressingDensity);
    const rockCount = Math.round(7 * quality.dressingDensity);
    const rootCount = Math.round(4 * quality.dressingDensity);
    const total = grassCount + rockCount + rootCount;
    for (let index = 0; index < total; index += 1) {
      const seedBase = config.seed * 1009 + chunk.cell.x * 97 + chunk.cell.z * 193 + index * 17;
      const lx = (terrainHash(seedBase, 11, config.seed) - 0.5) * (cellSize - 5);
      const lz = (terrainHash(seedBase, 29, config.seed + 3) - 0.5) * (cellSize - 5);
      if (isRunnerLane(chunk, lx, lz)) continue;
      const x = center.x + lx;
      const z = center.z + lz;
      const y = 0.055 + forestGroundHeight(x, z, config.seed);
      const yaw = terrainHash(seedBase, 47, config.seed + 7) * Math.PI * 2;
      const scale = 0.72 + terrainHash(seedBase, 61, config.seed + 13) * 0.65;

      if (index < grassCount) {
        const instance = grassPrototype.createInstance(`${chunk.id}-grass-${index}`);
        instance.position.set(x, y + 0.34 * scale, z);
        instance.rotation.y = yaw;
        instance.scaling.set(scale * (0.75 + terrainHash(seedBase, 73, config.seed) * 0.4), scale, scale);
        instance.parent = root;
        continue;
      }
      if (index < grassCount + rockCount) {
        const instance = rockPrototype.createInstance(`${chunk.id}-rock-${index}`);
        instance.position.set(x, y + 0.16 * scale, z);
        instance.rotation.set(0, yaw, terrainHash(seedBase, 83, config.seed) * 0.35);
        instance.scaling.set(scale * 0.75, scale * 0.38, scale);
        instance.parent = root;
        continue;
      }
      const instance = rootPrototype.createInstance(`${chunk.id}-root-${index}`);
      instance.position.set(x, y + 0.08, z);
      instance.rotation.set(Math.PI / 2, yaw, 0.08 * (terrainHash(seedBase, 101, config.seed) - 0.5));
      instance.scaling.set(scale, scale, scale);
      instance.parent = root;
    }
  };

  for (const chunk of map.chunks) {
    const center = centerOf(chunk);
    const green = createIrregularForestFloor(options.scene, `${chunk.id}-forest-floor`, center, cellSize, config.seed);
    green.parent = root;
    green.material = forestMaterial;
    scatterGroundDressing(chunk, center);

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
