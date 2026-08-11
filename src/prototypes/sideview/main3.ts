import './style.css';
import {
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  FreeCamera,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

const BUILD = '0.6.9-2.5d.3';
const CELL_SIZE = 50;
const CORRIDOR_WIDTH = 12;
const JUNCTION_SIZE = 18;
const PLAYER_RADIUS = 0.55;
const PLAYER_SPEED = 4.9;
const TOTAL_CHUNKS = 10;
const MIN_MAIN_CHUNKS = 6;
const MAX_MAIN_CHUNKS = 8;
const MIN_BRANCH_CHUNKS = 2;
const CAMERA_SIDE = 17;
const CAMERA_HEIGHT = 9;

type Direction = 'N' | 'E' | 'S' | 'W';
type ChunkType = 'start' | 'exit' | 'end' | 'straight' | 'l' | 't' | 'plus';
type ChunkRole = 'main' | 'secret';
type GridPoint = { x: number; z: number };
type FloorRect = { cx: number; cz: number; width: number; depth: number; chunkId: string };
type Chunk = {
  id: string;
  cell: GridPoint;
  role: ChunkRole;
  type: ChunkType;
  sockets: Direction[];
  neighbors: string[];
  mainIndex: number | null;
  branchIndex: number | null;
};
type GeneratedMap = {
  seed: number;
  chunks: Chunk[];
  startId: string;
  exitId: string;
  endIds: string[];
  mainIds: string[];
  branchIds: string[];
};

type Rng = {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
};

const canvas = document.querySelector<HTMLCanvasElement>('#renderCanvas');
const hudQuery = document.querySelector<HTMLDivElement>('#prototypeHud');
if (!canvas || !hudQuery) throw new Error('2.5D prototype shell is missing required DOM elements.');
const hud: HTMLDivElement = hudQuery;

function hashSeed(value: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seedFromUrl(): number {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('seed');
  if (raw) {
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric >>> 0 : hashSeed(raw);
  }
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] >>> 0;
}

function createRng(seed: number): Rng {
  let state = seed >>> 0 || 0x9e3779b9;
  const next = (): number => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    shuffle: <T>(items: readonly T[]): T[] => {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    },
  };
}

const DIRS: readonly Direction[] = ['N', 'E', 'S', 'W'];
const DELTA: Record<Direction, GridPoint> = {
  N: { x: 0, z: -1 },
  E: { x: 1, z: 0 },
  S: { x: 0, z: 1 },
  W: { x: -1, z: 0 },
};
const OPPOSITE: Record<Direction, Direction> = { N: 'S', E: 'W', S: 'N', W: 'E' };

const keyOf = (cell: GridPoint): string => `${cell.x},${cell.z}`;
const addCell = (cell: GridPoint, direction: Direction): GridPoint => ({
  x: cell.x + DELTA[direction].x,
  z: cell.z + DELTA[direction].z,
});

function directionBetween(a: GridPoint, b: GridPoint): Direction {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  if (dx === 1 && dz === 0) return 'E';
  if (dx === -1 && dz === 0) return 'W';
  if (dx === 0 && dz === 1) return 'S';
  if (dx === 0 && dz === -1) return 'N';
  throw new Error(`Cells are not cardinal neighbors: ${keyOf(a)} -> ${keyOf(b)}`);
}

function cardinalNeighbors(cell: GridPoint): GridPoint[] {
  return DIRS.map(direction => addCell(cell, direction));
}

function candidateIsClean(candidate: GridPoint, occupied: Map<string, GridPoint>, allowedTouch: GridPoint): boolean {
  if (occupied.has(keyOf(candidate))) return false;
  for (const neighbor of cardinalNeighbors(candidate)) {
    if (!occupied.has(keyOf(neighbor))) continue;
    if (neighbor.x === allowedTouch.x && neighbor.z === allowedTouch.z) continue;
    return false;
  }
  return true;
}

