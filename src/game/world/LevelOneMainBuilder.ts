import { Color3, Mesh, MeshBuilder, Vector3 } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import { LevelInstanceBuilder } from './LevelInstanceBuilderSupport';
import { LEVEL_ONE_LAYOUT } from './LevelOneLayout';

export function buildLevelOneMain(options: OutdoorZoneBuildOptions): LevelInstance {
  const b = new LevelInstanceBuilder('main', options);
  const land = new Color3(0.16, 0.29, 0.14);
  const sand = new Color3(0.72, 0.59, 0.4);

  // The beach shelf reaches the visible ocean. The northern land is split into
  // west/east banks so no ground mesh exists beneath the river channel.
  b.ground('beach-ground', 6, -31, 116, 34, sand);
  b.ground('forest-west-bank', -25, 15, 50, 52, land);
  b.ground('forest-east-bank', 37, 18, 54, 46, land);
  b.ground('camp-peninsula', 0, 7, 28, 20, land);
  b.water('ocean', 6, -58, 132, 26, LEVEL_ONE_LAYOUT.elevation.ocean);

  // River is intentionally biased west. It opens into the ocean and bends
  // around the camp before narrowing toward the ferry route.
  const centerline = [
    new Vector3(-46, 0.19, -11),
    new Vector3(-34, 0.19, -7),
    new Vector3(-22, 0.19, -4),
    new Vector3(-9, 0.19, -2),
    new Vector3(4, 0.19, 1),
    new Vector3(14, 0.19, 7),
    new Vector3(22, 0.19, 15),
    new Vector3(29, 0.19, 27),
  ];
  const halfWidth = 4.4;
  const left: Vector3[] = [];
  const right: Vector3[] = [];
  centerline.forEach((point, index) => {
    const previous = centerline[Math.max(0, index - 1)];
    const next = centerline[Math.min(centerline.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.max(0.001, Math.hypot(dx, dz));
    const nx = -dz / length;
    const nz = dx / length;
    left.push(new Vector3(point.x + nx * halfWidth, point.y, point.z + nz * halfWidth));
    right.push(new Vector3(point.x - nx * halfWidth, point.y, point.z - nz * halfWidth));
  });
  const river = MeshBuilder.CreateRibbon('main-river', { pathArray: [left, right], sideOrientation: Mesh.DOUBLESIDE }, options.scene);
  river.parent = b.root;
  river.material = options.material('level-water', new Color3(0.05, 0.36, 0.62), 0.1);
  river.visibility = 0.92;

  // Water behavior follows the visible river corridor. Broad boxes are kept to
  // this first authored pass and will be replaced by terrain masks in 0.6.9.3.
  b.worldVolumes.push(
    {
      id: 'main-river-shallow-west', label: 'River Shallows', kind: 'modifier',
      footprint: { shape: 'box', centerX: -24, centerZ: -5, halfWidth: 25, halfDepth: 5.8 },
      speedMultiplier: 0.65, groundContactOnly: true, maximumY: 0.24,
    },
    {
      id: 'main-river-deep-west', label: 'Deep River Channel', kind: 'water-hazard',
      footprint: { shape: 'box', centerX: -24, centerZ: -5, halfWidth: 22, halfDepth: 2.1 },
      speedMultiplier: 0.25, drownSeconds: 5, disableJump: true, disableDodge: true,
      bankAxis: 'z', bankCenter: -5, recoveryPadding: 0.35, maximumY: 0.24,
    },
  );

  // Movement tutorial.
  b.ground('sand-pit', 20, -24, 15, 12, new Color3(0.68, 0.48, 0.32), 0.245);
  b.worldVolumes.push({
    id: 'main-sand-pit', label: 'Sand Pit', kind: 'modifier',
    footprint: { shape: 'box', centerX: 20, centerZ: -24, halfWidth: 7.5, halfDepth: 6 },
    speedMultiplier: 0.5, disableDodge: true, groundContactOnly: true,
  });
  const log = MeshBuilder.CreateCylinder('main-tutorial-log', { height: 10, diameter: 1.1, tessellation: 12 }, options.scene);
  log.position.set(20, 0.58, -24);
  log.rotation.z = Math.PI / 2;
  log.parent = b.root;
  log.material = options.material('tutorial-log', new Color3(0.34, 0.19, 0.08));
  b.boxCollider('tutorial-log', 20, -24, 10, 1.1, 'traversable', 0.58);
  b.traversalSurfaces.push({ mode: 'free', shape: 'box', id: 'main-tutorial-log-surface', label: 'Tutorial Jump Log', colliderLabel: 'main-tutorial-log', center: new Vector3(20, 0.58, -24), halfWidth: 5, halfDepth: 0.55, surfaceHeight: 0.58, entryPadding: 0.6, exitDistance: 0.75 });
  b.traversalHighlights.push(log);

  // Bridge is flush with both banks.
  b.bridge('river-bridge', -24, -5, 6.5, 13, 0.26);

  // Camp and ferry docks.
  b.ground('small-camp', -8, 11, 23, 17, new Color3(0.42, 0.25, 0.1), 0.12);
  b.ground('ferry-dock-west', 14, 7, 7, 4, new Color3(0.39, 0.24, 0.1), 0.27);
  b.ground('ferry-dock-east', 30, 17, 7, 4, new Color3(0.39, 0.24, 0.1), 0.27);
  b.boxCollider('ferry-dock-west', 14, 7, 7, 4, 'traversable', 0.27);
  b.boxCollider('ferry-dock-east', 30, 17, 7, 4, 'traversable', 0.27);
  b.worldVolumes.push(
    { id: 'main-boat-toll-1', label: 'Boat Toll 1', kind: 'trigger', footprint: { shape: 'box', centerX: 12, centerZ: 7, halfWidth: 1.8, halfDepth: 1.8 }, eventId: 'level-one.boat-toll-1', once: false },
    { id: 'main-boat-toll-2', label: 'Boat Toll 2', kind: 'trigger', footprint: { shape: 'box', centerX: 28, centerZ: 17, halfWidth: 1.8, halfDepth: 1.8 }, eventId: 'level-one.boat-toll-2', once: false },
  );

  // Route cliffs follow the beach/forest boundary but preserve the bridge and
  // ferry openings. Invisible colliders sit behind visible rocks.
  const routeSegments = [
    { x: 3, z: -12, width: 35, depth: 3 },
    { x: 37, z: -12, width: 25, depth: 3 },
  ];
  routeSegments.forEach((segment, index) => {
    b.boxCollider(`route-boundary-${index}`, segment.x, segment.z, segment.width, segment.depth);
    for (let i = 0; i < Math.ceil(segment.width / 5); i += 1) {
      b.rock(`route-rock-${index}-${i}`, segment.x - segment.width / 2 + 2.5 + i * 5, segment.z, 2.5, false);
    }
  });

  const trees: Array<[number, number, number]> = [
    [-42,5,1.1],[-35,14,1],[-32,27,1.2],[-23,23,1],[-18,5,1],[-15,31,1.1],
    [3,28,1.15],[10,24,1],[38,31,1.1],[47,25,1],[54,15,1.2],[56,32,1.1],
  ];
  trees.forEach(([x, z, scale], index) => b.tree(`tree-${index}`, x, z, scale));

  // Wolf den and true level transition portal.
  const den = MeshBuilder.CreateCylinder('main-wolf-den', { diameter: 13, height: 4.5, tessellation: 24 }, options.scene);
  den.position.set(53, 2.25, 34);
  den.scaling.z = 0.7;
  den.parent = b.root;
  den.material = options.material('wolf-den', new Color3(0.34, 0.31, 0.34));
  b.circleCollider('wolf-den', 53, 34, 6.2);
  b.portal('boss-portal', 53, 27);
  b.worldVolumes.push({ id: 'main-boss-portal', label: 'Boss Area Portal', kind: 'trigger', footprint: { shape: 'box', centerX: 53, centerZ: 27, halfWidth: 1.8, halfDepth: 1.8 }, eventId: 'level-one.portal-to-boss', once: false });

  // Playable silhouette. Southern boundary is placed in deep ocean, not at the
  // spawn line. Gaps remain at intended routes.
  b.boxCollider('boundary-west', -58, 0, 4, 96);
  b.boxCollider('boundary-east', 67, 3, 4, 92);
  b.boxCollider('boundary-north', 5, 45, 120, 4);
  b.boxCollider('boundary-south', 5, -69, 120, 4);

  b.landmark('entrance', 'Beach Arrival', 38, -34);
  b.landmark('movement-tutorial', 'Movement Tutorial', 20, -27);
  b.landmark('bridge', 'Crossable Bridge', -24, -8);
  b.landmark('npc-camp', 'Small Camp', -8, 9);
  b.landmark('forest', 'Forest Area', -25, 20);
  b.landmark('wolf-grounds', 'Wolf Grounds', 42, 15);
  b.landmark('wolf-den', 'Wolf Den', 50, 31);
  b.landmark('exit', 'Boss Portal', 53, 27);

  return b.finish();
}
