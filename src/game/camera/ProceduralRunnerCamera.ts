import { ArcRotateCamera, TransformNode, Vector3 } from '@babylonjs/core';
import { getActiveProceduralRunnerWorld } from '../world/ProceduralRunnerRuntime';
import type { RunnerChunk } from '../world/ProceduralRunnerMap';

let viewForward = new Vector3(1, 0, 0);
let lastChunkId = '';

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const normalizeAngle = (angle: number): number => {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
};

function centerOf(chunk: RunnerChunk, originX: number, originZ: number, cellSize: number): Vector3 {
  return new Vector3(originX + chunk.cell.x * cellSize, 0, originZ + chunk.cell.z * cellSize);
}

function closestAxis(axis: Vector3, reference: Vector3): Vector3 {
  return Vector3.Dot(axis, reference) >= 0 ? axis : axis.scale(-1);
}

function routeForward(
  chunk: RunnerChunk,
  chunks: Map<string, RunnerChunk>,
  reference: Vector3,
): Vector3 {
  if (chunk.type === 'start' || chunk.type === 'exit' || chunk.type === 'end') {
    const neighbor = chunk.neighbors.length ? chunks.get(chunk.neighbors[0]) : undefined;
    if (neighbor) {
      const inward = new Vector3(
        neighbor.cell.x - chunk.cell.x,
        0,
        neighbor.cell.z - chunk.cell.z,
      ).normalize();
      if (chunk.type === 'start') return inward;
      return inward.scale(-1);
    }
  }

  if (chunk.sockets.length === 2) {
    const vectors = chunk.sockets.map(direction => {
      if (direction === 'N') return new Vector3(0, 0, -1);
      if (direction === 'S') return new Vector3(0, 0, 1);
      if (direction === 'E') return new Vector3(1, 0, 0);
      return new Vector3(-1, 0, 0);
    });
    const sum = vectors[0].add(vectors[1]);
    if (sum.lengthSquared() > 0.01) return closestAxis(sum.normalize(), reference);
    return closestAxis(vectors[0], reference);
  }

  let best = reference.clone();
  let bestDot = -Infinity;
  for (const direction of chunk.sockets) {
    const candidate = direction === 'N'
      ? new Vector3(0, 0, -1)
      : direction === 'S'
        ? new Vector3(0, 0, 1)
        : direction === 'E'
          ? new Vector3(1, 0, 0)
          : new Vector3(-1, 0, 0);
    const dot = Math.abs(Vector3.Dot(candidate, reference));
    if (dot > bestDot) {
      bestDot = dot;
      best = closestAxis(candidate, reference);
    }
  }
  return best;
}

export function updateProceduralRunnerCamera(
  camera: ArcRotateCamera,
  actor: TransformNode,
  velocity: Vector3,
  dt: number,
): boolean {
  const runtime = getActiveProceduralRunnerWorld();
  if (!runtime) {
    lastChunkId = '';
    return false;
  }

  const chunks = runtime.map.chunks;
  const byId = new Map(chunks.map(chunk => [chunk.id, chunk]));
  let current = chunks[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const chunk of chunks) {
    const center = centerOf(chunk, runtime.originX, runtime.originZ, runtime.cellSize);
    const dx = actor.position.x - center.x;
    const dz = actor.position.z - center.z;
    const distance = dx * dx + dz * dz;
    if (distance < bestDistance) {
      bestDistance = distance;
      current = chunk;
    }
  }

  if (current.id !== lastChunkId) {
    lastChunkId = current.id;
    viewForward = routeForward(current, byId, viewForward);
  }

  const planarVelocity = new Vector3(velocity.x, 0, velocity.z);
  const moving = planarVelocity.lengthSquared() > 0.0025;
  if (moving) planarVelocity.normalize();

  const desiredForward = routeForward(current, byId, viewForward);
  if (Vector3.Dot(desiredForward, viewForward) < 0) desiredForward.scaleInPlace(-1);
  const headingBlend = 1 - Math.exp(-1.15 * dt);
  viewForward = Vector3.Lerp(viewForward, desiredForward, headingBlend);
  if (viewForward.lengthSquared() < 0.001) viewForward.copyFrom(desiredForward);
  viewForward.normalize();

  const center = centerOf(current, runtime.originX, runtime.originZ, runtime.cellSize);
  const distanceToCenter = Math.hypot(actor.position.x - center.x, actor.position.z - center.z);
  const isEndpoint = current.type === 'start' || current.type === 'exit' || current.type === 'end';

  let desiredAlpha: number;
  let desiredBeta = 1.02;
  let desiredRadius = current.type === 't' || current.type === 'plus' ? 23 : 20;
  let targetAhead = moving && Vector3.Dot(planarVelocity, viewForward) < 0 ? -0.8 : 1.8;
  let endpointTargetBlend = 0;

  if (isEndpoint) {
    const endpointForward = routeForward(current, byId, viewForward);
    const endpointTravel = moving ? Vector3.Dot(planarVelocity, endpointForward) : 0;
    const approachingDestination = current.type !== 'start' && endpointTravel > 0.12;
    const leavingStart = current.type === 'start' && endpointTravel > 0.12;
    const endpointActive = approachingDestination || leavingStart || distanceToCenter < 14;

    if (endpointActive) {
      const godMix = 1 - smooth(distanceToCenter / 7);
      const sideMix = smooth((distanceToCenter - 14) / 12);
      const behindAlpha = Math.atan2(-endpointForward.z, -endpointForward.x);
      const side = new Vector3(-endpointForward.z, 0, endpointForward.x);
      const sideAlpha = Math.atan2(side.z, side.x);
      const delta = normalizeAngle(sideAlpha - behindAlpha);
      desiredAlpha = behindAlpha + delta * sideMix;
      desiredBeta = 0.42 + (0.96 - 0.42) * (1 - godMix);
      desiredRadius = 21 - godMix * 1.5;

      // Keep useful look-ahead during the approach, then collapse the camera
      // target back toward the actor as the endpoint transitions to god view.
      // This prevents the player from being pushed into the lower third of the
      // screen while still showing the destination before the final approach.
      const approachAhead = current.type === 'start' ? 0.5 : 4.2;
      const godAhead = current.type === 'start' ? 0.15 : 0.65;
      targetAhead = approachAhead + (godAhead - approachAhead) * godMix;
      endpointTargetBlend = godMix;
    } else {
      const side = new Vector3(-viewForward.z, 0, viewForward.x);
      desiredAlpha = Math.atan2(side.z, side.x);
      targetAhead = 0.2;
    }
  } else {
    const side = new Vector3(-viewForward.z, 0, viewForward.x);
    desiredAlpha = Math.atan2(side.z, side.x);
  }

  const alphaDelta = normalizeAngle(desiredAlpha - camera.alpha);
  camera.alpha += alphaDelta * (1 - Math.exp(-1.35 * dt));
  camera.beta += (desiredBeta - camera.beta) * (1 - Math.exp(-1.6 * dt));
  camera.radius += (desiredRadius - camera.radius) * (1 - Math.exp(-1.55 * dt));

  const desiredTarget = actor.position.add(viewForward.scale(targetAhead));
  desiredTarget.y = actor.position.y + 0.6;
  const targetSharpness = 2.0 + endpointTargetBlend * 1.8;
  camera.target.copyFrom(
    Vector3.Lerp(camera.target, desiredTarget, 1 - Math.exp(-targetSharpness * dt)),
  );
  return true;
}
