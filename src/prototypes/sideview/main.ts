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
  TransformNode,
  Vector3,
} from '@babylonjs/core';

const ZONE_LENGTH = 50;
const ZONE_COUNT = 6;
const TOTAL_LENGTH = ZONE_LENGTH * ZONE_COUNT;
const PLAYABLE_DEPTH = 12;
const HALF_DEPTH = PLAYABLE_DEPTH / 2;
const PLAYER_RADIUS = 0.55;
const PLAYER_SPEED = 4.9;
const SECRET_LENGTH = 30;
const SECRET_TRIGGER_START = 196;
const SECRET_TRIGGER_END = 201;

type CameraMode = 'start' | 'travel' | 'battle' | 'turn' | 'reverse' | 'end' | 'secret';

type RouteVertex = {
  point: Vector3;
  distance: number;
};

type RouteSegment = {
  start: Vector3;
  end: Vector3;
  startDistance: number;
  endDistance: number;
  length: number;
  forward: Vector3;
  right: Vector3;
};

type ZoneDefinition = {
  id: string;
  label: string;
  startDistance: number;
  endDistance: number;
  cameraMode: CameraMode;
};

type RouteSample = {
  position: Vector3;
  forward: Vector3;
  right: Vector3;
  segmentIndex: number;
};

const canvas = document.querySelector<HTMLCanvasElement>('#renderCanvas');
const hudQuery = document.querySelector<HTMLDivElement>('#prototypeHud');
if (!canvas || !hudQuery) throw new Error('2.5D prototype shell is missing required DOM elements.');
const hud: HTMLDivElement = hudQuery;

const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.055, 0.07, 0.1, 1);
new HemisphericLight('ambient', new Vector3(0, 1, 0), scene).intensity = 0.82;
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
const secretMaterial = material('secret-floor', new Color3(0.20, 0.23, 0.31), 0.05);
const secretSocketMaterial = material('secret-socket', new Color3(0.75, 0.35, 0.95), 0.35);
const battleMarkerMaterial = material('battle-marker', new Color3(0.92, 0.28, 0.24), 0.25);
const aimMaterial = material('aim-marker', new Color3(1.0, 0.86, 0.26), 0.35);
const playerMaterial = material('player', new Color3(0.7, 0.25, 0.95), 0.12);
const facingMaterial = material('facing', new Color3(0.92, 0.92, 1.0), 0.12);

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

function buildRouteVertices(points: readonly Vector3[]): RouteVertex[] {
  const vertices: RouteVertex[] = [{ point: points[0].clone(), distance: 0 }];
  let distance = 0;
  for (let index = 1; index < points.length; index += 1) {
    distance += Vector3.Distance(points[index - 1], points[index]);
    vertices.push({ point: points[index].clone(), distance });
  }
  if (Math.abs(distance - TOTAL_LENGTH) > 0.001) {
    throw new Error(`2.5D route must measure ${TOTAL_LENGTH} m; got ${distance.toFixed(2)} m.`);
  }
  return vertices;
}

const routeVertices = buildRouteVertices(routePoints);
const routeSegments: RouteSegment[] = [];
for (let index = 0; index < routeVertices.length - 1; index += 1) {
  const start = routeVertices[index];
  const end = routeVertices[index + 1];
  const vector = end.point.subtract(start.point);
  const length = vector.length();
  const forward = vector.scale(1 / length);
  const right = new Vector3(-forward.z, 0, forward.x);
  routeSegments.push({
    start: start.point,
    end: end.point,
    startDistance: start.distance,
    endDistance: end.distance,
    length,
    forward,
    right,
  });
}

