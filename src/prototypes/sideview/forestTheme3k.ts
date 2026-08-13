import {
  Color3,
  DynamicTexture,
  Engine,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
} from '@babylonjs/core';

type Direction = 'N' | 'E' | 'S' | 'W';
type ChunkRole = 'main' | 'secret';
type GridPoint = { x: number; z: number };
type Chunk = {
  id: string;
  cell: GridPoint;
  role: ChunkRole;
  sockets: Direction[];
};
type GeneratedMap = { seed: number; chunks: Chunk[] };
type ProcApi = { snapshot: () => GeneratedMap };
type ForestVariant = 'sunlit-grove' | 'misty-pines';

const CELL_SIZE = 50;
const HALF_CELL = CELL_SIZE / 2;
const CORRIDOR_HALF = 7.5;
const JUNCTION_HALF = 10.5;
const BACKDROP_OFFSET = 32;

function seeded(seed: number): () => number {
  let state = seed >>> 0 || 0x9e3779b9;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function install(): boolean {
  const api = (globalThis as typeof globalThis & { __astralProcMap?: ProcApi }).__astralProcMap;
  const engine = Engine.Instances[0];
  const scene: Scene | undefined = engine?.scenes[0];
  if (!api || !scene) return false;

  const map = api.snapshot();
  const root = new TransformNode('FOREST_THEME_ROOT_3K', scene);

  const makeMaterial = (name: string, color: Color3): StandardMaterial => {
    const material = new StandardMaterial(name, scene);
    material.diffuseColor = color;
    material.specularColor = new Color3(0.015, 0.015, 0.015);
    return material;
  };

  const terrainMaterial = makeMaterial('forest-dirt-path-3k', new Color3(0.30, 0.23, 0.14));
  const secretTerrainMaterial = makeMaterial('forest-secret-path-3k', new Color3(0.22, 0.18, 0.11));
  const forestFloorMaterial = makeMaterial('forest-floor-3k', new Color3(0.12, 0.25, 0.10));
  const trunkMaterial = makeMaterial('forest-trunk-3k', new Color3(0.19, 0.11, 0.055));
  const leafMaterialA = makeMaterial('forest-leaf-a-3k', new Color3(0.08, 0.29, 0.11));
  const leafMaterialB = makeMaterial('forest-leaf-b-3k', new Color3(0.15, 0.37, 0.14));
  const rockMaterial = makeMaterial('forest-rock-3k', new Color3(0.25, 0.27, 0.23));

  // Forest biome replaces prototype debug presentation without changing walkability.
  for (const mesh of scene.meshes) {
    if (mesh.metadata?.proceduralWalkable) {
      const chunk = map.chunks.find(item => item.id === mesh.metadata.chunkId);
      mesh.material = chunk?.role === 'secret' ? secretTerrainMaterial : terrainMaterial;
    }
    if (mesh.name.includes('-wall-') || mesh.name.includes('-socket-')) {
      mesh.setEnabled(false);
    }
  }

  function createBackdropTexture(name: string, variant: ForestVariant): DynamicTexture {
    const texture = new DynamicTexture(name, { width: 1024, height: 512 }, scene, false);
    const ctx = texture.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    if (variant === 'sunlit-grove') {
      gradient.addColorStop(0, '#b9d5b2');
      gradient.addColorStop(0.48, '#718f6d');
      gradient.addColorStop(1, '#213823');
    } else {
      gradient.addColorStop(0, '#9eafb0');
      gradient.addColorStop(0.48, '#5c716e');
      gradient.addColorStop(1, '#1b2d2b');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);

    const rand = seeded(name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0));
    const layers = variant === 'sunlit-grove'
      ? [
          { y: 350, color: '#3c5f3d', count: 24, minH: 100, maxH: 185 },
          { y: 420, color: '#24452b', count: 32, minH: 140, maxH: 250 },
          { y: 485, color: '#142b1c', count: 38, minH: 185, maxH: 320 },
        ]
      : [
          { y: 345, color: '#455d59', count: 26, minH: 115, maxH: 215 },
          { y: 420, color: '#2d4743', count: 34, minH: 155, maxH: 275 },
          { y: 490, color: '#172d2a', count: 40, minH: 200, maxH: 340 },
        ];

    for (const layer of layers) {
      ctx.fillStyle = layer.color;
      for (let i = 0; i < layer.count; i += 1) {
        const x = rand() * 1024;
        const h = layer.minH + rand() * (layer.maxH - layer.minH);
        const w = 22 + rand() * 35;
        ctx.fillRect(x - 3, layer.y - h * 0.55, 6, h * 0.7);
        ctx.beginPath();
        ctx.moveTo(x, layer.y - h);
        ctx.lineTo(x - w, layer.y - h * 0.35);
        ctx.lineTo(x + w, layer.y - h * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, layer.y - h * 0.72);
        ctx.lineTo(x - w * 1.18, layer.y - h * 0.03);
        ctx.lineTo(x + w * 1.18, layer.y - h * 0.03);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (variant === 'misty-pines') {
      const mist = ctx.createLinearGradient(0, 250, 0, 455);
      mist.addColorStop(0, 'rgba(220,235,232,0)');
      mist.addColorStop(0.52, 'rgba(220,235,232,0.22)');
      mist.addColorStop(1, 'rgba(220,235,232,0)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, 230, 1024, 240);
    }

    texture.update(false);
    return texture;
  }

  const backdropMaterials = new Map<ForestVariant, StandardMaterial>();
  for (const variant of ['sunlit-grove', 'misty-pines'] as const) {
    const material = new StandardMaterial(`forest-backdrop-${variant}-3k`, scene);
    const texture = createBackdropTexture(`forest-${variant}-3k`, variant);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.emissiveColor = new Color3(0.28, 0.28, 0.28);
    material.specularColor = new Color3(0, 0, 0);
    material.backFaceCulling = false;
    backdropMaterials.set(variant, material);
  }

  function createTree(parent: TransformNode, x: number, z: number, scale: number, altLeaves: boolean): void {
    const trunk = MeshBuilder.CreateCylinder('forest-tree-trunk-3k', {
      height: 5.3 * scale,
      diameterTop: 0.5 * scale,
      diameterBottom: 0.85 * scale,
      tessellation: 7,
    }, scene);
    trunk.position.set(x, 2.65 * scale, z);
    trunk.material = trunkMaterial;
    trunk.isPickable = false;
    trunk.parent = parent;

    const crown = MeshBuilder.CreateCylinder('forest-tree-crown-3k', {
      height: 6.4 * scale,
      diameterTop: 0,
      diameterBottom: 4.7 * scale,
      tessellation: 7,
    }, scene);
    crown.position.set(x, 7.0 * scale, z);
    crown.material = altLeaves ? leafMaterialB : leafMaterialA;
    crown.isPickable = false;
    crown.parent = parent;
  }

  function createRock(parent: TransformNode, x: number, z: number, scale: number): void {
    const rock = MeshBuilder.CreateIcoSphere('forest-rock-3k', { radius: 0.75 * scale, subdivisions: 1 }, scene);
    rock.scaling.set(1.45, 0.6, 1);
    rock.position.set(x, 0.34 * scale, z);
    rock.rotation.y = scale * 1.9;
    rock.material = rockMaterial;
    rock.isPickable = false;
    rock.parent = parent;
  }

  function pointIsRunnerLane(chunk: Chunk, lx: number, lz: number): boolean {
    if (Math.abs(lx) <= JUNCTION_HALF && Math.abs(lz) <= JUNCTION_HALF) return true;
    const sockets = new Set(chunk.sockets);
    if ((sockets.has('N') || sockets.has('S')) && Math.abs(lx) <= CORRIDOR_HALF) return true;
    if ((sockets.has('E') || sockets.has('W')) && Math.abs(lz) <= CORRIDOR_HALF) return true;
    return false;
  }

  function createBackdropForClosedEdge(
    parent: TransformNode,
    chunk: Chunk,
    variant: ForestVariant,
    direction: Direction,
    cx: number,
    cz: number,
  ): void {
    if (chunk.sockets.includes(direction)) return;
    const plane = MeshBuilder.CreatePlane(`forest-backdrop-${chunk.id}-${direction}-3k`, { width: 58, height: 26 }, scene);
    plane.position.set(cx, 10.5, cz);
    if (direction === 'N') {
      plane.position.z -= BACKDROP_OFFSET;
      plane.rotation.y = 0;
    } else if (direction === 'S') {
      plane.position.z += BACKDROP_OFFSET;
      plane.rotation.y = Math.PI;
    } else if (direction === 'W') {
      plane.position.x -= BACKDROP_OFFSET;
      plane.rotation.y = Math.PI / 2;
    } else {
      plane.position.x += BACKDROP_OFFSET;
      plane.rotation.y = -Math.PI / 2;
    }
    plane.material = backdropMaterials.get(variant)!;
    plane.isPickable = false;
    plane.parent = parent;
  }

  const variants = new Map<string, ForestVariant>();

  for (const chunk of map.chunks) {
    const rand = seeded((map.seed ^ ((chunk.cell.x + 31) * 73856093) ^ ((chunk.cell.z + 47) * 19349663)) >>> 0);
    const variant: ForestVariant = rand() < 0.5 ? 'sunlit-grove' : 'misty-pines';
    variants.set(chunk.id, variant);

    const chunkRoot = new TransformNode(`FOREST_${chunk.id}_3K`, scene);
    chunkRoot.parent = root;
    const cx = chunk.cell.x * CELL_SIZE;
    const cz = chunk.cell.z * CELL_SIZE;

    // Full-cell forest floor fills all former black void inside generated cells.
    const ground = MeshBuilder.CreateBox(`forest-ground-${chunk.id}-3k`, {
      width: CELL_SIZE + 0.8,
      height: 0.22,
      depth: CELL_SIZE + 0.8,
    }, scene);
    ground.position.set(cx, -0.43, cz);
    ground.material = forestFloorMaterial;
    ground.isPickable = false;
    ground.parent = chunkRoot;

    for (const direction of ['N', 'E', 'S', 'W'] as const) {
      createBackdropForClosedEdge(chunkRoot, chunk, variant, direction, cx, cz);
    }

    // Candidate scenery points are terrain-only. Any point that falls within a valid lane is rejected.
    const candidates: Array<[number, number]> = [
      [-19, -19], [-12, -19], [12, -19], [19, -19],
      [-19, -12], [19, -12], [-19, 12], [19, 12],
      [-19, 19], [-12, 19], [12, 19], [19, 19],
      [-19, 0], [19, 0], [0, -19], [0, 19],
    ];

    let treeIndex = 0;
    for (const [baseX, baseZ] of candidates) {
      if (rand() < 0.38) continue;
      const lx = baseX + (rand() - 0.5) * 3;
      const lz = baseZ + (rand() - 0.5) * 3;
      if (pointIsRunnerLane(chunk, lx, lz)) continue;
      createTree(chunkRoot, cx + lx, cz + lz, 0.7 + rand() * 0.48, treeIndex % 2 === 0);
      treeIndex += 1;
    }

    for (let i = 0; i < 6; i += 1) {
      let lx = 0;
      let lz = 0;
      let accepted = false;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        lx = (rand() - 0.5) * 42;
        lz = (rand() - 0.5) * 42;
        if (!pointIsRunnerLane(chunk, lx, lz)) {
          accepted = true;
          break;
        }
      }
      if (accepted) createRock(chunkRoot, cx + lx, cz + lz, 0.4 + rand() * 0.65);
    }
  }

  const hud = document.querySelector<HTMLDivElement>('#prototypeHud');
  if (hud) {
    const line = document.createElement('div');
    line.className = 'prototype-muted';
    line.textContent = 'Biome 3k: FOREST · full-cell ground · closed-edge backdrops · socket-aware scenery';
    hud.appendChild(line);
  }

  (globalThis as typeof globalThis & {
    __astralBiome?: { biome: string; variants: () => Record<string, ForestVariant> };
  }).__astralBiome = {
    biome: 'forest',
    variants: () => Object.fromEntries(variants),
  };

  return true;
}

function waitForRuntime(): void {
  if (install()) return;
  window.setTimeout(waitForRuntime, 25);
}

waitForRuntime();