function growSelfAvoidingPath(
  rng: Rng,
  start: GridPoint,
  count: number,
  occupied: Map<string, GridPoint>,
  preferredDirection?: Direction,
): GridPoint[] | null {
  const path: GridPoint[] = [{ ...start }];
  const localAdded: GridPoint[] = [];

  const recurse = (current: GridPoint, remaining: number): boolean => {
    if (remaining === 0) return true;
    let directions = rng.shuffle(DIRS);
    if (path.length === 1 && preferredDirection) {
      directions = [preferredDirection, ...directions.filter(direction => direction !== preferredDirection)];
    }
    for (const direction of directions) {
      const candidate = addCell(current, direction);
      if (!candidateIsClean(candidate, occupied, current)) continue;
      occupied.set(keyOf(candidate), candidate);
      localAdded.push(candidate);
      path.push(candidate);
      if (recurse(candidate, remaining - 1)) return true;
      path.pop();
      localAdded.pop();
      occupied.delete(keyOf(candidate));
    }
    return false;
  };

  if (recurse(start, count - 1)) return path;
  for (const cell of localAdded) occupied.delete(keyOf(cell));
  return null;
}

function deriveType(sockets: readonly Direction[], role: 'start' | 'exit' | 'end' | null): ChunkType {
  if (role) return role;
  if (sockets.length === 4) return 'plus';
  if (sockets.length === 3) return 't';
  if (sockets.length === 2) {
    const [a, b] = sockets;
    return OPPOSITE[a] === b ? 'straight' : 'l';
  }
  throw new Error(`Unsupported generated socket count ${sockets.length}.`);
}

function generateMap(seed: number): GeneratedMap {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const rng = createRng((seed + attempt * 2654435761) >>> 0);
    const mainCount = rng.int(MIN_MAIN_CHUNKS, MAX_MAIN_CHUNKS);
    const branchCount = TOTAL_CHUNKS - mainCount;
    if (branchCount < MIN_BRANCH_CHUNKS) continue;

    const occupied = new Map<string, GridPoint>();
    const origin = { x: 0, z: 0 };
    occupied.set(keyOf(origin), origin);
    const main = growSelfAvoidingPath(rng, origin, mainCount, occupied, 'E');
    if (!main) continue;

    const branchCandidates = rng.shuffle(
      main.map((cell, index) => ({ cell, index })).filter(({ index }) => index >= 1 && index <= main.length - 2),
    );

    let branch: GridPoint[] | null = null;
    let branchRootIndex = -1;
    for (const candidate of branchCandidates) {
      const usedDirections = new Set<Direction>();
      if (candidate.index > 0) usedDirections.add(directionBetween(candidate.cell, main[candidate.index - 1]));
      if (candidate.index < main.length - 1) usedDirections.add(directionBetween(candidate.cell, main[candidate.index + 1]));
      const freeDirections = rng.shuffle(DIRS.filter(direction => !usedDirections.has(direction)));
      for (const direction of freeDirections) {
        const first = addCell(candidate.cell, direction);
        if (!candidateIsClean(first, occupied, candidate.cell)) continue;
        occupied.set(keyOf(first), first);
        const branchPath = growSelfAvoidingPath(rng, first, branchCount, occupied, direction);
        if (branchPath) {
          branch = branchPath;
          branchRootIndex = candidate.index;
          break;
        }
        occupied.delete(keyOf(first));
      }
      if (branch) break;
    }
    if (!branch || branchRootIndex < 0) continue;

    const cells = [...main, ...branch];
    if (cells.length !== TOTAL_CHUNKS) continue;

    const idByCell = new Map<string, string>();
    main.forEach((cell, index) => idByCell.set(keyOf(cell), `main-${index}`));
    branch.forEach((cell, index) => idByCell.set(keyOf(cell), `secret-${index}`));

    const chunks: Chunk[] = [];
    const buildChunk = (cell: GridPoint, role: ChunkRole, mainIndex: number | null, branchIndex: number | null): Chunk => {
      const id = idByCell.get(keyOf(cell));
      if (!id) throw new Error('Generated cell is missing an id.');
      const sockets: Direction[] = [];
      const neighbors: string[] = [];
      for (const direction of DIRS) {
        const neighborId = idByCell.get(keyOf(addCell(cell, direction)));
        if (!neighborId) continue;
        sockets.push(direction);
        neighbors.push(neighborId);
      }
      let endpointRole: 'start' | 'exit' | 'end' | null = null;
      if (mainIndex === 0) endpointRole = 'start';
      else if (mainIndex === main.length - 1) endpointRole = 'exit';
      else if (branchIndex === branch.length - 1) endpointRole = 'end';
      return {
        id,
        cell: { ...cell },
        role,
        type: deriveType(sockets, endpointRole),
        sockets,
        neighbors,
        mainIndex,
        branchIndex,
      };
    };

    main.forEach((cell, index) => chunks.push(buildChunk(cell, 'main', index, null)));
    branch.forEach((cell, index) => chunks.push(buildChunk(cell, 'secret', null, index)));

    const junction = chunks.find(chunk => chunk.mainIndex === branchRootIndex);
    if (!junction || junction.sockets.length < 3) continue;

    return {
      seed,
      chunks,
      startId: 'main-0',
      exitId: `main-${main.length - 1}`,
      endIds: [`secret-${branch.length - 1}`],
      mainIds: main.map((_, index) => `main-${index}`),
      branchIds: branch.map((_, index) => `secret-${index}`),
    };
  }
  throw new Error(`Unable to generate a valid ${TOTAL_CHUNKS}-chunk map for seed ${seed}.`);
}

