import { Engine, FreeCamera, Scene, Vector3 } from '@babylonjs/core';

type CameraMode = 'start' | 'travel' | 'battle' | 'turn' | 'reverse' | 'end' | 'secret';
type RouteKind = 'main' | 'secret';

type PrototypePlayerState = {
  x: number;
  z: number;
  zone: number;
  progress: number;
  depth: number;
  route: RouteKind;
};

type PrototypeApi = {
  player: () => PrototypePlayerState;
};

type CameraPose = {
  position: Vector3;
  target: Vector3;
};

type CameraBlendState = {
  from: CameraMode;
  to: CameraMode;
  mix: number;
  label: string;
};

const ZONE_LENGTH = 50;
const ZONE_COUNT = 6;
const TOTAL_LENGTH = ZONE_LENGTH * ZONE_COUNT;
const ZONE_TRANSITION_HALF_WIDTH = 10;
const START_BLEND_END = 14;
const END_BLEND_START = 282;
const END_BLEND_END = 298;
const ROUTE_FRAME_SAMPLE_DISTANCE = 2.5;
const CAMERA_FOLLOW_RATE = 2.8;
const TARGET_FOLLOW_RATE = 3.4;

// Zone 1 uses a dedicated third-person start blend, then settles into travel framing.
const zoneCameraModes: CameraMode[] = ['travel', 'travel', 'battle', 'turn', 'travel', 'reverse'];

const routePoints = [
  new Vector3(0, 0, 0),
  new Vector3(50, 0, 0),
  new Vector3(100, 0, 0),
  new Vector3(150, 0, 0),
  new Vector3(175, 0, 0),
  new Vector3(175, 0, -25),
  new Vector3(175, 0, -75),
  new Vector3(125, 0, -75),
];

