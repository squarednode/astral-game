import './style.css';
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';

const ZONE_LENGTH = 20;
const ZONE_COUNT = 6;
const TOTAL_LENGTH = ZONE_LENGTH * ZONE_COUNT;
const PLAYABLE_DEPTH = 10;
const HALF_DEPTH = PLAYABLE_DEPTH / 2;
const PLAYER_RADIUS = 0.55;
const PLAYER_SPEED = 6.5;
const CAMERA_LOOK_AHEAD = 5;

type ChunkSocket = {
  id: string;
  side: 'entry' | 'exit';
  localX: number;
  localZ: number;
};

type ChunkDefinition = {
  id: string;
  length: number;
  depth: number;
  floorY: number;
  entry: ChunkSocket;
  exit: ChunkSocket;
};

type BuiltChunk = {
  definition: ChunkDefinition;
  root: TransformNode;
  startX: number;
  endX: number;
};

const chunkTemplate: ChunkDefinition = {
  id: 'prototype-straight',
  length: ZONE_LENGTH,
  depth: PLAYABLE_DEPTH,
  floorY: 0,
  entry: { id: 'SOCKET_ENTRY', side: 'entry', localX: 0, localZ: 0 },
  exit: { id: 'SOCKET_EXIT', side: 'exit', localX: ZONE_LENGTH, localZ: 0 },
};

const canvas = document.querySelector<HTMLCanvasElement>('#renderCanvas');
const hud = document.querySelector<HTMLDivElement>('#prototypeHud');
if (!canvas || !hud) throw new Error('2.5D prototype shell is missing required DOM elements.');

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.07, 0.1, 1);

new HemisphericLight('ambient', new Vector3(0, 1, 0), scene).intensity = 0.8;
const sun = new DirectionalLight('sun', new Vector3(-0.35, -1, -0.25), scene);
sun.position = new Vector3(20, 30, 15);
sun.intensity = 1.0;

const material = (name: string, color: Color3, emissive = 0): StandardMaterial => {
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = color;
  result.emissiveColor = color.scale(emissive);
  result.specularColor = new Color3(0.08, 0.08, 0.08);
  return result;
};

const floorMaterials = [
  material('zone-1', new Color3(0.24, 0.28, 0.34)),
  material('zone-2', new Color3(0.29, 0.33, 0.39)),
  material('zone-3', new Color3(0.25, 0.30, 0.36)),
  material('zone-4', new Color3(0.30, 0.35, 0.40)),
  material('zone-5', new Color3(0.26, 0.31, 0.37)),
  material('zone-6', new Color3(0.31, 0.36, 0.42)),
];
const boundaryMaterial = material('boundary', new Color3(0.12, 0.14, 0.18));
const socketMaterial = material('socket', new Color3(0.25, 0.75, 1.0), 0.35);
const centerLineMaterial = material('center-line', new Color3(0.75, 0.78, 0.86), 0.1);

function makeMarker(name: string, position: Vector3, height: number, mat: StandardMaterial): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width: 0.12, height, depth: 0.12 }, scene);
  mesh.position.copyFrom(position);
  mesh.material = mat;
  return mesh;
}

function buildChunk(index: number, definition: ChunkDefinition): BuiltChunk {
  const startX = index * definition.length;
  const endX = startX + definition.length;
  const root = new TransformNode(`chunk-${index + 1}`, scene);

  const floor = MeshBuilder.CreateBox(
    `ZONE_${index + 1}_FLOOR`,
    { width: definition.length, height: 0.35, depth: definition.depth },
    scene,
  );
  floor.position.set(startX + definition.length / 2, definition.floorY - 0.175, 0);
  floor.material = floorMaterials[index % floorMaterials.length];
  floor.parent = root;

  const frontLimit = MeshBuilder.CreateBox(
    `ZONE_${index + 1}_FRONT_LIMIT`,
    { width: definition.length, height: 1.1, depth: 0.35 },
    scene,
  );
  frontLimit.position.set(startX + definition.length / 2, 0.55, HALF_DEPTH + 0.175);
  frontLimit.material = boundaryMaterial;
  frontLimit.parent = root;

  const backLimit = frontLimit.clone(`ZONE_${index + 1}_BACK_LIMIT`);
  backLimit.position.z = -HALF_DEPTH - 0.175;
  backLimit.parent = root;

  const centerLine = MeshBuilder.CreateBox(
    `ZONE_${index + 1}_CENTER`,
    { width: definition.length - 0.6, height: 0.02, depth: 0.08 },
    scene,
  );
  centerLine.position.set(startX + definition.length / 2, 0.02, 0);
  centerLine.material = centerLineMaterial;
  centerLine.parent = root;

  const entryX = startX + definition.entry.localX;
  const exitX = startX + definition.exit.localX;
  const entryLeft = makeMarker(
    `ZONE_${index + 1}_${definition.entry.id}_A`,
    new Vector3(entryX, 1.1, -2.4),
    2.2,
    socketMaterial,
  );
  const entryRight = makeMarker(
    `ZONE_${index + 1}_${definition.entry.id}_B`,
    new Vector3(entryX, 1.1, 2.4),
    2.2,
    socketMaterial,
  );
  const exitLeft = makeMarker(
    `ZONE_${index + 1}_${definition.exit.id}_A`,
    new Vector3(exitX, 1.1, -2.4),
    2.2,
    socketMaterial,
  );
  const exitRight = makeMarker(
    `ZONE_${index + 1}_${definition.exit.id}_B`,
    new Vector3(exitX, 1.1, 2.4),
    2.2,
    socketMaterial,
  );
  entryLeft.parent = root;
  entryRight.parent = root;
  exitLeft.parent = root;
  exitRight.parent = root;

  if (index > 0) {
    const seam = MeshBuilder.CreateBox(
      `CONNECTOR_${index}_${index + 1}`,
      { width: 0.9, height: 0.08, depth: definition.depth - 0.6 },
      scene,
    );
    seam.position.set(startX, 0.04, 0);
    seam.material = socketMaterial;
    seam.parent = root;
  }

  return { definition, root, startX, endX };
}