const seed = seedFromUrl();
const generated = generateMap(seed);
const chunkById = new Map(generated.chunks.map(chunk => [chunk.id, chunk]));

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.07, 0.1, 1);
new HemisphericLight('ambient', new Vector3(0, 1, 0), scene).intensity = 0.84;
const sun = new DirectionalLight('sun', new Vector3(-0.35, -1, -0.25), scene);
sun.position = new Vector3(30, 35, 25);
sun.intensity = 1;

const makeMaterial = (name: string, color: Color3, emissive = 0): StandardMaterial => {
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = color;
  result.emissiveColor = color.scale(emissive);
  result.specularColor = new Color3(0.07, 0.07, 0.08);
  return result;
};

const mainFloorMaterial = makeMaterial('main-floor', new Color3(0.27, 0.31, 0.37));
const secretFloorMaterial = makeMaterial('secret-floor', new Color3(0.30, 0.22, 0.38));
const junctionMaterial = makeMaterial('junction-floor', new Color3(0.34, 0.37, 0.43));
const railMaterial = makeMaterial('limits', new Color3(0.10, 0.12, 0.16));
const socketMaterial = makeMaterial('socket', new Color3(0.23, 0.72, 1), 0.32);
const secretSocketMaterial = makeMaterial('secret-socket', new Color3(0.77, 0.35, 0.95), 0.32);
const startMaterial = makeMaterial('start', new Color3(0.25, 0.95, 0.55), 0.30);
const exitMaterial = makeMaterial('exit', new Color3(1.0, 0.72, 0.18), 0.30);
const endMaterial = makeMaterial('end', new Color3(0.95, 0.32, 0.40), 0.30);
const playerMaterial = makeMaterial('player', new Color3(0.70, 0.25, 0.95), 0.12);
const aimMaterial = makeMaterial('aim', new Color3(1, 0.86, 0.26), 0.35);

const floorRects: FloorRect[] = [];
const chunkCenter = (chunk: Chunk): Vector3 => new Vector3(chunk.cell.x * CELL_SIZE, 0, chunk.cell.z * CELL_SIZE);

function createFloorRect(chunk: Chunk, name: string, cx: number, cz: number, width: number, depth: number, material: StandardMaterial): void {
  const mesh = MeshBuilder.CreateBox(name, { width, height: 0.35, depth }, scene);
  mesh.position.set(cx, -0.175, cz);
  mesh.material = material;
  mesh.isPickable = true;
  mesh.metadata = { proceduralWalkable: true, chunkId: chunk.id };
  floorRects.push({ cx, cz, width, depth, chunkId: chunk.id });
}

