import {
  Color3,
  DynamicTexture,
  Engine,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

type ChunkType = 'start' | 'exit' | 'end' | 'straight' | 'l' | 't' | 'plus';
type ChunkRole = 'main' | 'secret';
type GridPoint = { x: number; z: number };
type Chunk = {
  id: string;
  cell: GridPoint;
  role: ChunkRole;
  type: ChunkType;
  sockets: string[];
  neighbors: string[];
  mainIndex: number | null;
  branchIndex: number | null;
};
type GeneratedMap = { seed: number; chunks: Chunk[] };
type ProcApi = { snapshot: () => GeneratedMap };

type ForestVariant = 'sunlit-grove' | 'misty-pines';

const CELL_SIZE = 50;
const FOREST_EDGE = 23;
const TREE_LINE = 19.5;

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
  const root = new TransformNode('FOREST_THEME_ROOT', scene);

  const terrainMaterial = new StandardMaterial('forest-dirt-path', scene);
  terrainMaterial.diffuseColor = new Color3(0.28, 0.22, 0.13);
  terrainMaterial.specularColor = new Color3(0.03, 0.03, 0.02);

  const secretTerrainMaterial = new StandardMaterial('forest-secret-path', scene);
  secretTerrainMaterial.diffuseColor = new Color3(0.19, 0.17, 0.11);
  secretTerrainMaterial.specularColor = new Color3(0.02, 0.02, 0.02);

  const forestFloorMaterial = new StandardMaterial('forest-floor', scene);
  forestFloorMaterial.diffuseColor = new Color3(0.12, 0.22, 0.10);
  forestFloorMaterial.specularColor = new Color3(0.01, 0.01, 0.01);

  const trunkMaterial = new StandardMaterial('forest-trunk', scene);
  trunkMaterial.diffuseColor = new Color3(0.20, 0.12, 0.065);
  trunkMaterial.specularColor = new Color3(0.02, 0.02, 0.02);

  const leafMaterialA = new StandardMaterial('forest-leaf-a', scene);
  leafMaterialA.diffuseColor = new Color3(0.10, 0.30, 0.13);
  leafMaterialA.specularColor = new Color3(0.01, 0.01, 0.01);

  const leafMaterialB = new StandardMaterial('forest-leaf-b', scene);
  leafMaterialB.diffuseColor = new Color3(0.17, 0.38, 0.16);
  leafMaterialB.specularColor = new Color3(0.01, 0.01, 0.01);

  const rockMaterial = new StandardMaterial('forest-rock', scene);
  rockMaterial.diffuseColor = new Color3(0.23, 0.25, 0.21);
  rockMaterial.specularColor = new Color3(0.04, 0.04, 0.04);

  // Re-skin the existing playable geometry but keep all movement/collision metadata unchanged.
  for (const mesh of scene.meshes) {
    if (!mesh.metadata?.proceduralWalkable) continue;
    const chunk = map.chunks.find(item => item.id === mesh.metadata.chunkId);
    mesh.material = chunk?.role === 'secret' ? secretTerrainMaterial : terrainMaterial;
  }

  function createBackdropTexture(name: string, variant: ForestVariant): DynamicTexture {
    const texture = new DynamicTexture(name, { width: 1024, height: 512 }, scene, false);
    const ctx = texture.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    if (variant === 'sunlit-grove') {
      gradient.addColorStop(0, '#b8d6b2');
      gradient.addColorStop(0.45, '#749271');
      gradient.addColorStop(1, '#263c29');
    } else {
      gradient.addColorStop(0, '#9baeb0');
      gradient.addColorStop(0.45, '#5e7470');
      gradient.addColorStop(1, '#1f3030');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);

    const layers = variant === 'sunlit-grove'
      ? [
          { y: 340, color: '#385a3b', count: 22, minH: 90, maxH: 190 },
          { y: 395, color: '#203d28', count: 30, minH: 120, maxH: 245 },
          { y: 455, color: '#12271b', count: 38, minH: 160, maxH: 300 },
        ]
      : [
          { y: 330, color: '#425b58', count: 26, minH: 115, maxH: 230 },
          { y: 405, color: '#2a4441', count: 34, minH: 155, maxH: 285 },
          { y: 470, color: '#172c29', count: 42, minH: 190, maxH: 340 },
        ];

    const rand = seeded(name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0));
    for (const layer of layers) {
      ctx.fillStyle = layer.color;
      for (let i = 0; i < layer.count; i += 1) {
        const x = rand() * 1024;
        const h = layer.minH + rand() * (layer.maxH - layer.minH);
        const w = 24 + rand() * 34;
        ctx.fillRect(x - 3, layer.y - h * 0.5, 6, h * 0.65);
        ctx.beginPath();
        ctx.moveTo(x, layer.y - h);
        ctx.lineTo(x - w, layer.y - h * 0.35);
        ctx.lineTo(x + w, layer.y - h * 0.35);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, layer.y - h * 0.72);
        ctx.lineTo(x - w * 1.2, layer.y - h * 0.05);
        ctx.lineTo(x + w * 1.2, layer.y - h * 0.05);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (variant === 'sunlit-grove') {
      const glow = ctx.createRadialGradient(790, 105, 10, 790, 105, 150);
      glow.addColorStop(0, 'rgba(255,245,180,0.75)');
      glow.addColorStop(1, 'rgba(255,245,180,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(620, 0, 330, 260);
    } else {
      const mist = ctx.createLinearGradient(0, 270, 0, 430);
      mist.addColorStop(0, 'rgba(220,235,232,0)');
      mist.addColorStop(0.5, 'rgba(220,235,232,0.24)');
      mist.addColorStop(1, 'rgba(220,235,232,0)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, 230, 1024, 230);
    }

    texture.update(false);
    return texture;
  }

  const backdropMaterials = new Map<ForestVariant, StandardMaterial>();
  for (const variant of ['sunlit-grove', 'misty-pines'] as const) {
    const material = new StandardMaterial(`forest-backdrop-${variant}`, scene);
    const texture = createBackdropTexture(`forest-${variant}`, variant);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.emissiveColor = new Color3(0.35, 0.35, 0.35);
    material.backFaceCulling = false;
    material.specularColor = new Color3(0, 0, 0);
    backdropMaterials.set(variant, material);
  }

  function createTree(parent: TransformNode, x: number, z: number, scale: number, altLeaves: boolean): void {
    const trunk = MeshBuilder.CreateCylinder('forest-tree-trunk', {
      height: 5.5 * scale,
      diameterTop: 0.55 * scale,
      diameterBottom: 0.9 * scale,
      tessellation: 7,
    }, scene);
    trunk.position.set(x, 2.75 * scale, z);
    trunk.material = trunkMaterial;
    trunk.isPickable = false;
    trunk.parent = parent;

    const crown = MeshBuilder.CreateCylinder('forest-tree-crown', {
      height: 6.8 * scale,
      diameterTop: 0,
      diameterBottom: 5.0 * scale,
      tessellation: 7,
    }, scene);
    crown.position.set(x, 7.3 * scale, z);
    crown.material = altLeaves ? leafMaterialB : leafMaterialA;
    crown.isPickable = false;
    crown.parent = parent;
  }

  function createRock(parent: TransformNode, x: number, z: number, scale: number): void {
    const rock = MeshBuilder.CreateIcoSphere('forest-rock', { radius: 0.8 * scale, subdivisions: 1 }, scene);
    rock.scaling.set(1.5, 0.65, 1.0);
    rock.position.set(x, 0.38 * scale, z);
    rock.rotation.y = scale * 1.7;
    rock.material = rockMaterial;
    rock.isPickable = false;
    rock.parent = parent;
  }

  function createShoulder(parent: TransformNode, cx: number, cz: number): void {
    const north = MeshBuilder.CreateBox('forest-shoulder-n', { width: 47, height: 0.18, depth: 13 }, scene);
    north.position.set(cx, -0.28, cz - 17.5);
    north.material = forestFloorMaterial;
    north.isPickable = false;
    north.parent = parent;

    const south = north.clone('forest-shoulder-s');
    if (south) {
      south.position.z = cz + 17.5;
      south.parent = parent;
    }
  }

  function createBackdrop(parent: TransformNode, cx: number, cz: number, variant: ForestVariant, axis: 'x' | 'z'): void {
    const material = backdropMaterials.get(variant)!;
    for (const side of [-1, 1]) {
      const plane = MeshBuilder.CreatePlane(`forest-backdrop-${variant}`, { width: 48, height: 24 }, scene);
      plane.position.set(cx, 10, cz);
      if (axis === 'x') {
        plane.position.z += side * FOREST_EDGE;
        plane.rotation.y = side > 0 ? Math.PI : 0;
      } else {
        plane.position.x += side * FOREST_EDGE;
        plane.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
      plane.material = material;
      plane.isPickable = false;
      plane.parent = parent;
    }
  }

  const variants = new Map<string, ForestVariant>();
  for (const chunk of map.chunks) {
    const rand = seeded((map.seed ^ ((chunk.cell.x + 31) * 73856093) ^ ((chunk.cell.z + 47) * 19349663)) >>> 0);
    const variant: ForestVariant = rand() < 0.5 ? 'sunlit-grove' : 'misty-pines';
    variants.set(chunk.id, variant);

    const chunkRoot = new TransformNode(`FOREST_${chunk.id}`, scene);
    chunkRoot.parent = root;
    const cx = chunk.cell.x * CELL_SIZE;
    const cz = chunk.cell.z * CELL_SIZE;

    createShoulder(chunkRoot, cx, cz);

    const sockets = new Set(chunk.sockets);
    const horizontal = sockets.has('E') || sockets.has('W');
    const vertical = sockets.has('N') || sockets.has('S');
    const axis: 'x' | 'z' = horizontal && !vertical ? 'x' : vertical && !horizontal ? 'z' : (rand() < 0.5 ? 'x' : 'z');
    createBackdrop(chunkRoot, cx, cz, variant, axis);

    // Trees live outside the 12 m playable corridor, so they add depth without creating collision blockers.
    const positions: Array<[number, number]> = [
      [-TREE_LINE, -TREE_LINE], [0, -TREE_LINE], [TREE_LINE, -TREE_LINE],
      [-TREE_LINE, TREE_LINE], [0, TREE_LINE], [TREE_LINE, TREE_LINE],
      [-TREE_LINE, 0], [TREE_LINE, 0],
    ];
    for (let i = 0; i < positions.length; i += 1) {
      if (rand() < 0.2) continue;
      const [ox, oz] = positions[i];
      const jitterX = (rand() - 0.5) * 4;
      const jitterZ = (rand() - 0.5) * 4;
      createTree(chunkRoot, cx + ox + jitterX, cz + oz + jitterZ, 0.75 + rand() * 0.55, (i + chunk.cell.x + chunk.cell.z) % 2 === 0);
    }

    for (let i = 0; i < 5; i += 1) {
      const side = rand() < 0.5 ? -1 : 1;
      const x = cx + (rand() - 0.5) * 35;
      const z = cz + side * (10 + rand() * 9);
      createRock(chunkRoot, x, z, 0.45 + rand() * 0.8);
    }
  }

  const hud = document.querySelector<HTMLDivElement>('#prototypeHud');
  if (hud) {
    const line = document.createElement('div');
    line.className = 'prototype-muted';
    line.textContent = 'Biome 3j: FOREST · per-zone terrain + Sunlit Grove / Misty Pines background variants';
    hud.appendChild(line);
  }

  (globalThis as typeof globalThis & {
    __astralBiome?: {
      biome: string;
      variants: () => Record<string, ForestVariant>;
    };
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