const zones: ZoneDefinition[] = [
  { id: 'zone-start', label: 'Start / Establishing', startDistance: 0, endDistance: 50, cameraMode: 'start' },
  { id: 'zone-travel', label: 'Travel', startDistance: 50, endDistance: 100, cameraMode: 'travel' },
  { id: 'zone-battle', label: 'Battle Lock', startDistance: 100, endDistance: 150, cameraMode: 'battle' },
  { id: 'zone-turn', label: 'L-Turn / Secret Access', startDistance: 150, endDistance: 200, cameraMode: 'turn' },
  { id: 'zone-return-leg', label: 'North Travel', startDistance: 200, endDistance: 250, cameraMode: 'travel' },
  { id: 'zone-reverse', label: 'Reverse / Exit', startDistance: 250, endDistance: 300, cameraMode: 'reverse' },
];

function zoneAt(distance: number): ZoneDefinition {
  return zones[Math.min(ZONE_COUNT - 1, Math.max(0, Math.floor(distance / ZONE_LENGTH)))];
}

function segmentAt(distance: number): { segment: RouteSegment; index: number; t: number } {
  const clamped = Math.min(TOTAL_LENGTH, Math.max(0, distance));
  let index = routeSegments.findIndex(segment => clamped <= segment.endDistance + 0.0001);
  if (index < 0) index = routeSegments.length - 1;
  const segment = routeSegments[index];
  const t = segment.length <= 0 ? 0 : (clamped - segment.startDistance) / segment.length;
  return { segment, index, t: Math.min(1, Math.max(0, t)) };
}

function offsetVertex(vertexIndex: number, depth: number): Vector3 {
  const vertex = routeVertices[vertexIndex].point;
  if (vertexIndex === 0) return vertex.add(routeSegments[0].right.scale(depth));
  if (vertexIndex === routeVertices.length - 1) return vertex.add(routeSegments[routeSegments.length - 1].right.scale(depth));

  const previousRight = routeSegments[vertexIndex - 1].right;
  const nextRight = routeSegments[vertexIndex].right;
  const miter = previousRight.add(nextRight);
  if (miter.lengthSquared() < 0.0001) return vertex.add(nextRight.scale(depth));
  miter.normalize();
  const denominator = Vector3.Dot(miter, nextRight);
  const scale = Math.abs(denominator) < 0.2 ? depth : depth / denominator;
  return vertex.add(miter.scale(scale));
}

function sampleMainRoute(distance: number, depth: number): RouteSample {
  const located = segmentAt(distance);
  const start = offsetVertex(located.index, depth);
  const end = offsetVertex(located.index + 1, depth);
  return {
    position: Vector3.Lerp(start, end, located.t),
    forward: located.segment.forward,
    right: located.segment.right,
    segmentIndex: located.index,
  };
}

const secretEntryMainDistance = 199;
const secretEntrySample = sampleMainRoute(secretEntryMainDistance, HALF_DEPTH - 0.7);
const secretForward = new Vector3(1, 0, 0);
const secretRight = new Vector3(0, 0, 1);
const secretStart = secretEntrySample.position.clone();

function sampleSecretRoute(distance: number, depth: number): RouteSample {
  const clamped = Math.min(SECRET_LENGTH, Math.max(0, distance));
  return {
    position: secretStart.add(secretForward.scale(clamped)).add(secretRight.scale(depth)),
    forward: secretForward,
    right: secretRight,
    segmentIndex: -1,
  };
}

function makeMarker(name: string, position: Vector3, height: number, mat: StandardMaterial): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width: 0.14, height, depth: 0.14 }, scene);
  mesh.position.copyFrom(position);
  mesh.material = mat;
  return mesh;
}

function buildFloorSegment(name: string, start: Vector3, end: Vector3, depth: number, mat: StandardMaterial): Mesh {
  const delta = end.subtract(start);
  const length = delta.length();
  const floor = MeshBuilder.CreateBox(name, { width: length + 0.15, height: 0.35, depth }, scene);
  floor.position.copyFrom(Vector3.Lerp(start, end, 0.5));
  floor.position.y = -0.175;
  floor.rotation.y = -Math.atan2(delta.z, delta.x);
  floor.material = mat;
  floor.isPickable = true;
  floor.metadata = { sideviewWalkable: true };
  return floor;
}