function createLimitBox(name: string, cx: number, cz: number, width: number, depth: number): void {
  const mesh = MeshBuilder.CreateBox(name, { width, height: 0.8, depth }, scene);
  mesh.position.set(cx, 0.4, cz);
  mesh.material = railMaterial;
  mesh.isPickable = false;
}

function buildChunkGeometry(chunk: Chunk): void {
  const center = chunkCenter(chunk);
  const baseMaterial = chunk.role === 'secret' ? secretFloorMaterial : mainFloorMaterial;
  const centerMaterial = chunk.type === 't' || chunk.type === 'plus' ? junctionMaterial : baseMaterial;
  createFloorRect(chunk, `${chunk.id}-center`, center.x, center.z, JUNCTION_SIZE, JUNCTION_SIZE, centerMaterial);

  const armLength = (CELL_SIZE - JUNCTION_SIZE) / 2 + 0.2;
  const armCenterOffset = JUNCTION_SIZE / 2 + armLength / 2;
  for (const direction of chunk.sockets) {
    const d = DELTA[direction];
    const cx = center.x + d.x * armCenterOffset;
    const cz = center.z + d.z * armCenterOffset;
    const horizontal = direction === 'E' || direction === 'W';
    createFloorRect(
      chunk,
      `${chunk.id}-arm-${direction}`,
      cx,
      cz,
      horizontal ? armLength + 0.4 : CORRIDOR_WIDTH,
      horizontal ? CORRIDOR_WIDTH : armLength + 0.4,
      baseMaterial,
    );

    const seam = MeshBuilder.CreateBox(`${chunk.id}-socket-${direction}`, {
      width: horizontal ? 0.35 : CORRIDOR_WIDTH - 1.1,
      height: 0.06,
      depth: horizontal ? CORRIDOR_WIDTH - 1.1 : 0.35,
    }, scene);
    seam.position.set(
      center.x + d.x * (CELL_SIZE / 2 - 0.15),
      0.03,
      center.z + d.z * (CELL_SIZE / 2 - 0.15),
    );
    seam.material = chunk.role === 'secret' ? secretSocketMaterial : socketMaterial;
  }

  // Visual limits around unused chunk edges make the legal walking shape explicit.
  const half = CELL_SIZE / 2;
  const wallThickness = 0.32;
  const gap = CORRIDOR_WIDTH + 0.5;
  const sideSpan = (CELL_SIZE - gap) / 2;
  const directions = new Set(chunk.sockets);
  const edgeSegments = (direction: Direction): void => {
    const open = directions.has(direction);
    const horizontalEdge = direction === 'N' || direction === 'S';
    const sign = direction === 'N' || direction === 'W' ? -1 : 1;
    if (!open) {
      if (horizontalEdge) createLimitBox(`${chunk.id}-wall-${direction}`, center.x, center.z + sign * half, CELL_SIZE, wallThickness);
      else createLimitBox(`${chunk.id}-wall-${direction}`, center.x + sign * half, center.z, wallThickness, CELL_SIZE);
      return;
    }
    const offset = gap / 2 + sideSpan / 2;
    if (horizontalEdge) {
      createLimitBox(`${chunk.id}-wall-${direction}-a`, center.x - offset, center.z + sign * half, sideSpan, wallThickness);
      createLimitBox(`${chunk.id}-wall-${direction}-b`, center.x + offset, center.z + sign * half, sideSpan, wallThickness);
    } else {
      createLimitBox(`${chunk.id}-wall-${direction}-a`, center.x + sign * half, center.z - offset, wallThickness, sideSpan);
      createLimitBox(`${chunk.id}-wall-${direction}-b`, center.x + sign * half, center.z + offset, wallThickness, sideSpan);
    }
  };
  DIRS.forEach(edgeSegments);

  const markerMaterial = chunk.type === 'start' ? startMaterial : chunk.type === 'exit' ? exitMaterial : chunk.type === 'end' ? endMaterial : null;
  if (markerMaterial) {
    const marker = MeshBuilder.CreateCylinder(`${chunk.id}-marker`, { diameter: 3.4, height: 0.12, tessellation: 24 }, scene);
    marker.position.copyFrom(center);
    marker.position.y = 0.08;
    marker.material = markerMaterial;
    marker.isPickable = false;
  }
}

