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

// Endpoint choreography by distance from endpoint center.
// 0..GOD_END = mostly overhead, GOD_END..BEHIND_END = behind-route,
// BEHIND_END..SIDE_END = blend back to normal side gameplay.
const GOD_END = 7;
const BEHIND_END = 15;
const SIDE_END = 26;

const CAMERA_POSITION_RATE = 1.45;
const CAMERA_TARGET_RATE = 1.75;
const CAMERA_HEADING_RATE = 1.05;

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
  let endpointForwardLock: Vector3 | null = null;
  let label = 'god-view endpoint camera';

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

  const interiorDirection = (chunk: Chunk): Vector3 => {
    const neighbor = chunk.neighbors.length ? byId.get(chunk.neighbors[0]) : undefined;
    if (!neighbor) return directionVector(chunk.sockets[0] ?? 'E');
    return new Vector3(neighbor.cell.x - chunk.cell.x, 0, neighbor.cell.z - chunk.cell.z).normalize();
  };

  const closestEquivalent = (axis: Vector3, reference: Vector3): Vector3 =>
    Vector3.Dot(axis, reference) >= 0 ? axis.clone() : axis.scale(-1);

  const routeDirectionForChunk = (chunk: Chunk): Vector3 => {
    if (chunk.type === 'start' || chunk.type === 'exit' || chunk.type === 'end') {
      return closestEquivalent(interiorDirection(chunk), cameraForward);
    }
    if (chunk.sockets.length === 2) {
      const a = directionVector(chunk.sockets[0]);
      const b = directionVector(chunk.sockets[1]);
      const sum = a.add(b);
      if (sum.lengthSquared() > 0.01) return closestEquivalent(sum.normalize(), cameraForward);
      return closestEquivalent(a, cameraForward);
    }
    let best = directionVector(chunk.sockets[0] ?? 'E');
    let bestDot = -Infinity;
    for (const direction of chunk.sockets) {
      const candidate = directionVector(direction);
      const dot = Math.abs(Vector3.Dot(candidate, cameraForward));
      if (dot > bestDot) { bestDot = dot; best = candidate; }
    }
    return closestEquivalent(best, cameraForward);
  };

  const sidePose = (ground: Vector3, forward: Vector3, sideDistance = 17, height = 9): CameraPose => {
    const right = new Vector3(-forward.z, 0, forward.x);
    return {
      position: ground.add(right.scale(sideDistance)).add(new Vector3(0, height, 0)).subtract(forward.scale(2.5)),
      target: ground.add(forward.scale(1.8)),
    };
  };

  const endpointPose = (chunk: Chunk): { pose: CameraPose; godMix: number; sideMix: number; forward: Vector3 } => {
    const center = chunkCenter(chunk);
    const ground = new Vector3(player.position.x, 0.8, player.position.z);
    const distance = Math.hypot(player.position.x - center.x, player.position.z - center.z);
    const interior = interiorDirection(chunk);

    // Lock the route axis on entry and pick the sign nearest the incoming camera.
    // This prevents a flipped prior section from forcing a sudden 90/180 degree correction.
    if (!endpointForwardLock) endpointForwardLock = closestEquivalent(interior, cameraForward);
    const routeForward = endpointForwardLock;

    // Behind-route camera: centered behind the player on the route axis.
    const behindPose: CameraPose = {
      position: ground.subtract(routeForward.scale(10)).add(new Vector3(0, 7.2, 0)),
      target: ground.add(routeForward.scale(5)),
    };

    // God view: high and slightly behind the established route axis so movement remains readable.
    // It is intentionally not perfectly vertical, preserving a little sense of direction.
    const godPose: CameraPose = {
      position: ground.subtract(routeForward.scale(4)).add(new Vector3(0, 18, 0)),
      target: ground.add(routeForward.scale(1.2)),
    };

    // Side pose uses the same locked route axis; therefore the side->behind transition is a pan,
    // not a camera-axis flip.
    const normalSidePose = sidePose(ground, routeForward, 17, 9);

    const godMix = 1 - smooth(distance / GOD_END);
    const sideMix = smooth((distance - BEHIND_END) / (SIDE_END - BEHIND_END));

    // Mid-range is behind-route. Close range blends upward to god view.
    // Far range blends from behind-route to side gameplay.
    let pose = blendPose(behindPose, godPose, godMix);
    pose = blendPose(pose, normalSidePose, sideMix);
    return { pose, godMix, sideMix, forward: routeForward };
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
      endpointForwardLock = null;
      chunkForward = routeDirectionForChunk(chunk);
    }

    let desiredPose: CameraPose;
    if (chunk.type === 'start' || chunk.type === 'exit' || chunk.type === 'end') {
      const endpoint = endpointPose(chunk);
      desiredPose = endpoint.pose;
      const headingBlend = 1 - Math.exp(-CAMERA_HEADING_RATE * dt);
      const aligned = closestEquivalent(endpoint.forward, cameraForward);
      cameraForward = Vector3.Lerp(cameraForward, aligned, headingBlend);
      if (cameraForward.lengthSquared() > 0.001) cameraForward.normalize();
      label = `${chunk.type.toUpperCase()} god ${Math.round(endpoint.godMix * 100)}% · side ${Math.round(endpoint.sideMix * 100)}%`;
    } else {
      endpointForwardLock = null;
      if (Vector3.Dot(chunkForward, cameraForward) < 0) chunkForward.scaleInPlace(-1);
      const headingBlend = 1 - Math.exp(-CAMERA_HEADING_RATE * dt);
      cameraForward = Vector3.Lerp(cameraForward, chunkForward, headingBlend);
      if (cameraForward.lengthSquared() < 0.001) cameraForward.copyFrom(chunkForward);
      cameraForward.normalize();

      const ground = new Vector3(player.position.x, 0.8, player.position.z);
      const movingForward = Vector3.Dot(motion, cameraForward) >= 0;
      const sideDistance = chunk.type === 't' || chunk.type === 'plus' ? 20 : 17;
      const height = chunk.type === 't' || chunk.type === 'plus' ? 11 : 9;
      desiredPose = sidePose(ground, cameraForward, sideDistance, height);
      desiredPose.target = ground.add(cameraForward.scale(movingForward ? 1.8 : -0.8));
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
      hud.insertAdjacentHTML('beforeend', `<div class="prototype-muted">Camera 3e: <strong>${label}</strong> · side → behind → god view</div>`);
    }
  });

  (globalThis as typeof globalThis & { __astralCamera3e?: { snapshot: () => { label: string; chunk: string } } }).__astralCamera3e = {
    snapshot: () => ({ label, chunk: lastChunkId }),
  };
  return true;
}

function waitForRuntime(): void {
  if (install()) return;
  window.setTimeout(waitForRuntime, 25);
}
waitForRuntime();