function buildRouteGeometry(): void {
  const root = new TransformNode('SIDEVIEW_MAIN_ROUTE', scene);
  routeSegments.forEach((segment, index) => {
    const midDistance = (segment.startDistance + segment.endDistance) / 2;
    const zoneIndex = Math.min(ZONE_COUNT - 1, Math.floor(midDistance / ZONE_LENGTH));
    const floor = buildFloorSegment(`ROUTE_FLOOR_${index + 1}`, segment.start, segment.end, PLAYABLE_DEPTH, floorMaterials[zoneIndex]);
    floor.parent = root;

    const center = buildFloorSegment(`ROUTE_CENTER_${index + 1}`, segment.start, segment.end, 0.09, centerLineMaterial);
    center.scaling.y = 0.06;
    center.position.y = 0.015;
    center.isPickable = false;
    center.parent = root;

    const right = segment.right;
    const midpoint = Vector3.Lerp(segment.start, segment.end, 0.5);
    for (const side of [-1, 1]) {
      const rail = MeshBuilder.CreateBox(
        `ROUTE_LIMIT_${index + 1}_${side < 0 ? 'A' : 'B'}`,
        { width: segment.length + 0.25, height: 1.05, depth: 0.32 },
        scene,
      );
      rail.position.copyFrom(midpoint.add(right.scale(side * (HALF_DEPTH + 0.16))));
      rail.position.y = 0.525;
      rail.rotation.y = -Math.atan2(segment.end.z - segment.start.z, segment.end.x - segment.start.x);
      rail.material = boundaryMaterial;
      rail.parent = root;
    }
  });

  for (let zone = 1; zone < ZONE_COUNT; zone += 1) {
    const sample = sampleMainRoute(zone * ZONE_LENGTH, 0);
    const seam = MeshBuilder.CreateBox(`ZONE_SOCKET_${zone}_${zone + 1}`, { width: 0.8, height: 0.08, depth: PLAYABLE_DEPTH - 0.8 }, scene);
    seam.position.copyFrom(sample.position);
    seam.position.y = 0.04;
    seam.rotation.y = -Math.atan2(sample.forward.z, sample.forward.x);
    seam.material = socketMaterial;
    seam.parent = root;
  }

  const startSample = sampleMainRoute(0, 0);
  const endSample = sampleMainRoute(TOTAL_LENGTH, 0);
  makeMarker('START_SOCKET_A', startSample.position.add(sampleMainRoute(0, 0).right.scale(-2.8)).add(new Vector3(0, 1.2, 0)), 2.4, socketMaterial).parent = root;
  makeMarker('START_SOCKET_B', startSample.position.add(sampleMainRoute(0, 0).right.scale(2.8)).add(new Vector3(0, 1.2, 0)), 2.4, socketMaterial).parent = root;
  makeMarker('END_SOCKET_A', endSample.position.add(sampleMainRoute(TOTAL_LENGTH, 0).right.scale(-2.8)).add(new Vector3(0, 1.2, 0)), 2.4, socketMaterial).parent = root;
  makeMarker('END_SOCKET_B', endSample.position.add(sampleMainRoute(TOTAL_LENGTH, 0).right.scale(2.8)).add(new Vector3(0, 1.2, 0)), 2.4, socketMaterial).parent = root;

  const battleCenter = sampleMainRoute(125, 0).position;
  for (const offset of [-14, 0, 14]) {
    const marker = MeshBuilder.CreateCylinder(`BATTLE_MARKER_${offset}`, { height: 0.08, diameter: 2.4 }, scene);
    marker.position.set(battleCenter.x + offset, 0.05, battleCenter.z);
    marker.material = battleMarkerMaterial;
    marker.parent = root;
  }
}