generated.chunks.forEach(buildChunkGeometry);

function rectContains(rect: FloorRect, x: number, z: number, margin = PLAYER_RADIUS): boolean {
  return Math.abs(x - rect.cx) <= rect.width / 2 - margin && Math.abs(z - rect.cz) <= rect.depth / 2 - margin;
}

function isWalkable(x: number, z: number): boolean {
  return floorRects.some(rect => rectContains(rect, x, z));
}

function chunkAtWorld(x: number, z: number): Chunk | null {
  const containing = floorRects.find(rect => rectContains(rect, x, z, 0));
  return containing ? chunkById.get(containing.chunkId) ?? null : null;
}

const startChunk = chunkById.get(generated.startId);
if (!startChunk) throw new Error('Generated map has no start chunk.');
const startCenter = chunkCenter(startChunk);
const startSocket = startChunk.sockets[0];
const startForward = DELTA[startSocket];

const player = MeshBuilder.CreateCapsule('PLAYER', { height: 1.8, radius: PLAYER_RADIUS }, scene);
player.material = playerMaterial;
player.position.set(startCenter.x + startForward.x * 4, 0.9, startCenter.z + startForward.z * 4);

const facing = MeshBuilder.CreateBox('PLAYER_FACING', { width: 0.16, height: 0.16, depth: 1.1 }, scene);
facing.position.set(0, 0.24, 0.68);
facing.material = makeMaterial('facing', new Color3(0.92, 0.92, 1), 0.1);
facing.parent = player;

const aimMarker = MeshBuilder.CreateTorus('AIM_MARKER', { diameter: 1, thickness: 0.08, tessellation: 24 }, scene);
aimMarker.rotation.x = Math.PI / 2;
aimMarker.position.set(player.position.x + startForward.x * 7, 0.05, player.position.z + startForward.z * 7);
aimMarker.material = aimMaterial;
aimMarker.isPickable = false;

const camera = new FreeCamera('camera', new Vector3(player.position.x - 9, 7, player.position.z), scene);
camera.inputs.clear();
camera.minZ = 0.1;

const pressed = new Set<string>();
let aimPoint = aimMarker.position.clone();
let clickTarget: Vector3 | null = null;
let currentChunk: Chunk = startChunk;
let previousChunk: Chunk | null = null;
let cameraLabel = 'start';
let cameraForward = new Vector3(startForward.x, 0, startForward.z).normalize();
let cameraPosition = camera.position.clone();
let cameraTarget = new Vector3(player.position.x, 0.8, player.position.z);

window.addEventListener('keydown', event => {
  pressed.add(event.code);
  if (event.code === 'KeyR') {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const params = new URLSearchParams(window.location.search);
    params.set('seed', String(values[0] >>> 0));
    window.location.search = params.toString();
  }
});
window.addEventListener('keyup', event => pressed.delete(event.code));
window.addEventListener('blur', () => pressed.clear());

function updatePointer(event: PointerEvent): void {
  const pick = scene.pick(event.clientX, event.clientY, mesh => Boolean(mesh.metadata?.proceduralWalkable));
  if (!pick?.hit || !pick.pickedPoint) return;
  aimPoint = pick.pickedPoint.clone();
  aimPoint.y = 0.05;
  aimMarker.position.copyFrom(aimPoint);
  const dx = aimPoint.x - player.position.x;
  const dz = aimPoint.z - player.position.z;
  if (Math.hypot(dx, dz) > 0.01) player.rotation.y = Math.atan2(dx, dz);
}

canvas.addEventListener('pointermove', updatePointer);
canvas.addEventListener('pointerdown', event => {
  updatePointer(event);
  if (event.button === 0) clickTarget = aimPoint.clone();
});
canvas.addEventListener('contextmenu', event => event.preventDefault());