const chunks: BuiltChunk[] = [];
for (let index = 0; index < ZONE_COUNT; index += 1) {
  chunks.push(buildChunk(index, { ...chunkTemplate, id: `prototype-zone-${index + 1}` }));
}

const startCap = MeshBuilder.CreateBox('START_CAP', { width: 0.4, height: 1.5, depth: PLAYABLE_DEPTH + 0.7 }, scene);
startCap.position.set(-0.2, 0.75, 0);
startCap.material = boundaryMaterial;

const endCap = startCap.clone('END_CAP');
endCap.position.x = TOTAL_LENGTH + 0.2;

const playerMaterial = material('player', new Color3(0.7, 0.25, 0.95), 0.12);
const player = MeshBuilder.CreateCapsule('PLAYER', { height: 1.8, radius: PLAYER_RADIUS }, scene);
player.position.set(2, 0.9, 0);
player.material = playerMaterial;

const camera = new ArcRotateCamera(
  'camera',
  -Math.PI / 2.35,
  1.05,
  22,
  new Vector3(player.position.x + CAMERA_LOOK_AHEAD, 0.7, 0),
  scene,
);
camera.lowerRadiusLimit = 22;
camera.upperRadiusLimit = 22;
camera.inputs.clear();

const pressed = new Set<string>();
window.addEventListener('keydown', event => pressed.add(event.code));
window.addEventListener('keyup', event => pressed.delete(event.code));
window.addEventListener('blur', () => pressed.clear());

function currentZoneIndex(x: number): number {
  return Math.min(ZONE_COUNT - 1, Math.max(0, Math.floor(x / ZONE_LENGTH)));
}

function updatePlayer(dt: number): void {
  let dx = 0;
  let dz = 0;
  if (pressed.has('KeyA') || pressed.has('ArrowLeft')) dx -= 1;
  if (pressed.has('KeyD') || pressed.has('ArrowRight')) dx += 1;
  if (pressed.has('KeyW') || pressed.has('ArrowUp')) dz -= 1;
  if (pressed.has('KeyS') || pressed.has('ArrowDown')) dz += 1;

  if (dx !== 0 || dz !== 0) {
    const length = Math.hypot(dx, dz);
    dx /= length;
    dz /= length;
  }

  player.position.x += dx * PLAYER_SPEED * dt;
  player.position.z += dz * PLAYER_SPEED * dt;

  player.position.x = Math.min(TOTAL_LENGTH - PLAYER_RADIUS, Math.max(PLAYER_RADIUS, player.position.x));
  player.position.z = Math.min(HALF_DEPTH - PLAYER_RADIUS, Math.max(-HALF_DEPTH + PLAYER_RADIUS, player.position.z));
  player.position.y = 0.9;

  const target = new Vector3(
    Math.min(TOTAL_LENGTH, player.position.x + CAMERA_LOOK_AHEAD),
    0.7,
    player.position.z * 0.22,
  );
  camera.target = Vector3.Lerp(camera.target, target, Math.min(1, dt * 6));
}

function updateHud(): void {
  const zoneIndex = currentZoneIndex(player.position.x);
  const zone = chunks[zoneIndex];
  const localX = player.position.x - zone.startX;
  hud.innerHTML = `
    <div class="prototype-title">Astral Shift 0.6.9-2.5d.1</div>
    <div>120 m prototype corridor · 6 × 20 m chunks</div>
    <div>Current zone: <strong>${zoneIndex + 1}</strong> / ${ZONE_COUNT}</div>
    <div>Zone local X: ${localX.toFixed(1)} m · Depth Z: ${player.position.z.toFixed(1)} m</div>
    <div>Playable depth: ${PLAYABLE_DEPTH.toFixed(0)} m (${(-HALF_DEPTH).toFixed(0)} to ${HALF_DEPTH.toFixed(0)})</div>
    <div class="prototype-muted">WASD / arrows · blue seams = chunk sockets · dark rails = hard depth limits</div>
  `;
}

scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
  updatePlayer(dt);
  updateHud();
});

engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());

(globalThis as typeof globalThis & {
  __astral25d?: {
    totalLength: number;
    zoneLength: number;
    playableDepth: number;
    player: () => { x: number; z: number; zone: number };
    sockets: () => Array<{ zone: number; entryX: number; exitX: number }>;
  };
}).__astral25d = {
  totalLength: TOTAL_LENGTH,
  zoneLength: ZONE_LENGTH,
  playableDepth: PLAYABLE_DEPTH,
  player: () => ({
    x: player.position.x,
    z: player.position.z,
    zone: currentZoneIndex(player.position.x) + 1,
  }),
  sockets: () => chunks.map((chunk, index) => ({
    zone: index + 1,
    entryX: chunk.startX,
    exitX: chunk.endX,
  })),
};