function buildSecretGeometry(): void {
  const end = secretStart.add(secretForward.scale(SECRET_LENGTH));
  const floor = buildFloorSegment('SECRET_ROUTE_FLOOR', secretStart, end, 7, secretMaterial);
  const center = buildFloorSegment('SECRET_ROUTE_CENTER', secretStart, end, 0.09, secretSocketMaterial);
  center.scaling.y = 0.06;
  center.position.y = 0.015;
  center.isPickable = false;

  for (const side of [-1, 1]) {
    const rail = MeshBuilder.CreateBox(
      `SECRET_LIMIT_${side < 0 ? 'A' : 'B'}`,
      { width: SECRET_LENGTH + 0.25, height: 0.8, depth: 0.28 },
      scene,
    );
    rail.position.copyFrom(Vector3.Lerp(secretStart, end, 0.5).add(secretRight.scale(side * 3.64)));
    rail.position.y = 0.4;
    rail.material = boundaryMaterial;
  }

  const secretDoor = MeshBuilder.CreateBox('SECRET_ENTRY_HINT', { width: 0.2, height: 2.6, depth: 6.2 }, scene);
  secretDoor.position.copyFrom(secretStart.subtract(secretForward.scale(0.1)));
  secretDoor.position.y = 1.3;
  secretDoor.material = secretSocketMaterial;

  const reward = MeshBuilder.CreatePolyhedron('SECRET_REWARD', { type: 2, size: 1.1 }, scene);
  reward.position.copyFrom(end.add(new Vector3(0, 1.1, 0)));
  reward.material = secretSocketMaterial;
}

buildRouteGeometry();
buildSecretGeometry();

const player = MeshBuilder.CreateCapsule('PLAYER', { height: 1.8, radius: PLAYER_RADIUS }, scene);
player.material = playerMaterial;
const facing = MeshBuilder.CreateBox('PLAYER_FACING', { width: 0.16, height: 0.16, depth: 1.1 }, scene);
facing.position.set(0, 0.25, 0.68);
facing.material = facingMaterial;
facing.parent = player;

const aimMarker = MeshBuilder.CreateTorus('AIM_MARKER', { diameter: 1.0, thickness: 0.08, tessellation: 24 }, scene);
aimMarker.rotation.x = Math.PI / 2;
aimMarker.position.y = 0.05;
aimMarker.material = aimMaterial;
aimMarker.isPickable = false;

const camera = new FreeCamera('camera', new Vector3(-7, 7, 0), scene);
camera.inputs.clear();
camera.minZ = 0.1;

let mainProgress = 2;
let secretProgress = 0;
let laneDepth = 0;
let routeMode: 'main' | 'secret' = 'main';
let currentCameraMode: CameraMode = 'start';
let aimPoint = new Vector3(8, 0, 0);
let attackFlashSeconds = 0;

const pressed = new Set<string>();
window.addEventListener('keydown', event => pressed.add(event.code));
window.addEventListener('keyup', event => pressed.delete(event.code));
window.addEventListener('blur', () => pressed.clear());

function currentSample(): RouteSample {
  return routeMode === 'main' ? sampleMainRoute(mainProgress, laneDepth) : sampleSecretRoute(secretProgress, laneDepth);
}

function applyPlayerPosition(): void {
  const sample = currentSample();
  player.position.copyFrom(sample.position);
  player.position.y = 0.9;
}

applyPlayerPosition();

function pointerAim(event: PointerEvent): void {
  const pick = scene.pick(event.clientX, event.clientY, mesh => Boolean(mesh.metadata?.sideviewWalkable));
  if (!pick?.hit || !pick.pickedPoint) return;
  aimPoint.copyFrom(pick.pickedPoint);
  aimPoint.y = 0.05;
  aimMarker.position.copyFrom(aimPoint);

  const dx = aimPoint.x - player.position.x;
  const dz = aimPoint.z - player.position.z;
  if (Math.hypot(dx, dz) > 0.01) player.rotation.y = Math.atan2(dx, dz);
}