function movePlayer(dx: number, dz: number): void {
  const nx = player.position.x + dx;
  const nz = player.position.z + dz;
  if (isWalkable(nx, nz)) {
    player.position.x = nx;
    player.position.z = nz;
    return;
  }
  if (isWalkable(nx, player.position.z)) player.position.x = nx;
  if (isWalkable(player.position.x, nz)) player.position.z = nz;
}

function updateMovement(dt: number): void {
  const keyboardActive = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
    .some(code => pressed.has(code));
  if (keyboardActive) clickTarget = null;

  const mouseDx = aimPoint.x - player.position.x;
  const mouseDz = aimPoint.z - player.position.z;
  const mouseLength = Math.hypot(mouseDx, mouseDz);
  let forwardX = cameraForward.x;
  let forwardZ = cameraForward.z;
  if (mouseLength > 0.05) {
    forwardX = mouseDx / mouseLength;
    forwardZ = mouseDz / mouseLength;
  }
  const leftX = forwardZ;
  const leftZ = -forwardX;

  let inputX = 0;
  let inputZ = 0;
  if (pressed.has('KeyW') || pressed.has('ArrowUp')) { inputX += forwardX; inputZ += forwardZ; }
  if (pressed.has('KeyS') || pressed.has('ArrowDown')) { inputX -= forwardX; inputZ -= forwardZ; }
  if (pressed.has('KeyA') || pressed.has('ArrowLeft')) { inputX += leftX; inputZ += leftZ; }
  if (pressed.has('KeyD') || pressed.has('ArrowRight')) { inputX -= leftX; inputZ -= leftZ; }

  if (!keyboardActive && clickTarget) {
    const dx = clickTarget.x - player.position.x;
    const dz = clickTarget.z - player.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= 0.2) clickTarget = null;
    else { inputX = dx / distance; inputZ = dz / distance; }
  }

  const length = Math.hypot(inputX, inputZ);
  if (length > 1) { inputX /= length; inputZ /= length; }
  movePlayer(inputX * PLAYER_SPEED * dt, inputZ * PLAYER_SPEED * dt);

  const found = chunkAtWorld(player.position.x, player.position.z);
  if (found && found.id !== currentChunk.id) {
    previousChunk = currentChunk;
    currentChunk = found;
  }
}

function directionVector(direction: Direction): Vector3 {
  const d = DELTA[direction];
  return new Vector3(d.x, 0, d.z);
}

function desiredForwardForChunk(chunk: Chunk): Vector3 {
  if (previousChunk && chunk.neighbors.includes(previousChunk.id)) {
    const entryDirection = directionBetween(previousChunk.cell, chunk.cell);
    const exits = chunk.sockets.filter(direction => direction !== OPPOSITE[entryDirection]);
    if (exits.length === 1) return directionVector(exits[0]);
  }

  const mouseVector = new Vector3(aimPoint.x - player.position.x, 0, aimPoint.z - player.position.z);
  if (mouseVector.lengthSquared() > 0.01 && chunk.sockets.length > 0) {
    mouseVector.normalize();
    let bestDirection = chunk.sockets[0];
    let bestDot = -Infinity;
    for (const direction of chunk.sockets) {
      const dot = Vector3.Dot(mouseVector, directionVector(direction));
      if (dot > bestDot) { bestDot = dot; bestDirection = direction; }
    }
    return directionVector(bestDirection);
  }

  return directionVector(chunk.sockets[0] ?? 'E');
}

