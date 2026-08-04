import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { StateMachine } from '../../engine/state';
import type {
  DynamicBoxCollider,
  ElevatorStateId,
  OutdoorZone,
  TraversalSurface,
  WorldCollider,
  WorldLandmark,
} from './WorldTypes';
import type { WorldVolume } from './WorldVolumeTypes';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';

/**
 * 0.6.9.1 authored blockout for Level 1.
 * The beach/forest and quarry boss arena share one Babylon scene for now,
 * with portal volumes moving the player between isolated play spaces.
 */
export function buildLevelOneZone(options: OutdoorZoneBuildOptions): OutdoorZone {
  const { scene, shadows, material } = options;
  const colliders: WorldCollider[] = [];
  const traversalSurfaces: TraversalSurface[] = [];
  const worldVolumes: WorldVolume[] = [];
  const dynamicColliders: DynamicBoxCollider[] = [];
  const landmarks: WorldLandmark[] = [];
  const traversalHighlights: Mesh[] = [];

  const addBoxCollider = (
    label: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    interaction: 'solid' | 'traversable' | 'hazard' = 'solid',
    clearanceHeight = 0.65,
  ): void => {
    colliders.push({
      kind: 'box', label, centerX: x, centerZ: z,
      halfWidth: width / 2, halfDepth: depth / 2,
      interaction, clearanceHeight,
    });
  };

  const addCircleCollider = (
    label: string,
    x: number,
    z: number,
    radius: number,
    interaction: 'solid' | 'traversable' | 'hazard' = 'solid',
    clearanceHeight = 0.65,
  ): void => {
    colliders.push({ kind: 'circle', label, centerX: x, centerZ: z, radius, interaction, clearanceHeight });
  };

  const addLandmark = (id: string, label: string, x: number, z: number): void => {
    landmarks.push({ id, label, position: new Vector3(x, 0, z) });
  };

  const addGroundPatch = (
    name: string,
    x: number,
    z: number,
    width: number,
    depth: number,
    color: Color3,
    height = 0.04,
  ): Mesh => {
    const mesh = MeshBuilder.CreateBox(name, { width, depth, height }, scene);
    mesh.position.set(x, height / 2, z);
    mesh.material = material(name, color);
    mesh.receiveShadows = true;
    return mesh;
  };

  const addRock = (name: string, x: number, z: number, radius: number): void => {
    const rock = MeshBuilder.CreateIcoSphere(name, { radius, subdivisions: 1 }, scene);
    rock.position.set(x, radius * 0.7, z);
    rock.scaling.set(1.25, 0.8, 1);
    rock.rotation.y = (x + z) * 0.17;
    rock.material = material('level-one-rock', new Color3(0.3, 0.32, 0.31));
    shadows.addShadowCaster(rock);
    addCircleCollider(name, x, z, radius * 0.72);
  };

  const addTree = (name: string, x: number, z: number, scale = 1): void => {
    const trunk = MeshBuilder.CreateCylinder(name + '-trunk', {
      height: 4.2 * scale, diameterTop: 0.5 * scale,
      diameterBottom: 0.8 * scale, tessellation: 10,
    }, scene);
    trunk.position.set(x, 2.1 * scale, z);
    trunk.material = material('level-one-tree-trunk', new Color3(0.28, 0.17, 0.08));
    shadows.addShadowCaster(trunk);
    const crown = MeshBuilder.CreateIcoSphere(name + '-crown', { radius: 1.9 * scale, subdivisions: 2 }, scene);
    crown.position.set(x, 4.6 * scale, z);
    crown.scaling.y = 1.15;
    crown.material = material('level-one-tree-crown', new Color3(0.13, 0.34, 0.16));
    shadows.addShadowCaster(crown);
    addCircleCollider(name, x, z, 0.55 * scale);
  };

  const addWall = (name: string, x: number, z: number, width: number, depth: number, height = 4): void => {
    const wall = MeshBuilder.CreateBox(name, { width, depth, height }, scene);
    wall.position.set(x, height / 2 - 0.04, z);
    wall.material = material('level-one-cliff', new Color3(0.28, 0.29, 0.27));
    wall.receiveShadows = true;
    shadows.addShadowCaster(wall);
    addBoxCollider(name, x, z, width, depth);
  };

  const addBridge = (name: string, x: number, z: number, width: number, depth: number): void => {
    const bridge = MeshBuilder.CreateBox(name, { width, depth, height: 0.24 }, scene);
    bridge.position.set(x, 0.12, z);
    bridge.material = material('level-one-bridge', new Color3(0.38, 0.23, 0.1));
    shadows.addShadowCaster(bridge);
    addBoxCollider(name, x, z, width, depth, 'traversable', 0.24);
    traversalSurfaces.push({
      mode: 'free', shape: 'box', id: name + '-surface', label: name,
      colliderLabel: name, center: new Vector3(x, 0.24, z),
      halfWidth: width / 2, halfDepth: depth / 2,
      surfaceHeight: 0.24, entryPadding: 0.3, exitDistance: 0.5,
    });
    traversalHighlights.push(bridge);
  };

  const addPortal = (name: string, x: number, z: number, color: Color3): void => {
    const ring = MeshBuilder.CreateTorus(name, { diameter: 3.2, thickness: 0.3, tessellation: 32 }, scene);
    ring.position.set(x, 1.65, z);
    ring.rotation.x = Math.PI / 2;
    ring.material = material(name, color, 0.7);
    shadows.addShadowCaster(ring);
  };

  // Shared floor is intentionally large enough for both isolated spaces.
  const ground = MeshBuilder.CreateGround('level-one-ground', { width: 150, height: 260, subdivisions: 6 }, scene);
  ground.position.z = 40;
  ground.material = material('level-one-ground', new Color3(0.16, 0.22, 0.15));
  ground.receiveShadows = true;

  // ---------------------------------------------------------------------
  // Zone 1: beach tutorial, river, camp, forest and wolf den.
  // ---------------------------------------------------------------------
  addGroundPatch('beach-sand', 0, -28, 70, 34, new Color3(0.72, 0.58, 0.4));
  addGroundPatch('forest-floor', -8, 10, 88, 52, new Color3(0.15, 0.25, 0.13));
  addGroundPatch('east-bank', 32, 12, 25, 48, new Color3(0.2, 0.29, 0.16));

  // Sand pit teaches movement reduction and disables dodge.
  addGroundPatch('sand-pit', 4, -18, 13, 12, new Color3(0.68, 0.48, 0.32));
  worldVolumes.push({
    id: 'level-one-sand-pit', label: 'Sand Pit', kind: 'modifier',
    footprint: { shape: 'box', centerX: 4, centerZ: -18, halfWidth: 6, halfDepth: 6 },
    speedMultiplier: 0.5, disableDodge: true, groundContactOnly: true,
  });
  const tutorialLog = MeshBuilder.CreateCylinder('tutorial-jump-log', { height: 10, diameter: 1.1, tessellation: 12 }, scene);
  tutorialLog.position.set(4, 0.58, -18);
  tutorialLog.rotation.z = Math.PI / 2;
  tutorialLog.material = material('tutorial-log', new Color3(0.34, 0.19, 0.08));
  addBoxCollider('tutorial-jump-log', 4, -18, 10, 1.1, 'traversable', 0.58);
  traversalSurfaces.push({
    mode: 'free', shape: 'box', id: 'tutorial-jump-log-surface', label: 'Tutorial Jump Log',
    colliderLabel: 'tutorial-jump-log', center: new Vector3(4, 0.58, -18),
    halfWidth: 5, halfDepth: 0.55, surfaceHeight: 0.58,
    entryPadding: 0.6, exitDistance: 0.75,
  });
  traversalHighlights.push(tutorialLog);

  // River curves are approximated by three broad water sections.
  const riverSegments: Array<[number, number, number, number, number]> = [
    [-21, -7, 44, 8, -0.12], [5, -2, 36, 9, 0.08], [27, 8, 34, 9, -0.22],
  ];
  riverSegments.forEach(([x, z, width, depth, rotation], index) => {
    const water = MeshBuilder.CreateBox('river-water-' + index, { width, depth, height: 0.08 }, scene);
    water.position.set(x, 0.03, z);
    water.rotation.y = rotation;
    water.material = material('level-one-water', new Color3(0.08, 0.39, 0.62), 0.12);
    water.visibility = 0.88;
  });
  worldVolumes.push(
    {
      id: 'river-shallow', label: 'River Shallows', kind: 'modifier',
      footprint: { shape: 'box', centerX: 1, centerZ: -3, halfWidth: 46, halfDepth: 5.5 },
      speedMultiplier: 0.65, groundContactOnly: true, maximumY: 0.22,
    },
    {
      id: 'river-deep-channel', label: 'Deep River Channel', kind: 'water-hazard',
      footprint: { shape: 'box', centerX: 4, centerZ: -2, halfWidth: 34, halfDepth: 2.1 },
      speedMultiplier: 0.25, drownSeconds: 5, disableJump: true, disableDodge: true,
      bankAxis: 'z', bankCenter: -2, recoveryPadding: 0.35, maximumY: 0.22,
    },
  );

  addBridge('crossable-river-bridge', -24, -5, 5, 12);
  addLandmark('bridge', 'Crossable Bridge', -24, -5);

  // Camp blockout and NPC stations.
  addGroundPatch('small-camp', -9, 11, 22, 16, new Color3(0.42, 0.25, 0.1), 0.08);
  const tent = MeshBuilder.CreateCylinder('camp-tent', { diameter: 6, height: 3.5, tessellation: 4 }, scene);
  tent.position.set(-12, 1.75, 12);
  tent.rotation.y = Math.PI / 4;
  tent.material = material('camp-tent', new Color3(0.55, 0.24, 0.08));
  addCircleCollider('camp-tent', -12, 12, 2.8);
  // Camp NPC visuals are supplied by ActorRuntime; no duplicate blockout markers.
  addLandmark('npc-camp', 'Small Camp', -8, 10);

  // Boat crossings and toll markers. Actual copper transaction is handled by
  // interaction logic in a later content pass; geometry and trigger IDs are live.
  for (const [index, x, z] of [[1, 22, 5], [2, 36, 10]] as const) {
    const boat = MeshBuilder.CreateCapsule('toll-boat-' + index, { height: 4, radius: 1.1 }, scene);
    boat.position.set(x, 0.45, z);
    boat.rotation.z = Math.PI / 2;
    boat.material = material('toll-boat', new Color3(0.25, 0.31, 0.22));
    addBoxCollider('toll-boat-' + index, x, z, 4.2, 2.2, 'traversable', 0.65);
    traversalSurfaces.push({
      mode: 'free', shape: 'box', id: 'toll-boat-' + index + '-surface', label: 'Toll Boat ' + index,
      colliderLabel: 'toll-boat-' + index, center: new Vector3(x, 0.65, z),
      halfWidth: 2.1, halfDepth: 1.1, surfaceHeight: 0.65,
      entryPadding: 0.45, exitDistance: 0.65,
    });
    worldVolumes.push({
      id: 'toll-boat-trigger-' + index, label: 'Boat Toll ' + index, kind: 'trigger',
      footprint: { shape: 'box', centerX: x - 3, centerZ: z, halfWidth: 1.7, halfDepth: 1.7 },
      eventId: 'level-one.boat-toll-' + index, once: false,
    });
  }

  // Tall rock wall forces the intended river/boat route.
  addWall('tall-rock-barrier-a', 22, 22, 36, 4, 6);
  addWall('tall-rock-barrier-b', 48, 22, 18, 4, 6);

  // Forest collision dressing and clear pockets for authored wolf groups.
  const trees: Array<[number, number, number]> = [
    [-36,4,1.1],[-31,10,1],[-35,18,1.2],[-25,22,1],[-20,3,1],[-18,20,1.1],
    [-4,28,1.15],[5,24,1],[11,30,1.1],[18,30,1],[29,29,1.2],[43,27,1.1],
    [48,12,1.2],[52,19,1],[55,30,1.15],[-2,2,0.9],[9,8,1],[15,15,1.05],
  ];
  trees.forEach(([x, z, scale], index) => addTree('level-one-tree-' + index, x, z, scale));
  [[-30,16,1.5],[-17,8,1.2],[3,20,1.3],[13,5,1.1],[44,13,1.4],[51,25,1.5]].forEach(
    ([x, z, r], index) => addRock('level-one-rock-' + index, x, z, r),
  );

  // Wolf den and gated boss portal.
  const den = MeshBuilder.CreateCylinder('wolf-den', { diameter: 13, height: 4.5, tessellation: 24 }, scene);
  den.position.set(55, 2.25, 35);
  den.scaling.z = 0.7;
  den.material = material('wolf-den', new Color3(0.34, 0.31, 0.34));
  addCircleCollider('wolf-den', 55, 35, 6.2);
  addPortal('boss-area-portal', 55, 28, new Color3(0.75, 0.04, 0.08));
  worldVolumes.push({
    id: 'boss-area-portal-trigger', label: 'Boss Area Portal', kind: 'trigger',
    footprint: { shape: 'box', centerX: 55, centerZ: 28, halfWidth: 1.8, halfDepth: 1.8 },
    eventId: 'level-one.portal-to-boss', once: false,
  });
  addLandmark('wolf-den', 'Wolf Den', 55, 33);

  // Zone 1 outer boundaries.
  addWall('zone-one-west-wall', -48, 7, 4, 82, 5);
  addWall('zone-one-east-wall', 65, 7, 4, 82, 5);
  addWall('zone-one-south-wall-a', -28, -46, 42, 4, 5);
  addWall('zone-one-south-wall-b', 35, -46, 56, 4, 5);
  addWall('zone-one-north-wall', 8, 43, 112, 4, 5);

  // ---------------------------------------------------------------------
  // Zone 2: quarry boss arena, isolated far north in the same scene.
  // ---------------------------------------------------------------------
  const bossCenterZ = 105;
  addGroundPatch('quarry-floor', 0, bossCenterZ, 82, 52, new Color3(0.63, 0.43, 0.3));
  addWall('quarry-west-wall', -43, bossCenterZ, 4, 58, 7);
  addWall('quarry-east-wall', 43, bossCenterZ, 4, 58, 7);
  addWall('quarry-north-wall', 0, bossCenterZ + 29, 88, 4, 7);
  addWall('quarry-south-wall-a', -25, bossCenterZ - 29, 38, 4, 7);
  addWall('quarry-south-wall-b', 25, bossCenterZ - 29, 38, 4, 7);

  // LOS structures and jump platforms.
  [[-18,bossCenterZ,7,4,3],[16,bossCenterZ+4,6,5,2.5],[-6,bossCenterZ+13,8,3,2.2],[8,bossCenterZ-10,5,5,1.4]].forEach(
    ([x,z,w,d,h], index) => {
      const platform = MeshBuilder.CreateBox('quarry-structure-' + index, { width: w, depth: d, height: h }, scene);
      platform.position.set(x, h / 2, z);
      platform.material = material('quarry-structure', new Color3(0.38, 0.33, 0.3));
      shadows.addShadowCaster(platform);
      addBoxCollider('quarry-structure-' + index, x, z, w, d, h <= 1.5 ? 'traversable' : 'solid', h);
      if (h <= 1.5) {
        traversalSurfaces.push({
          mode: 'free', shape: 'box', id: 'quarry-structure-' + index + '-surface', label: 'Quarry Platform',
          colliderLabel: 'quarry-structure-' + index, center: new Vector3(x, h, z),
          halfWidth: w / 2, halfDepth: d / 2, surfaceHeight: h,
          entryPadding: 0.65, exitDistance: 0.8,
        });
        traversalHighlights.push(platform);
      }
    },
  );
  addPortal('zone-one-return-portal', 0, bossCenterZ - 24, new Color3(0.7, 0.05, 0.08));
  worldVolumes.push({
    id: 'zone-one-return-portal-trigger', label: 'Return Portal', kind: 'trigger',
    footprint: { shape: 'box', centerX: 0, centerZ: bossCenterZ - 24, halfWidth: 1.8, halfDepth: 1.8 },
    eventId: 'level-one.portal-to-main', once: false,
  });

  addLandmark('entrance', 'Beach Arrival', 0, -37);
  addLandmark('movement-tutorial', 'Movement Tutorial', 4, -21);
  addLandmark('forest', 'Forest Area', -15, 18);
  addLandmark('wolf-grounds', 'Wolf Grounds', 34, 14);
  addLandmark('boss-arena', 'Wolf Keeper Quarry', 0, bossCenterZ);
  addLandmark('exit', 'Boss Portal', 55, 28);


  // ---------------------------------------------------------------------
  // Developer-only testing grounds.
  // Kept far outside the authored Level 1 play spaces so legacy validation
  // objects can remain available without appearing in normal gameplay.
  // This area is reachable only through developer teleport controls.
  // ---------------------------------------------------------------------
  const developerCenterX = 220;
  const developerCenterZ = 0;
  addGroundPatch(
    'developer-testing-ground',
    developerCenterX,
    developerCenterZ,
    54,
    46,
    new Color3(0.12, 0.14, 0.18),
  );
  addWall('developer-testing-west-wall', developerCenterX - 29, developerCenterZ, 4, 50, 5);
  addWall('developer-testing-east-wall', developerCenterX + 29, developerCenterZ, 4, 50, 5);
  addWall('developer-testing-north-wall', developerCenterX, developerCenterZ + 25, 62, 4, 5);
  addWall('developer-testing-south-wall', developerCenterX, developerCenterZ - 25, 62, 4, 5);

  const testingBlock = MeshBuilder.CreateBox(
    'developer-testing-block',
    { width: 8, depth: 8, height: 1.2 },
    scene,
  );
  testingBlock.position.set(developerCenterX - 10, 0.6, developerCenterZ + 4);
  testingBlock.material = material('developer-testing-block', new Color3(0.24, 0.28, 0.34));
  shadows.addShadowCaster(testingBlock);
  addBoxCollider('developer-testing-block', developerCenterX - 10, developerCenterZ + 4, 8, 8, 'traversable', 1.2);
  traversalSurfaces.push({
    mode: 'free', shape: 'box', id: 'developer-testing-block-surface', label: 'Developer Testing Block',
    colliderLabel: 'developer-testing-block', center: new Vector3(developerCenterX - 10, 1.2, developerCenterZ + 4),
    halfWidth: 4, halfDepth: 4, surfaceHeight: 1.2, entryPadding: 0.6, exitDistance: 0.8,
  });
  traversalHighlights.push(testingBlock);

  addLandmark('developer-testing-grounds', 'Developer Testing Grounds', developerCenterX, developerCenterZ - 16);
  // Compatibility alias for older actor travel and developer commands.
  addLandmark('movement-course', 'Developer Testing Grounds', developerCenterX, developerCenterZ - 16);

  // A static compatibility machine keeps existing developer diagnostics valid.
  const elevatorStateMachine = new StateMachine<Record<string, never>, ElevatorStateId>(
    'level-one-static-elevator', {},
  ).addState({ id: 'bottom-idle', update: () => undefined });
  elevatorStateMachine.start('bottom-idle', 'level-one-start');

  return {
    groundName: ground.name,
    colliders,
    traversalSurfaces,
    worldVolumes,
    dynamicColliders,
    landmarks,
    update(dt: number): void { elevatorStateMachine.update(dt); },
    getElevatorStateSnapshot() { return elevatorStateMachine.snapshot(); },
    setTraversalHighlightVisible(visible: boolean): void {
      traversalHighlights.forEach(mesh => {
        if (!mesh.material) return;
        (mesh.material as StandardMaterial).emissiveColor = visible
          ? new Color3(0.2, 0.65, 0.9)
          : Color3.Black();
      });
    },
  };
}