canvas.addEventListener('pointermove', pointerAim);
canvas.addEventListener('pointerdown', event => {
  pointerAim(event);
  if (event.button !== 0) return;
  attackFlashSeconds = 0.12;
  aimMarker.scaling.setAll(1.45);
});
canvas.addEventListener('contextmenu', event => event.preventDefault());

function updateRouteTransitions(): void {
  if (routeMode === 'main') {
    const enteringSecret =
      mainProgress >= SECRET_TRIGGER_START &&
      mainProgress <= SECRET_TRIGGER_END &&
      laneDepth > HALF_DEPTH - 1.8 &&
      (pressed.has('KeyD') || pressed.has('ArrowRight'));
    if (enteringSecret) {
      routeMode = 'secret';
      secretProgress = 0;
      laneDepth = 0;
    }
    return;
  }

  if (secretProgress <= 0.35 && (pressed.has('KeyS') || pressed.has('ArrowDown'))) {
    routeMode = 'main';
    mainProgress = secretEntryMainDistance;
    laneDepth = HALF_DEPTH - 1.2;
  }
}

function updatePlayer(dt: number): void {
  let forwardInput = 0;
  let depthInput = 0;
  if (pressed.has('KeyW') || pressed.has('ArrowUp')) forwardInput += 1;
  if (pressed.has('KeyS') || pressed.has('ArrowDown')) forwardInput -= 1;
  if (pressed.has('KeyA') || pressed.has('ArrowLeft')) depthInput -= 1;
  if (pressed.has('KeyD') || pressed.has('ArrowRight')) depthInput += 1;

  if (forwardInput !== 0 && depthInput !== 0) {
    const diagonalScale = Math.SQRT1_2;
    forwardInput *= diagonalScale;
    depthInput *= diagonalScale;
  }

  if (routeMode === 'main') {
    mainProgress = Math.min(TOTAL_LENGTH - PLAYER_RADIUS, Math.max(PLAYER_RADIUS, mainProgress + forwardInput * PLAYER_SPEED * dt));
  } else {
    secretProgress = Math.min(SECRET_LENGTH - PLAYER_RADIUS, Math.max(0, secretProgress + forwardInput * PLAYER_SPEED * dt));
  }
  laneDepth = Math.min(HALF_DEPTH - PLAYER_RADIUS, Math.max(-HALF_DEPTH + PLAYER_RADIUS, laneDepth + depthInput * PLAYER_SPEED * dt));

  updateRouteTransitions();
  applyPlayerPosition();

  if (attackFlashSeconds > 0) {
    attackFlashSeconds = Math.max(0, attackFlashSeconds - dt);
    if (attackFlashSeconds <= 0) aimMarker.scaling.setAll(1);
  }
}

function cameraModeForPlayer(): CameraMode {
  if (routeMode === 'secret') return 'secret';
  const zone = zoneAt(mainProgress);
  if (mainProgress >= 288) return 'end';
  return zone.cameraMode;
}

