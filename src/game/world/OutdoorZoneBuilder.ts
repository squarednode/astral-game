import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import type {
  OutdoorZone,
  TraversalSurface,
  WorldCollider,
  WorldLandmark,
} from './WorldTypes';

export interface OutdoorZoneBuildOptions {
  scene: Scene;
  shadows: ShadowGenerator;
  material: (
    name: string,
    color: Color3,
    emissive?: number,
  ) => StandardMaterial;
}

export function buildOutdoorZone(
  options: OutdoorZoneBuildOptions,
): OutdoorZone {
  const { scene, shadows, material } = options;
  const colliders: WorldCollider[] = [];
  const traversalSurfaces: TraversalSurface[] = [];
  const landmarks: WorldLandmark[] = [];
  const traversalHighlights: Mesh[] = [];

  const ground = MeshBuilder.CreateGround(
    'outdoor-ground',
    { width: 80, height: 56, subdivisions: 4 },
    scene,
  );
  ground.material = material('outdoor-ground', new Color3(0.12, 0.19, 0.13));
  ground.receiveShadows = true;

  const addLandmark = (
    id: string,
    label: string,
    x: number,
    z: number,
  ): void => {
    landmarks.push({
      id,
      label,
      position: new Vector3(x, 0, z),
    });
  };

  const addBoxCollider = (
    label: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    interaction: 'solid' | 'traversable' = 'solid',
    clearanceHeight = 0.65,
  ): void => {
    colliders.push({
      kind: 'box',
      label,
      centerX: x,
      centerZ: z,
      halfWidth: width / 2,
      halfDepth: depth / 2,
      interaction,
      clearanceHeight,
    });
  };

  const addCircleCollider = (
    label: string,
    x: number,
    z: number,
    radius: number,
    interaction: 'solid' | 'traversable' = 'solid',
    clearanceHeight = 0.65,
  ): void => {
    colliders.push({
      kind: 'circle',
      label,
      centerX: x,
      centerZ: z,
      radius,
      interaction,
      clearanceHeight,
    });
  };

  const addPath = (
    name: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    rotation = 0,
  ): void => {
    const path = MeshBuilder.CreateBox(
      name,
      { width, depth, height: 0.035 },
      scene,
    );
    path.position.set(x, 0.018, z);
    path.rotation.y = rotation;
    path.material = material('earth-path', new Color3(0.25, 0.22, 0.14));
    path.receiveShadows = true;
  };

  const addBush = (
    name: string,
    x: number,
    z: number,
    radius = 0.7,
    soft = false,
  ): void => {
    const bush = MeshBuilder.CreateIcoSphere(
      name,
      { radius, subdivisions: 2 },
      scene,
    );
    bush.position.set(x, radius * 0.62, z);
    bush.scaling.y = 0.72;
    bush.material = material(
      soft ? 'soft-bush' : 'small-bush',
      soft ? new Color3(0.16, 0.34, 0.16) : new Color3(0.2, 0.4, 0.18),
    );
    bush.receiveShadows = true;
    shadows.addShadowCaster(bush);
  };

  const addTree = (
    name: string,
    x: number,
    z: number,
    scale = 1,
  ): void => {
    const trunk = MeshBuilder.CreateCylinder(
      `${name}-trunk`,
      {
        height: 4.8 * scale,
        diameterTop: 0.62 * scale,
        diameterBottom: 0.9 * scale,
        tessellation: 10,
      },
      scene,
    );
    trunk.position.set(x, 2.4 * scale, z);
    trunk.material = material('tree-trunk', new Color3(0.25, 0.15, 0.08));
    shadows.addShadowCaster(trunk);

    const crown = MeshBuilder.CreateIcoSphere(
      `${name}-crown`,
      { radius: 2.15 * scale, subdivisions: 2 },
      scene,
    );
    crown.position.set(x, 5.2 * scale, z);
    crown.scaling.y = 1.18;
    crown.material = material('tree-crown', new Color3(0.13, 0.31, 0.14));
    shadows.addShadowCaster(crown);

    // Only the trunk blocks movement. The canopy is visual.
    addCircleCollider(name, x, z, 0.58 * scale);
  };

  const addRock = (
    name: string,
    x: number,
    z: number,
    radius: number,
    traversable = false,
  ): void => {
    const rock = MeshBuilder.CreateIcoSphere(
      name,
      { radius, subdivisions: 1 },
      scene,
    );
    rock.position.set(x, radius * 0.72, z);
    rock.scaling.set(1.15, 0.78, 1);
    rock.rotation.y = (x * 0.37 + z * 0.13) % Math.PI;
    rock.material = material('rock', new Color3(0.27, 0.3, 0.27));
    rock.receiveShadows = true;
    shadows.addShadowCaster(rock);

    addCircleCollider(
      name,
      x,
      z,
      radius * 0.72,
      traversable ? 'traversable' : 'solid',
      traversable ? 0.72 : 0.65,
    );

    if (traversable) traversalHighlights.push(rock);
  };

  const addLog = (
    name: string,
    x: number,
    z: number,
    length: number,
    rotation: number,
    traversable = true,
  ): void => {
    const log = MeshBuilder.CreateCylinder(
      name,
      { height: length, diameter: 0.95, tessellation: 12 },
      scene,
    );
    log.position.set(x, 0.58, z);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = rotation;
    log.material = material('fallen-log', new Color3(0.31, 0.18, 0.09));
    shadows.addShadowCaster(log);

    const alongX = Math.abs(Math.cos(rotation)) >= 0.7;
    addBoxCollider(
      name,
      x,
      z,
      alongX ? length : 1,
      alongX ? 1 : length,
      traversable ? 'traversable' : 'solid',
      0.68,
    );

    if (traversable) traversalHighlights.push(log);
  };

  const addTraversalSurface = (
    id: string,
    label: string,
    colliderLabel: string,
    start: Vector3,
    end: Vector3,
    startLanding: Vector3,
    endLanding: Vector3,
    surfaceHeight: number,
    entryRadius = 1.15,
    width = 1.05,
    minimumEntryHeight = 0.28,
  ): void => {
    traversalSurfaces.push({
      id,
      label,
      colliderLabel,
      start,
      end,
      startLanding,
      endLanding,
      surfaceHeight,
      entryRadius,
      width,
      minimumEntryHeight,
    });

    // Entry markers are only visible when traversal highlighting is enabled.
    for (const [suffix, point] of [
      ['start', start],
      ['end', end],
    ] as const) {
      const marker = MeshBuilder.CreateCylinder(
        `${id}-${suffix}-anchor`,
        { diameter: 0.45, height: 0.06, tessellation: 24 },
        scene,
      );
      marker.position.copyFrom(point);
      marker.position.y = 0.08;
      marker.material = material(
        'traversal-anchor',
        new Color3(0.15, 0.72, 1),
        0.55,
      );
      marker.visibility = 0;
      traversalHighlights.push(marker);
    }
  };

  const addBridge = (
    name: string,
    x: number,
    z: number,
    width: number,
    depth: number,
  ): void => {
    for (let index = 0; index < 7; index++) {
      const plank = MeshBuilder.CreateBox(
        `${name}-plank-${index}`,
        { width, depth: depth / 7 - 0.08, height: 0.18 },
        scene,
      );
      plank.position.set(x, 0.22, z - depth / 2 + (index + 0.5) * depth / 7);
      plank.material = material('bridge-plank', new Color3(0.35, 0.23, 0.12));
      shadows.addShadowCaster(plank);
    }

    for (const side of [-1, 1]) {
      const rail = MeshBuilder.CreateBox(
        `${name}-rail-${side}`,
        { width: 0.16, depth, height: 0.62 },
        scene,
      );
      rail.position.set(x + side * (width / 2 - 0.08), 0.48, z);
      rail.material = material('bridge-rail', new Color3(0.29, 0.18, 0.09));
      shadows.addShadowCaster(rail);
    }
  };

  const addCliff = (
    name: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
  ): void => {
    const cliff = MeshBuilder.CreateBox(
      name,
      { width, depth, height },
      scene,
    );
    cliff.position.set(x, height / 2 - 0.08, z);
    cliff.material = material('cliff', new Color3(0.24, 0.27, 0.23));
    cliff.receiveShadows = true;
    shadows.addShadowCaster(cliff);
    addBoxCollider(name, x, z, width, depth);
  };

  // Primary dirt route and open side paths.
  addPath('path-entry', 0, -19, 7, 15);
  addPath('path-lower-turn', -2.5, -10, 7, 14, -0.27);
  addPath('path-stream', 0, -2, 7, 10, 0.2);
  addPath('path-upper', 4, 10, 7, 18, -0.18);
  addPath('path-exit', 1, 21, 9, 9);
  addPath('alternate-west', -11, 7, 4.5, 24, 0.08);
  addPath('alternate-east', 13, -5, 4.5, 19, -0.12);

  // Stream splits the zone. It is blocked except at the bridge and log crossing.
  const stream = MeshBuilder.CreateBox(
    'stream',
    { width: 70, depth: 4.5, height: 0.08 },
    scene,
  );
  stream.position.set(0, 0.015, 2);
  stream.material = material('stream-water', new Color3(0.08, 0.29, 0.43), 0.08);
  stream.visibility = 0.82;

  // Blocking stream sections. Gaps exist at x=-11 and x=5.
  addBoxCollider('stream-west-boundary', -25.5, 2, 19, 4.4);
  addBoxCollider('stream-middle-boundary', -3, 2, 12, 4.4);
  addBoxCollider('stream-east-boundary', 22.5, 2, 31, 4.4);

  addBridge('old-bridge', 5, 2, 4.6, 5.2);
  addLog('stream-log-crossing', -11, 2, 5.5, Math.PI / 2, true);
  addTraversalSurface(
    'stream-log-surface',
    'Stream Log Crossing',
    'stream-log-crossing',
    new Vector3(-11, 0.58, -0.85),
    new Vector3(-11, 0.58, 4.85),
    new Vector3(-11, 0, -1.55),
    new Vector3(-11, 0, 5.55),
    0.58,
    1.25,
    1.05,
    0.28,
  );

  // Entrance traversal lesson: jump or go around. The traversal direction is
  // perpendicular to the visual log because this object is vaulted across.
  addLog('entry-fallen-log', 0, -12.5, 6.2, 0, true);
  addTraversalSurface(
    'entry-log-surface',
    'Entrance Fallen Log',
    'entry-fallen-log',
    new Vector3(0, 0.58, -13.45),
    new Vector3(0, 0.58, -11.55),
    new Vector3(0, 0, -14.2),
    new Vector3(0, 0, -10.8),
    0.58,
    1.2,
    1.15,
    0.28,
  );

  // A low-rock shortcut.
  addRock('shortcut-rock-a', -7.4, 10.8, 1.0, true);
  addRock('shortcut-rock-b', -6.0, 12.4, 0.9, true);

  // Major landmark: primitive broken watchtower.
  const towerBase = MeshBuilder.CreateCylinder(
    'watchtower-base',
    { height: 5.2, diameter: 5.2, tessellation: 8 },
    scene,
  );
  towerBase.position.set(12, 2.6, 19);
  towerBase.material = material('tower-stone', new Color3(0.29, 0.3, 0.27));
  shadows.addShadowCaster(towerBase);
  addCircleCollider('watchtower-base', 12, 19, 2.8);

  const towerTop = MeshBuilder.CreateBox(
    'watchtower-top',
    { width: 5.5, depth: 5.5, height: 1.1 },
    scene,
  );
  towerTop.position.set(12, 5.4, 19);
  towerTop.rotation.y = 0.22;
  towerTop.material = material('tower-stone', new Color3(0.29, 0.3, 0.27));
  shadows.addShadowCaster(towerTop);

  // Natural boundary cliffs.
  addCliff('cliff-west', -39, 0, 3, 56, 5);
  addCliff('cliff-east', 39, 0, 3, 56, 5);
  addCliff('cliff-south-a', -22, -27, 34, 3, 4);
  addCliff('cliff-south-b', 23, -27, 32, 3, 4);
  addCliff('cliff-north-a', -23, 27, 31, 3, 5);
  addCliff('cliff-north-b', 24, 27, 30, 3, 5);

  // Forest edges and interior tree clusters.
  const treePoints: Array<[number, number, number]> = [
    [-32,-21,1.1],[-27,-18,1],[-33,-11,1.15],[-29,-3,1],
    [-34,7,1.2],[-29,13,1],[-34,21,1.1],[-25,23,1],
    [31,-22,1.1],[27,-17,1],[34,-10,1.2],[30,-2,1],
    [34,8,1.1],[28,14,1],[33,22,1.15],[24,24,1],
    [-17,-20,0.95],[-14,-16,1.05],[-20,-8,1],[-18,5,1.1],
    [-21,16,1],[-14,21,1.05],[18,-20,1],[16,-13,1.05],
    [21,-6,0.95],[19,7,1.05],[22,14,1],[19,22,1.1],
    [-8,-22,0.9],[9,-20,0.95],[-8,20,0.95],[6,24,0.9],
  ];
  treePoints.forEach(([x,z,scale], index) =>
    addTree(`tree-${index}`, x, z, scale),
  );

  // Solid rock groupings guide but do not fully constrain the routes.
  [
    [-10,-17,1.4],[-7,-18,0.9],[11,-14,1.2],[15,-11,1],
    [-17,11,1.3],[-15,14,0.95],[13,8,1.1],[16,10,1.35],
    [-4,19,1.2],[3,17,0.9],
  ].forEach(([x,z,radius], index) =>
    addRock(`solid-rock-${index}`, x, z, radius, false),
  );

  // Decorative and soft vegetation is intentionally non-colliding.
  const bushPoints: Array<[number, number, number, boolean]> = [
    [-5,-21,.65,false],[5,-20,.75,true],[-8,-14,.65,false],
    [8,-13,.8,true],[-14,-6,.75,true],[-8,-4,.6,false],
    [9,-5,.7,true],[14,-1,.65,false],[-17,7,.8,true],
    [-8,8,.65,false],[8,8,.75,true],[15,13,.65,false],
    [-12,18,.7,true],[2,19,.6,false],[9,22,.75,true],
  ];
  bushPoints.forEach(([x,z,radius,soft], index) =>
    addBush(`bush-${index}`, x, z, radius, soft),
  );

  // Simple ruined wall and broken wagon as small landmarks.
  const wall = MeshBuilder.CreateBox(
    'ruined-wall',
    { width: 8, depth: 0.8, height: 2.4 },
    scene,
  );
  wall.position.set(-14, 1.2, 17);
  wall.rotation.y = -0.28;
  wall.material = material('ruin-wall', new Color3(0.31, 0.31, 0.28));
  shadows.addShadowCaster(wall);
  addBoxCollider('ruined-wall', -14, 17, 8, 0.8);

  const wagonBody = MeshBuilder.CreateBox(
    'broken-wagon',
    { width: 3.2, depth: 1.7, height: 0.8 },
    scene,
  );
  wagonBody.position.set(8, 0.55, -16);
  wagonBody.rotation.y = 0.35;
  wagonBody.material = material('wagon', new Color3(0.35, 0.2, 0.09));
  shadows.addShadowCaster(wagonBody);
  addBoxCollider('broken-wagon', 8, -16, 3.3, 1.8);

  // Future encounter landmarks.
  addLandmark('entrance', 'Entrance', 0, -22);
  addLandmark('fallen-log', 'Fallen Log', 0, -14);
  addLandmark('stream', 'Stream Crossing', 5, -2);
  addLandmark('npc-camp', 'NPC Camp', -3, 9);
  addLandmark('bridge', 'Old Bridge', 5, 4);
  addLandmark('elite-arena', 'Elite Arena', 3, 18);
  addLandmark('exit', 'Exit Gate', 0, 23);

  return {
    groundName: ground.name,
    colliders,
    traversalSurfaces,
    landmarks,
    setTraversalHighlightVisible(visible: boolean): void {
      traversalHighlights.forEach(mesh => {
        if (mesh.name.endsWith('-anchor')) {
          mesh.visibility = visible ? 1 : 0;
          return;
        }

        if (!mesh.material) return;
        const materialInstance = mesh.material as StandardMaterial;
        materialInstance.emissiveColor = visible
          ? new Color3(0.2, 0.65, 0.9)
          : Color3.Black();
      });
    },
  };
}