function updateCamera(dt: number): void {
  const desiredForward = desiredForwardForChunk(currentChunk);
  const forwardBlend = 1 - Math.exp(-2.2 * dt);
  cameraForward = Vector3.Lerp(cameraForward, desiredForward, forwardBlend);
  if (cameraForward.lengthSquared() < 0.01) cameraForward.copyFrom(desiredForward);
  cameraForward.normalize();
  const right = new Vector3(-cameraForward.z, 0, cameraForward.x);
  const ground = new Vector3(player.position.x, 0.8, player.position.z);

  let sideDistance = CAMERA_SIDE;
  let height = CAMERA_HEIGHT;
  let lookAhead = 6;
  if (currentChunk.type === 't' || currentChunk.type === 'plus') {
    sideDistance = 20;
    height = 11;
    lookAhead = 2;
    cameraLabel = `${currentChunk.type.toUpperCase()} junction wide`;
  } else if (currentChunk.type === 'start') {
    sideDistance = 3;
    height = 5.2;
    lookAhead = 9;
    cameraLabel = 'Start third-person';
  } else if (currentChunk.type === 'exit') {
    sideDistance = 3;
    height = 5.2;
    lookAhead = 9;
    cameraLabel = 'Exit transition';
  } else if (currentChunk.type === 'end') {
    sideDistance = 10;
    height = 7;
    lookAhead = 2;
    cameraLabel = 'Dead-end / secret';
  } else {
    cameraLabel = `${currentChunk.type.toUpperCase()} travel`;
  }

  const desiredPosition = ground
    .add(right.scale(sideDistance))
    .add(new Vector3(0, height, 0))
    .subtract(cameraForward.scale(currentChunk.type === 'start' || currentChunk.type === 'exit' ? 8 : 3));
  const desiredTarget = ground.add(cameraForward.scale(lookAhead));
  const positionBlend = 1 - Math.exp(-2.7 * dt);
  const targetBlend = 1 - Math.exp(-3.4 * dt);
  cameraPosition = Vector3.Lerp(cameraPosition, desiredPosition, positionBlend);
  cameraTarget = Vector3.Lerp(cameraTarget, desiredTarget, targetBlend);
  camera.position.copyFrom(cameraPosition);
  camera.setTarget(cameraTarget);
}

function topologyText(): string {
  const sorted = [...generated.chunks].sort((a, b) => {
    if (a.mainIndex !== null && b.mainIndex !== null) return a.mainIndex - b.mainIndex;
    if (a.mainIndex !== null) return -1;
    if (b.mainIndex !== null) return 1;
    return (a.branchIndex ?? 0) - (b.branchIndex ?? 0);
  });
  return sorted.map(chunk => `${chunk.id}:${chunk.type.toUpperCase()}[${chunk.sockets.join('')}]`).join(' · ');
}

function updateHud(): void {
  const secret = currentChunk.role === 'secret' ? ' · SECRET BRANCH' : '';
  hud.innerHTML = `
    <div class="prototype-title">Astral Shift ${BUILD} — Procedural Chunk Grammar</div>
    <div>Seed: <strong>${generated.seed}</strong> · ${TOTAL_CHUNKS} chunks · main path ${generated.mainIds.length} · 1 dead end</div>
    <div>Current: <strong>${currentChunk.id}</strong> · ${currentChunk.type.toUpperCase()} · sockets ${currentChunk.sockets.join(', ')}${secret}</div>
    <div>Camera: <strong>${cameraLabel}</strong> · speed ${PLAYER_SPEED.toFixed(1)} m/s</div>
    <div class="prototype-muted">W/S = toward/away from mouse · A/D = mouse-relative strafe · LMB = click-to-move · R = new generated seed</div>
    <div class="prototype-muted">Green = Start · amber = Exit · red = End/dead-end · purple floor = secret branch · blue/purple seams = sockets</div>
    <div class="prototype-muted">${topologyText()}</div>
  `;
}

scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
  updateMovement(dt);
  updateCamera(dt);
  updateHud();
});

engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());

(globalThis as typeof globalThis & {
  __astralProcMap?: {
    seed: number;
    snapshot: () => GeneratedMap;
    regenerate: (nextSeed?: number) => void;
  };
}).__astralProcMap = {
  seed,
  snapshot: () => generated,
  regenerate: (nextSeed?: number) => {
    const params = new URLSearchParams(window.location.search);
    const value = nextSeed ?? (() => {
      const values = new Uint32Array(1);
      crypto.getRandomValues(values);
      return values[0] >>> 0;
    })();
    params.set('seed', String(value >>> 0));
    window.location.search = params.toString();
  },
};
