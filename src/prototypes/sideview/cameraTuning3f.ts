import { Engine, FreeCamera, Vector3 } from '@babylonjs/core';

type Direction = 'N' | 'E' | 'S' | 'W';
type ChunkType = 'start' | 'exit' | 'end' | 'straight' | 'l' | 't' | 'plus';
type GridPoint = { x: number; z: number };
type Chunk = { id: string; cell: GridPoint; type: ChunkType; sockets: Direction[]; neighbors: string[] };
type GeneratedMap = { chunks: Chunk[] };
type ProcApi = { snapshot: () => GeneratedMap };
type CameraPose = { position: Vector3; target: Vector3 };

const CELL_SIZE = 50;
const DELTA: Record<Direction, GridPoint> = {
  N: { x: 0, z: -1 }, E: { x: 1, z: 0 }, S: { x: 0, z: 1 }, W: { x: -1, z: 0 },
};
const GOD_END = 7;
const BEHIND_END = 15;
const SIDE_END = 26;
const CAMERA_POSITION_RATE = 1.45;
const CAMERA_TARGET_RATE = 1.75;
const CAMERA_HEADING_RATE = 1.05;

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const smooth = (v: number): number => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const dirVector = (d: Direction): Vector3 => new Vector3(DELTA[d].x, 0, DELTA[d].z);
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

  const chunks = api.snapshot().chunks;
  const byId = new Map(chunks.map(chunk => [chunk.id, chunk]));
  let previousPlayer = player.position.clone();
  let motion = new Vector3(1, 0, 0);
  let cameraForward = new Vector3(1, 0, 0);
  let cameraPosition = camera.position.clone();
  let cameraTarget = camera.getTarget().clone();
  let lastChunkId = '';
  let chunkForward = new Vector3(1, 0, 0);
  let endpointForwardLock: Vector3 | null = null;
  let label = 'endpoint composition';

  const currentChunk = (): Chunk => {
    let best = chunks[0];
    let bestDistance = Infinity;
    for (const chunk of chunks) {
      const dx = player.position.x - chunk.cell.x * CELL_SIZE;
      const dz = player.position.z - chunk.cell.z * CELL_SIZE;
      const d = dx * dx + dz * dz;
      if (d < bestDistance) { best = chunk; bestDistance = d; }
    }
    return best;
  };
  const chunkCenter = (chunk: Chunk): Vector3 => new Vector3(chunk.cell.x * CELL_SIZE, 0, chunk.cell.z * CELL_SIZE);
  const interiorDirection = (chunk: Chunk): Vector3 => {
    const neighbor = chunk.neighbors.length ? byId.get(chunk.neighbors[0]) : undefined;
    if (!neighbor) return dirVector(chunk.sockets[0] ?? 'E');
    return new Vector3(neighbor.cell.x - chunk.cell.x, 0, neighbor.cell.z - chunk.cell.z).normalize();
  };
  const closestEquivalent = (axis: Vector3, reference: Vector3): Vector3 =>
    Vector3.Dot(axis, reference) >= 0 ? axis.clone() : axis.scale(-1);

  const routeDirectionForChunk = (chunk: Chunk): Vector3 => {
    if (chunk.type === 'start' || chunk.type === 'exit' || chunk.type === 'end') {
      return closestEquivalent(interiorDirection(chunk), cameraForward);
    }
    if (chunk.sockets.length === 2) {
      const a = dirVector(chunk.sockets[0]);
      const b = dirVector(chunk.sockets[1]);
      const sum = a.add(b);
      if (sum.lengthSquared() > 0.01) return closestEquivalent(sum.normalize(), cameraForward);
      return closestEquivalent(a, cameraForward);
    }
    let best = dirVector(chunk.sockets[0] ?? 'E');
    let bestDot = -Infinity;
    for (const direction of chunk.sockets) {
      const candidate = dirVector(direction);
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
    if (!endpointForwardLock) endpointForwardLock = closestEquivalent(interior, cameraForward);
    const routeForward = endpointForwardLock;

    // Detect whether the player is moving toward the endpoint center or back into the map.
    const toCenter = center.subtract(player.position); toCenter.y = 0;
    const approachingEndpoint = toCenter.lengthSquared() > 0.01 && Vector3.Dot(motion, toCenter.normalize()) > 0.15;

    // Screen-composition targets:
    // - returning into Start: player near vertical center (minimal look-ahead)
    // - approaching Exit/End: player near lower 2/3 (more destination look-ahead)
    const isStartReturn = chunk.type === 'start' && approachingEndpoint;
    const isDestinationApproach = (chunk.type === 'exit' || chunk.type === 'end') && approachingEndpoint;
    const behindLookAhead = isStartReturn ? 0.3 : isDestinationApproach ? 7.2 : 4.0;
    const godLookAhead = isStartReturn ? 0.0 : isDestinationApproach ? 5.5 : 1.2;

    const behindPose: CameraPose = {
      position: ground.subtract(routeForward.scale(10)).add(new Vector3(0, 7.2, 0)),
      target: ground.add(routeForward.scale(behindLookAhead)),
    };
    const godPose: CameraPose = {
      position: ground.subtract(routeForward.scale(4)).add(new Vector3(0, 18, 0)),
      target: ground.add(routeForward.scale(godLookAhead)),
    };
    const normalSidePose = sidePose(ground, routeForward, 17, 9);
    const godMix = 1 - smooth(distance / GOD_END);
    const sideMix = smooth((distance - BEHIND_END) / (SIDE_END - BEHIND_END));
    let pose = blendPose(behindPose, godPose, godMix);
    pose = blendPose(pose, normalSidePose, sideMix);
    return { pose, godMix, sideMix, forward: routeForward };
  };

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(0.05, Math.max(0.001, engine.getDeltaTime() / 1000));
    const delta = player.position.subtract(previousPlayer); delta.y = 0;
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
      const aligned = closestEquivalent(endpoint.forward, cameraForward);
      cameraForward = Vector3.Lerp(cameraForward, aligned, 1 - Math.exp(-CAMERA_HEADING_RATE * dt));
      if (cameraForward.lengthSquared() > 0.001) cameraForward.normalize();
      label = `${chunk.type.toUpperCase()} god ${Math.round(endpoint.godMix * 100)}% · side ${Math.round(endpoint.sideMix * 100)}%`;
    } else {
      endpointForwardLock = null;
      if (Vector3.Dot(chunkForward, cameraForward) < 0) chunkForward.scaleInPlace(-1);
      cameraForward = Vector3.Lerp(cameraForward, chunkForward, 1 - Math.exp(-CAMERA_HEADING_RATE * dt));
      if (cameraForward.lengthSquared() < 0.001) cameraForward.copyFrom(chunkForward);
      cameraForward.normalize();
      const ground = new Vector3(player.position.x, 0.8, player.position.z);
      const movingForward = Vector3.Dot(motion, cameraForward) >= 0;
      desiredPose = sidePose(ground, cameraForward, chunk.type === 't' || chunk.type === 'plus' ? 20 : 17, chunk.type === 't' || chunk.type === 'plus' ? 11 : 9);
      desiredPose.target = ground.add(cameraForward.scale(movingForward ? 1.8 : -0.8));
      label = chunk.type === 't' || chunk.type === 'plus' ? `${chunk.type.toUpperCase()} stable side` : `${chunk.type.toUpperCase()} ${movingForward ? 'forward' : 'reverse'} pan`;
    }

    cameraPosition = Vector3.Lerp(cameraPosition, desiredPose.position, 1 - Math.exp(-CAMERA_POSITION_RATE * dt));
    cameraTarget = Vector3.Lerp(cameraTarget, desiredPose.target, 1 - Math.exp(-CAMERA_TARGET_RATE * dt));
    camera.position.copyFrom(cameraPosition);
    camera.setTarget(cameraTarget);
    if (hud) hud.insertAdjacentHTML('beforeend', `<div class="prototype-muted">Camera 3f: <strong>${label}</strong> · Start center / End lower-2/3</div>`);
  });

  return true;
}

function waitForRuntime(): void {
  if (install()) return;
  window.setTimeout(waitForRuntime, 25);
}
waitForRuntime();
