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
const CAMERA_POSITION_RATE = 1.75;
const CAMERA_TARGET_RATE = 2.15;
const CAMERA_HEADING_RATE = 1.55;
const CENTERED_LOOK_AHEAD = 2.2;

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
  let motionForward = new Vector3(1, 0, 0);
  let cameraForward = new Vector3(1, 0, 0);
  let cameraPosition = camera.position.clone();
  let cameraTarget = camera.getTarget().clone();
  let lastChunkId = '';
  let lockedJunctionForward: Vector3 | null = null;
  let label = 'camera stabilizer';

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

  const endpointInteriorForward = (chunk: Chunk): Vector3 => {
    const neighbor = chunk.neighbors.length ? byId.get(chunk.neighbors[0]) : undefined;
    if (!neighbor) return directionVector(chunk.sockets[0] ?? 'E');
    const dx = neighbor.cell.x - chunk.cell.x;
    const dz = neighbor.cell.z - chunk.cell.z;
    return new Vector3(dx, 0, dz).normalize();
  };

  const chooseJunctionForward = (chunk: Chunk): Vector3 => {
    const candidates = chunk.sockets.map(directionVector);
    let reference = motionForward;
    if (reference.lengthSquared() < 0.05) reference = cameraForward;
    let best = candidates[0] ?? cameraForward;
    let bestDot = -Infinity;
    for (const candidate of candidates) {
      const dot = Vector3.Dot(reference, candidate);
      if (dot > bestDot) { bestDot = dot; best = candidate; }
    }
    return best.clone();
  };

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(0.05, Math.max(0.001, engine.getDeltaTime() / 1000));
    const movement = player.position.subtract(previousPlayer);
    movement.y = 0;
    if (movement.lengthSquared() > 0.00002) {
      movement.normalize();
      motionForward = Vector3.Lerp(motionForward, movement, 1 - Math.exp(-6 * dt));
      if (motionForward.lengthSquared() > 0.001) motionForward.normalize();
    }
    previousPlayer.copyFrom(player.position);

    const chunk = currentChunk();
    const enteredNewChunk = chunk.id !== lastChunkId;
    if (enteredNewChunk) {
      lastChunkId = chunk.id;
      lockedJunctionForward = chunk.type === 't' || chunk.type === 'plus' ? chooseJunctionForward(chunk) : null;
    }

    let desiredForward: Vector3;
    if ((chunk.type === 't' || chunk.type === 'plus') && lockedJunctionForward) {
      // Hold one heading for the entire junction. Mouse movement can no longer make the camera twitch between sockets.
      desiredForward = lockedJunctionForward;
      label = `${chunk.type.toUpperCase()} heading locked`;
    } else if (chunk.type === 'start' || chunk.type === 'exit' || chunk.type === 'end') {
      const interior = endpointInteriorForward(chunk);
      const movingIntoMap = Vector3.Dot(motionForward, interior) > 0.15;
      desiredForward = movingIntoMap ? interior : motionForward;
      if (desiredForward.lengthSquared() < 0.01) desiredForward = interior;
      label = movingIntoMap ? `${chunk.type.toUpperCase()} return centered` : `${chunk.type.toUpperCase()} approach`;
    } else {
      desiredForward = motionForward.lengthSquared() > 0.01 ? motionForward : cameraForward;
      label = `${chunk.type.toUpperCase()} centered travel`;
    }

    const headingBlend = 1 - Math.exp(-CAMERA_HEADING_RATE * dt);
    cameraForward = Vector3.Lerp(cameraForward, desiredForward, headingBlend);
    if (cameraForward.lengthSquared() < 0.001) cameraForward.copyFrom(desiredForward);
    cameraForward.normalize();

    const right = new Vector3(-cameraForward.z, 0, cameraForward.x);
    const ground = new Vector3(player.position.x, 0.8, player.position.z);
    let sideDistance = 17;
    let height = 9;
    let backOffset = 2.5;
    let lookAhead = CENTERED_LOOK_AHEAD;

    if (chunk.type === 't' || chunk.type === 'plus') {
      sideDistance = 20;
      height = 11;
      backOffset = 2;
      lookAhead = 1.2;
    } else if (chunk.type === 'start' || chunk.type === 'exit' || chunk.type === 'end') {
      const interior = endpointInteriorForward(chunk);
      const movingIntoMap = Vector3.Dot(motionForward, interior) > 0.15;
      if (movingIntoMap) {
        // Backtracking from endpoints uses normal centered gameplay framing instead of close third-person framing.
        sideDistance = 15;
        height = 8.2;
        backOffset = 2;
        lookAhead = 1.5;
      } else {
        sideDistance = 7.5;
        height = 6.2;
        backOffset = 5.5;
        lookAhead = 4;
      }
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
      hud.insertAdjacentHTML('beforeend', `<div class="prototype-muted">Camera 3b: <strong>${label}</strong> · centered + slow damping</div>`);
    }
  });

  (globalThis as typeof globalThis & { __astralCamera3b?: { snapshot: () => { label: string; chunk: string } } }).__astralCamera3b = {
    snapshot: () => ({ label, chunk: lastChunkId }),
  };
  return true;
}

function waitForRuntime(): void {
  if (install()) return;
  window.setTimeout(waitForRuntime, 25);
}
waitForRuntime();
