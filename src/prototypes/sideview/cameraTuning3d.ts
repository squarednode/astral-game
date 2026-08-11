import { Engine, FreeCamera, Vector3 } from '@babylonjs/core';

type Direction = 'N' | 'E' | 'S' | 'W';
type ChunkType = 'start' | 'exit' | 'end' | 'straight' | 'l' | 't' | 'plus';
type GridPoint = { x: number; z: number };
type Chunk = { id: string; cell: GridPoint; type: ChunkType; sockets: Direction[]; neighbors: string[] };
type GeneratedMap = { chunks: Chunk[]; startId: string; exitId: string; endIds: string[] };
type ProcApi = { snapshot: () => GeneratedMap };
type CameraPose = { position: Vector3; target: Vector3 };

const CELL_SIZE = 50;
const DELTA: Record<Direction, GridPoint> = {
  N: { x: 0, z: -1 }, E: { x: 1, z: 0 }, S: { x: 0, z: 1 }, W: { x: -1, z: 0 },
};

// Endpoint choreography distances, measured from the endpoint chunk center.
const ENDPOINT_CLOSE_RADIUS = 5;
const ENDPOINT_ZOOM_END = 18;
const ENDPOINT_PAN_START = 8;
const ENDPOINT_PAN_END = 25;

const CAMERA_POSITION_RATE = 1.55;
const CAMERA_TARGET_RATE = 1.85;
const CAMERA_HEADING_RATE = 1.15;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smooth = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const directionVector = (direction: Direction): Vector3 => {
  const d = DELTA[direction];
  return new Vector3(d.x, 0, d.z);
};
const blendPose = (a: CameraPose, b: CameraPose, t: number): CameraPose => ({
  position: Vector3.Lerp(a.position, b.position, t),
  target: Vector3.Lerp(a.target, b.target, t),
});

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
  let label = 'endpoint choreography';

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

  const chunkCenter = (chunk: Chunk): Vector3 => new Vector3(chunk.cell.x * CELL_SIZE, 0, chunk.cell.z * CELL_SIZE);

  // Points from an endpoint into the playable map.
  const interiorDirection = (chunk: Chunk): Vector3 => {
    const neighbor = chunk.neighbors.length ? byId.get(chunk.neighbors[0]) : undefined;
    if (!neighbor) return directionVector(chunk.sockets[0] ?? 'E');
    return new Vector3(neighbor.cell.x - chunk.cell.x, 0, neighbor.cell.z - chunk.cell.z).normalize();
  };

  const routeDirectionForChunk = (chunk: Chunk): Vector3 => {
    if (chunk.type === 'start' || chunk.type === 'exit' || chunk.type === 'end') {
      // Start points into the world. Exit/End point toward their destination from the interior.
      const interior = interiorDirection(chunk);
      return chunk.type === 'start' ? interior : interior.scale(-1);
    }
    if (chunk.sockets.length === 2) {
      const a = directionVector(chunk.sockets[0]);
      const b = directionVector(chunk.sockets[1]);
      const sum = a.add(b);
      if (sum.lengthSquared() > 0.01) return sum.normalize();
      return Vector3.Dot(a, cameraForward) >= 0 ? a : a.scale(-1);
    }
    let best = directionVector(chunk.sockets[0] ?? 'E');
    let bestDot = -Infinity;
    for (const direction of chunk.sockets) {
      const candidate = directionVector(direction);
      const dot = Math.abs(Vector3.Dot(candidate, cameraForward));
      if (dot > bestDot) { bestDot = dot; best = candidate; }
    }
    return Vector3.Dot(best, cameraForward) >= 0 ? best : best.scale(-1);
  };

  const sideTravelPose = (ground: Vector3, forward: Vector3, sideDistance = 17, height = 9): CameraPose => {
    const right = new Vector3(-forward.z, 0, forward.x);
    return {
      position: ground.add(right.scale(sideDistance)).add(new Vector3(0, height, 0)).subtract(forward.scale(2.5)),
      target: ground.add(forward.scale(2)),
    };
  };

  const endpointPose = (chunk: Chunk, ground: Vector3): { pose: CameraPose; zoom: number; pan: number; forward: Vector3 } => {
    const center = chunkCenter(chunk);
    const dx = player.position.x - center.x;
    const dz = player.position.z - center.z;
    const distance = Math.hypot(dx, dz);
    const interior = interiorDirection(chunk);

    // Start looks from behind the player out into the world.
    // Exit/End look from behind the player toward the destination.
    const endpointForward = chunk.type === 'start' ? interior : interior.scale(-1);
    const behindDirection = endpointForward.scale(-1);

    const zoom = smooth((distance - ENDPOINT_CLOSE_RADIUS) / (ENDPOINT_ZOOM_END - ENDPOINT_CLOSE_RADIUS));
    const pan = smooth((distance - ENDPOINT_PAN_START) / (ENDPOINT_PAN_END - ENDPOINT_PAN_START));

    // Close endpoint shot. The camera physically pulls back before side panning begins.
    const closeDistance = 6.5;
    const openedDistance = 11.5;
    const behindDistance = closeDistance + (openedDistance - closeDistance) * zoom;
    const closeHeight = 4.8 + 2.1 * zoom;
    const behindPose: CameraPose = {
      position: ground.add(behindDirection.scale(behindDistance)).add(new Vector3(0, closeHeight, 0)),
      target: ground.add(endpointForward.scale(6 - 2.5 * zoom)),
    };

    const sidePose = sideTravelPose(ground, endpointForward, 16, 8.6);
    return { pose: blendPose(behindPose, sidePose, pan), zoom, pan, forward: endpointForward };
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

    let desiredPose: CameraPose;
    if (chunk.type === 'start' || chunk.type === 'exit' || chunk.type === 'end') {
      const endpoint = endpointPose(chunk, new Vector3(player.position.x, 0.8, player.position.z));
      desiredPose = endpoint.pose;
      // Keep the camera's conceptual heading aligned with endpoint geometry without allowing reverse travel to flip it.
      const alignedForward = Vector3.Dot(endpoint.forward, cameraForward) >= 0 ? endpoint.forward : endpoint.forward.scale(-1);
      cameraForward = Vector3.Lerp(cameraForward, alignedForward, 1 - Math.exp(-CAMERA_HEADING_RATE * dt));
      if (cameraForward.lengthSquared() > 0.001) cameraForward.normalize();
      label = `${chunk.type.toUpperCase()} zoom ${Math.round((1 - endpoint.zoom) * 100)}% · pan ${Math.round(endpoint.pan * 100)}%`;
    } else {
      if (Vector3.Dot(chunkForward, cameraForward) < 0) chunkForward.scaleInPlace(-1);
      const headingBlend = 1 - Math.exp(-CAMERA_HEADING_RATE * dt);
      cameraForward = Vector3.Lerp(cameraForward, chunkForward, headingBlend);
      if (cameraForward.lengthSquared() < 0.001) cameraForward.copyFrom(chunkForward);
      cameraForward.normalize();

      const ground = new Vector3(player.position.x, 0.8, player.position.z);
      const movingForward = Vector3.Dot(motion, cameraForward) >= 0;
      const sideDistance = chunk.type === 't' || chunk.type === 'plus' ? 20 : 17;
      const height = chunk.type === 't' || chunk.type === 'plus' ? 11 : 9;
      desiredPose = sideTravelPose(ground, cameraForward, sideDistance, height);
      desiredPose.target = ground.add(cameraForward.scale(movingForward ? 2 : -1));
      label = chunk.type === 't' || chunk.type === 'plus'
        ? `${chunk.type.toUpperCase()} stable side`
        : `${chunk.type.toUpperCase()} ${movingForward ? 'forward' : 'reverse'} pan`;
    }

    const positionBlend = 1 - Math.exp(-CAMERA_POSITION_RATE * dt);
    const targetBlend = 1 - Math.exp(-CAMERA_TARGET_RATE * dt);
    cameraPosition = Vector3.Lerp(cameraPosition, desiredPose.position, positionBlend);
    cameraTarget = Vector3.Lerp(cameraTarget, desiredPose.target, targetBlend);
    camera.position.copyFrom(cameraPosition);
    camera.setTarget(cameraTarget);

    if (hud) {
      hud.insertAdjacentHTML('beforeend', `<div class="prototype-muted">Camera 3d: <strong>${label}</strong> · endpoint zoom → pan</div>`);
    }
  });

  (globalThis as typeof globalThis & { __astralCamera3d?: { snapshot: () => { label: string; chunk: string } } }).__astralCamera3d = {
    snapshot: () => ({ label, chunk: lastChunkId }),
  };
  return true;
}

function waitForRuntime(): void {
  if (install()) return;
  window.setTimeout(waitForRuntime, 25);
}
waitForRuntime();