const routeDistances: number[] = [0];
for (let index = 1; index < routePoints.length; index += 1) {
  routeDistances.push(routeDistances[index - 1] + Vector3.Distance(routePoints[index - 1], routePoints[index]));
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smoothStep = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function routePosition(progress: number): Vector3 {
  const clamped = Math.min(TOTAL_LENGTH, Math.max(0, progress));
  let segmentIndex = routeDistances.findIndex((distance, index) => index > 0 && clamped <= distance + 0.0001) - 1;
  if (segmentIndex < 0) segmentIndex = routePoints.length - 2;

  const startDistance = routeDistances[segmentIndex];
  const endDistance = routeDistances[segmentIndex + 1];
  const length = Math.max(0.0001, endDistance - startDistance);
  const t = clamp01((clamped - startDistance) / length);
  return Vector3.Lerp(routePoints[segmentIndex], routePoints[segmentIndex + 1], t);
}

function routeFrame(progress: number): { forward: Vector3; right: Vector3 } {
  const before = routePosition(progress - ROUTE_FRAME_SAMPLE_DISTANCE);
  const after = routePosition(progress + ROUTE_FRAME_SAMPLE_DISTANCE);
  const forward = after.subtract(before);
  if (forward.lengthSquared() < 0.0001) forward.set(1, 0, 0);
  forward.normalize();
  const right = new Vector3(-forward.z, 0, forward.x);
  return { forward, right };
}

function secretFrame(): { forward: Vector3; right: Vector3 } {
  return {
    forward: new Vector3(1, 0, 0),
    right: new Vector3(0, 0, 1),
  };
}

function zoneBlend(progress: number): CameraBlendState {
  if (progress <= START_BLEND_END) {
    const mix = smoothStep(progress / START_BLEND_END);
    return { from: 'start', to: 'travel', mix, label: `start → travel ${Math.round(mix * 100)}%` };
  }

  if (progress >= END_BLEND_START) {
    const mix = smoothStep((progress - END_BLEND_START) / (END_BLEND_END - END_BLEND_START));
    return { from: 'reverse', to: 'end', mix, label: `reverse → end ${Math.round(mix * 100)}%` };
  }

  for (let boundaryIndex = 1; boundaryIndex < ZONE_COUNT; boundaryIndex += 1) {
    const boundary = boundaryIndex * ZONE_LENGTH;
    const start = boundary - ZONE_TRANSITION_HALF_WIDTH;
    const end = boundary + ZONE_TRANSITION_HALF_WIDTH;
    if (progress < start || progress > end) continue;

    const from = zoneCameraModes[boundaryIndex - 1];
    const to = zoneCameraModes[boundaryIndex];
    const mix = smoothStep((progress - start) / (end - start));
    return {
      from,
      to,
      mix,
      label: from === to ? `${to} follow` : `${from} → ${to} ${Math.round(mix * 100)}%`,
    };
  }

  const zoneIndex = Math.min(ZONE_COUNT - 1, Math.max(0, Math.floor(progress / ZONE_LENGTH)));
  const mode = zoneCameraModes[zoneIndex];
  return { from: mode, to: mode, mix: 1, label: `${mode} follow` };
}

function cameraPoseForMode(mode: CameraMode, player: Vector3, forward: Vector3, right: Vector3): CameraPose {
  const playerGround = new Vector3(player.x, 0.8, player.z);

  if (mode === 'start') {
    return {
      position: playerGround.subtract(forward.scale(9)).add(new Vector3(0, 4.8, 0)).add(right.scale(1.4)),
      target: playerGround.add(forward.scale(7)),
    };
  }

  if (mode === 'battle') {
    // Wide battle framing remains player-anchored. It no longer jumps to the arena center.
    return {
      position: playerGround.add(right.scale(20)).add(new Vector3(0, 11.5, 0)).subtract(forward.scale(3)),
      target: playerGround.add(forward.scale(4.5)),
    };
  }

  if (mode === 'turn') {
    return {
      position: playerGround.add(right.scale(14)).add(new Vector3(0, 8.3, 0)).subtract(forward.scale(4)),
      target: playerGround.add(forward.scale(5)),
    };
  }

  if (mode === 'reverse') {
    return {
      position: playerGround.subtract(right.scale(15)).add(new Vector3(0, 8.2, 0)).subtract(forward.scale(3)),
      target: playerGround.add(forward.scale(5)),
    };
  }

  if (mode === 'end') {
    return {
      position: playerGround.subtract(forward.scale(10)).add(new Vector3(0, 5.2, 0)),
      target: playerGround.add(forward.scale(9)),
    };
  }

  if (mode === 'secret') {
    return {
      position: playerGround.add(right.scale(9)).add(new Vector3(0, 6.2, 0)).subtract(forward.scale(5)),
      target: playerGround.add(forward.scale(4)),
    };
  }

  return {
    position: playerGround.add(right.scale(15)).add(new Vector3(0, 8.5, 0)).subtract(forward.scale(3)),
    target: playerGround.add(forward.scale(6)),
  };
}

function blendPose(from: CameraPose, to: CameraPose, mix: number): CameraPose {
  return {
    position: Vector3.Lerp(from.position, to.position, mix),
    target: Vector3.Lerp(from.target, to.target, mix),
  };
}

function findPrototypeApi(): PrototypeApi | null {
  const api = (globalThis as typeof globalThis & { __astral25d?: PrototypeApi }).__astral25d;
  return api ?? null;
}

function installGlobalCameraDirector(): boolean {
  const api = findPrototypeApi();
  const engine = Engine.Instances[0];
  const scene: Scene | undefined = engine?.scenes[0];
  const camera = scene?.getCameraByName('camera');
  const playerMesh = scene?.getMeshByName('PLAYER');
  const hud = document.querySelector<HTMLDivElement>('#prototypeHud');

  if (!api || !scene || !(camera instanceof FreeCamera) || !playerMesh) return false;

  let directorPosition = camera.position.clone();
  let directorTarget = camera.getTarget().clone();
  let currentLabel = 'initializing';
  let currentBlend: CameraBlendState = { from: 'start', to: 'start', mix: 0, label: 'initializing' };

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(0.05, Math.max(0.001, engine.getDeltaTime() / 1000));
    const state = api.player();
    const playerPosition = playerMesh.position.clone();

    let desired: CameraPose;
    if (state.route === 'secret') {
      const frame = secretFrame();
      currentBlend = { from: 'secret', to: 'secret', mix: 1, label: 'secret follow' };
      desired = cameraPoseForMode('secret', playerPosition, frame.forward, frame.right);
    } else {
      const frame = routeFrame(state.progress);
      currentBlend = zoneBlend(state.progress);
      const fromPose = cameraPoseForMode(currentBlend.from, playerPosition, frame.forward, frame.right);
      const toPose = cameraPoseForMode(currentBlend.to, playerPosition, frame.forward, frame.right);
      desired = blendPose(fromPose, toPose, currentBlend.mix);
    }

    const positionBlend = 1 - Math.exp(-CAMERA_FOLLOW_RATE * dt);
    const targetBlend = 1 - Math.exp(-TARGET_FOLLOW_RATE * dt);
    directorPosition = Vector3.Lerp(directorPosition, desired.position, positionBlend);
    directorTarget = Vector3.Lerp(directorTarget, desired.target, targetBlend);

    // Apply last each frame. The prototype's original camera controller may still run,
    // but this global director owns the final rendered camera pose.
    camera.position.copyFrom(directorPosition);
    camera.setTarget(directorTarget);

    currentLabel = currentBlend.label;
    if (hud) {
      hud.insertAdjacentHTML(
        'beforeend',
        `<div class="prototype-muted">Global camera: <strong>${currentLabel}</strong> · ${ZONE_TRANSITION_HALF_WIDTH * 2} m boundary blend</div>`,
      );
    }
  });

  (globalThis as typeof globalThis & {
    __astralCameraDirector?: {
      snapshot: () => {
        label: string;
        from: CameraMode;
        to: CameraMode;
        mix: number;
        transitionHalfWidth: number;
      };
    };
  }).__astralCameraDirector = {
    snapshot: () => ({
      label: currentLabel,
      from: currentBlend.from,
      to: currentBlend.to,
      mix: currentBlend.mix,
      transitionHalfWidth: ZONE_TRANSITION_HALF_WIDTH,
    }),
  };

  return true;
}

function waitForPrototype(): void {
  if (installGlobalCameraDirector()) return;
  window.setTimeout(waitForPrototype, 25);
}

waitForPrototype();