function cameraDesired(mode: CameraMode): { position: Vector3; target: Vector3 } {
  const sample = currentSample();
  const forward = sample.forward;
  const right = sample.right;
  const playerGround = new Vector3(player.position.x, 0.8, player.position.z);

  if (mode === 'start') {
    return {
      position: playerGround.subtract(forward.scale(9)).add(new Vector3(0, 4.8, 0)).add(right.scale(1.4)),
      target: playerGround.add(forward.scale(7)),
    };
  }

  if (mode === 'battle' && routeMode === 'main') {
    const center = sampleMainRoute(125, 0).position.add(new Vector3(0, 0.8, 0));
    return {
      position: center.add(right.scale(20)).add(new Vector3(0, 11.5, 0)).subtract(forward.scale(2)),
      target: center,
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

function updateCamera(dt: number): void {
  currentCameraMode = cameraModeForPlayer();
  const desired = cameraDesired(currentCameraMode);
  const blend = Math.min(1, dt * (currentCameraMode === 'battle' ? 3.2 : 4.5));
  camera.position.copyFrom(Vector3.Lerp(camera.position, desired.position, blend));
  const currentTarget = camera.getTarget();
  camera.setTarget(Vector3.Lerp(currentTarget, desired.target, blend));
}

function updateHud(): void {
  const zoneIndex = routeMode === 'main' ? Math.min(ZONE_COUNT - 1, Math.floor(mainProgress / ZONE_LENGTH)) : 3;
  const zone = zones[zoneIndex];
  const routeDistance = routeMode === 'main' ? mainProgress : secretProgress;
  const routeLabel = routeMode === 'main' ? `${mainProgress.toFixed(1)} / ${TOTAL_LENGTH} m` : `secret ${secretProgress.toFixed(1)} / ${SECRET_LENGTH} m`;
  const secretHint = routeMode === 'main' && mainProgress >= 188 && mainProgress <= 202
    ? '<div class="prototype-secret">Secret hint: move to the outer edge with D near the purple connector.</div>'
    : '';

  hud.innerHTML = `
    <div class="prototype-title">Astral Shift 0.6.9-2.5d.2</div>
    <div>300 m route · 6 × 50 m logical zones · 30 m secret branch</div>
    <div>Current zone: <strong>${zoneIndex + 1}</strong> / ${ZONE_COUNT} · ${zone.label}</div>
    <div>Route: ${routeLabel} · Lane depth: ${laneDepth.toFixed(1)} m</div>
    <div>Camera: <strong>${currentCameraMode}</strong> · Speed: ${PLAYER_SPEED.toFixed(1)} m/s</div>
    ${secretHint}
    <div class="prototype-muted">W/S = route forward/back · A/D = lane depth · mouse = aim · LMB = attack pulse</div>
    <div class="prototype-muted">Blue seams = zone sockets · purple = secret connector · red markers = battle zone</div>
    <div class="prototype-muted">Debug distance: ${routeDistance.toFixed(1)} m</div>
  `;
}

scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
  updatePlayer(dt);
  updateCamera(dt);
  updateHud();
});

engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());

(globalThis as typeof globalThis & {
  __astral25d?: {
    totalLength: number;
    zoneLength: number;
    playableDepth: number;
    playerSpeed: number;
    player: () => { x: number; z: number; zone: number; progress: number; depth: number; route: 'main' | 'secret' };
    camera: () => { mode: CameraMode; x: number; y: number; z: number };
    setProgress: (meters: number) => void;
    enterSecret: () => void;
    exitSecret: () => void;
  };
}).__astral25d = {
  totalLength: TOTAL_LENGTH,
  zoneLength: ZONE_LENGTH,
  playableDepth: PLAYABLE_DEPTH,
  playerSpeed: PLAYER_SPEED,
  player: () => ({
    x: player.position.x,
    z: player.position.z,
    zone: routeMode === 'main' ? Math.min(ZONE_COUNT, Math.floor(mainProgress / ZONE_LENGTH) + 1) : 4,
    progress: routeMode === 'main' ? mainProgress : secretProgress,
    depth: laneDepth,
    route: routeMode,
  }),
  camera: () => ({ mode: currentCameraMode, x: camera.position.x, y: camera.position.y, z: camera.position.z }),
  setProgress: (meters: number) => {
    routeMode = 'main';
    mainProgress = Math.min(TOTAL_LENGTH - PLAYER_RADIUS, Math.max(PLAYER_RADIUS, meters));
    laneDepth = 0;
    applyPlayerPosition();
  },
  enterSecret: () => {
    routeMode = 'secret';
    secretProgress = 0;
    laneDepth = 0;
    applyPlayerPosition();
  },
  exitSecret: () => {
    routeMode = 'main';
    mainProgress = secretEntryMainDistance;
    laneDepth = HALF_DEPTH - 1.2;
    applyPlayerPosition();
  },
};
