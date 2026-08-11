import { Engine, FreeCamera, Vector3 } from '@babylonjs/core';

type Direction = 'N' | 'E' | 'S' | 'W';
type ChunkType = 'start' | 'exit' | 'end' | 'straight' | 'l' | 't' | 'plus';
type GridPoint = { x: number; z: number };
type Chunk = { id: string; cell: GridPoint; type: ChunkType; sockets: Direction[]; neighbors: string[] };
type GeneratedMap = { chunks: Chunk[]; startId: string; exitId: string; endIds: string[] };
type ProcApi = { snapshot: () => GeneratedMap };

const CELL_SIZE = 50;
const DELTA: Record<Direction, GridPoint> = {
  N: { x: 0, z: -1 }, E: { x: 1, z: 0 }, S: { x: 0, z: 1 }, W: { x: -1, z: 0 },
};
const CAMERA_POSITION_RATE = 1.65;
const CAMERA_TARGET_RATE = 1.95;
const CAMERA_HEADING_RATE = 1.25;

const directionVector = (direction: Direction): Vector3 => {
  const d = DELTA[direction];
  return new Vector3(d.x, 0, d.z);
};

function install(): boolean {
  const api = (globalThis as typeof globalThis & { __astralProcMap?: ProcApi }).__astralProcMap;
  const engine = Engine.Instances[0];
  const scene = engine?.scenes[0];
  const camera = scene?.getCameraByName('camera');
  const player = scene?.getMeshByName('PLAYER');
  const hud = document.querySelector<HTMLDivElement>('#prototypeHud');
  if (!api || !engine || !scene || !(camera instanceof FreeCamera) || !player) return false;

  const generated = api.snapshot();
  const chunks = generated.chunks;
  const byId = new Map(chunks.map(chunk => [chunk.id, chunk]));
  let previousPlayer = player.position.clone();
  let motion = new Vector3(1, 0, 0);
  let cameraForward = new Vector3(1, 0, 0);
  let cameraPosition = camera.position.clone();
  let cameraTarget = camera.getTarget().clone();
  let lastChunkId = '';
  let chunkForward = new Vector3(1, 0, 0);
  let label = 'persistent-side camera';

  const currentChunk = (): Chunk => {
    let best = chunks[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const chunk of chunks) {
      const cx = chunk.cell.x * CELL_SIZE;
      const cz = chunk.cell.z * CELL_SIZE;
      const dx = player.position.x - cx;
      const dz = player.position.z - cz;
      const distance = dx * dx + dz * dz;
      if (distance < bestDistance) { bestDistance = distance; best = chunk; }
    }
    return best;
  };

  const interiorDirection = (chunk: Chunk): Vector3 => {
    const neighbor = chunk.neighbors.length ? byId.get(chunk.neighbors[0]) : undefined;
    if (!neighbor) return directionVector(chunk.sockets[0] ?? 'E');
    return new Vector3(neighbor.cell.x - chunk.cell.x, 0, neighbor.cell.z - chunk.cell.z).normalize();
  };

  const routeDirectionForChunk = (chunk: Chunk): Vector3 => {
    if (chunk.type === 'start' || chunk.type === 'exit' || chunk.type === 'end') return interiorDirection(chunk);
    if (chunk.sockets.length === 2) {
      const a = directionVector(chunk.sockets[0]);
      const b = directionVector(chunk.sockets[1]);
      const sum = a.add(b);
      if (sum.lengthSquared() > 0.01) return sum.normalize();
      // Straight chunks have opposite sockets; preserve the current camera axis instead of flipping with movement.
      const candidate = a;
      return Vector3.Dot(candidate, cameraForward) >= 0 ? candidate : candidate.scale(-1);
    }
    // Junctions keep the current view axis unless the geometry forces a turn later.
    let best = directionVector(chunk.sockets[0] ?? 'E');
    let bestDot = -Infinity;
    for (const direction of chunk.sockets) {
      const candidate = directionVector(direction);
      const dot = Math.abs(Vector3.Dot(candidate, cameraForward));
      if (dot > bestDot) { bestDot = dot; best = candidate; }
    }
    return Vector3.Dot(best, cameraForward) >= 0 ? best : best.scale(-1);
  };

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(0.05, Math.max(0.001, engine.getDeltaTime() / 1000));
    const delta = player.position.subtract(previousPlayer);
    delta.y = 0;
    if (delta.lengthSquared() > 0.00002) {
      delta.normalize();
      motion = Vector3.Lerp(motion, delta, 1 - Math.exp(-6 * dt));
      if (motion.lengthSquared() > 0.001) motion.normalize();
    }
    previousPlayer.copyFrom(player.position);

    const chunk = currentChunk();
    if (chunk.id !== lastChunkId) {
      lastChunkId = chunk.id;
      chunkForward = routeDirectionForChunk(chunk);
    }

    // Never reverse the camera heading just because the player moves backward.
    if (Vector3.Dot(chunkForward, cameraForward) < 0) chunkForward.scaleInPlace(-1);
    const headingBlend = 1 - Math.exp(-CAMERA_HEADING_RATE * dt);
    cameraForward = Vector3.Lerp(cameraForward, chunkForward, headingBlend);
    if (cameraForward.lengthSquared() < 0.001) cameraForward.copyFrom(chunkForward);
    cameraForward.normalize();

    const right = new Vector3(-cameraForward.z, 0, cameraForward.x);
    const ground = new Vector3(player.position.x, 0.8, player.position.z);
    const movingForwardRelativeToCamera = Vector3.Dot(motion, cameraForward) >= 0;

    let sideDistance = 17;
    let height = 9;
    let backOffset = 2.5;
    let lookAhead = movingForwardRelativeToCamera ? 2.2 : -1.2;

    if (chunk.type === 't' || chunk.type === 'plus') {
      sideDistance = 20;
      height = 11;
      backOffset = 2;
      lookAhead = movingForwardRelativeToCamera ? 1.2 : -0.8;
      label = `${chunk.type.toUpperCase()} stable pan`;
    } else if (chunk.type === 'start' || chunk.type === 'exit' || chunk.type === 'end') {
      const interior = interiorDirection(chunk);
      const movingIntoMap = Vector3.Dot(motion, interior) > 0.15;
      if (movingIntoMap) {
        sideDistance = 15;
        height = 8.2;
        backOffset = 2;
        lookAhead = 0.8;
        label = `${chunk.type.toUpperCase()} return pan`;
      } else {
        sideDistance = 10;
        height = 6.8;
        backOffset = 4;
        lookAhead = 2.5;
        label = `${chunk.type.toUpperCase()} approach pan`;
      }
    } else {
      label = movingForwardRelativeToCamera ? `${chunk.type.toUpperCase()} forward pan` : `${chunk.type.toUpperCase()} reverse pan`;
    }

    const desiredPosition = ground
      .add(right.scale(sideDistance))
      .add(new Vector3(0, height, 0))
      .subtract(cameraForward.scale(backOffset));
    const desiredTarget = ground.add(cameraForward.scale(lookAhead));

    const positionBlend = 1 - Math.exp(-CAMERA_POSITION_RATE * dt);
    const targetBlend = 1 - Math.exp(-CAMERA_TARGET_RATE * dt);
    cameraPosition = Vector3.Lerp(cameraPosition, desiredPosition, positionBlend);
    cameraTarget = Vector3.Lerp(cameraTarget, desiredTarget, targetBlend);
    camera.position.copyFrom(cameraPosition);
    camera.setTarget(cameraTarget);

    if (hud) {
      hud.insertAdjacentHTML('beforeend', `<div class="prototype-muted">Camera 3c: <strong>${label}</strong> · persistent side / no reverse flip</div>`);
    }
  });

  (globalThis as typeof globalThis & { __astralCamera3c?: { snapshot: () => { label: string; chunk: string } } }).__astralCamera3c = {
    snapshot: () => ({ label, chunk: lastChunkId }),
  };
  return true;
}

function waitForRuntime(): void {
  if (install()) return;
  window.setTimeout(waitForRuntime, 25);
}
waitForRuntime();
