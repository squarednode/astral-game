import { Color3, Mesh, MeshBuilder, Vector3 } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import { LevelInstanceBuilder } from './LevelInstanceBuilderSupport';
import { LEVEL_ONE_LAYOUT } from './LevelOneLayout';

const WATER_COLOR = new Color3(0.03, 0.43, 0.72);

function buildRiverRibbon(
  b: LevelInstanceBuilder,
  options: OutdoorZoneBuildOptions,
): void {
  const centerline = LEVEL_ONE_LAYOUT.river.centers.map(
    point => new Vector3(point.x, LEVEL_ONE_LAYOUT.elevation.water, point.z),
  );
  const left: Vector3[] = [];
  const right: Vector3[] = [];

  centerline.forEach((point, index) => {
    const previous = centerline[Math.max(0, index - 1)];
    const next = centerline[Math.min(centerline.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dz = next.z - previous.z;
    const length = Math.max(0.001, Math.hypot(dx, dz));
    const normalX = -dz / length;
    const normalZ = dx / length;
    const halfWidth = LEVEL_ONE_LAYOUT.river.halfWidths[index]
      ?? LEVEL_ONE_LAYOUT.river.halfWidths[LEVEL_ONE_LAYOUT.river.halfWidths.length - 1]
      ?? 5;

    left.push(new Vector3(
      point.x + normalX * halfWidth,
      point.y,
      point.z + normalZ * halfWidth,
    ));
    right.push(new Vector3(
      point.x - normalX * halfWidth,
      point.y,
      point.z - normalZ * halfWidth,
    ));
  });

  const river = MeshBuilder.CreateRibbon(
    'main-river',
    {
      pathArray: [left, right],
      sideOrientation: Mesh.DOUBLESIDE,
      closeArray: false,
      closePath: false,
      updatable: false,
    },
    options.scene,
  );
  river.parent = b.root;
  river.material = options.material('level-water', WATER_COLOR, 0.22);
  river.visibility = 1;
  river.isPickable = false;
  river.renderingGroupId = 1;
}

export function buildLevelOneMain(options: OutdoorZoneBuildOptions): LevelInstance {
  const b = new LevelInstanceBuilder('main', options);
  const land = new Color3(0.16, 0.29, 0.14);
  const sand = new Color3(0.72, 0.59, 0.4);

  // Stable blockout shelves. Water is rendered slightly above the shelves so
  // it remains visible even where the authored channel overlaps a land block.
  b.ground('beach-ground', 7, -27, 118, 34, sand, LEVEL_ONE_LAYOUT.elevation.landTop);
  b.ground('forest-ground', 4, 17, 120, 54, land, LEVEL_ONE_LAYOUT.elevation.landTop);

  // The ocean overlaps the southern edge of the beach to create a visible
  // shoreline instead of ending at an invisible wall.
  const ocean = b.water(
    'ocean',
    LEVEL_ONE_LAYOUT.terrain.ocean.x,
    LEVEL_ONE_LAYOUT.terrain.ocean.z,
    LEVEL_ONE_LAYOUT.terrain.ocean.width,
    LEVEL_ONE_LAYOUT.terrain.ocean.depth,
    LEVEL_ONE_LAYOUT.elevation.ocean,
  );
  ocean.material = options.material('level-water', WATER_COLOR, 0.22);
  ocean.visibility = 1;
  ocean.renderingGroupId = 1;

  // River is kept on the western half of the level and finishes near the
  // ferry route. It no longer passes through the wolf den or boss portal.
  buildRiverRibbon(b, options);

  b.worldVolumes.push(
    {
      id: 'main-river-shallow',
      label: 'River Shallows',
      kind: 'modifier',
      footprint: {
        shape: 'box',
        centerX: -18,
        centerZ: 1,
        halfWidth: 34,
        halfDepth: 7,
      },
      speedMultiplier: 0.65,
      groundContactOnly: true,
      maximumY: LEVEL_ONE_LAYOUT.elevation.water + 0.08,
    },
    {
      id: 'main-ocean-shallows',
      label: 'Ocean Shallows',
      kind: 'modifier',
      footprint: {
        shape: 'box',
        centerX: 7,
        centerZ: -46,
        halfWidth: 59,
        halfDepth: 8,
      },
      speedMultiplier: 0.6,
      groundContactOnly: true,
      maximumY: LEVEL_ONE_LAYOUT.elevation.ocean + 0.1,
    },
    {
      id: 'main-ocean-deep',
      label: 'Deep Ocean',
      kind: 'water-hazard',
      footprint: {
        shape: 'box',
        centerX: 7,
        centerZ: -66,
        halfWidth: 59,
        halfDepth: 12,
      },
      speedMultiplier: 0.25,
      drownSeconds: 5,
      disableJump: true,
      disableDodge: true,
      bankAxis: 'z',
      bankCenter: -51,
      recoveryPadding: 0.5,
      maximumY: LEVEL_ONE_LAYOUT.elevation.ocean + 0.1,
    },
  );

  // Movement tutorial.
  b.ground('sand-pit', 20, -23, 15, 12, new Color3(0.68, 0.48, 0.32), 0.255);
  b.worldVolumes.push({
    id: 'main-sand-pit',
    label: 'Sand Pit',
    kind: 'modifier',
    footprint: { shape: 'box', centerX: 20, centerZ: -23, halfWidth: 7.5, halfDepth: 6 },
    speedMultiplier: 0.5,
    disableDodge: true,
    groundContactOnly: true,
  });
  const log = MeshBuilder.CreateCylinder(
    'main-tutorial-log',
    { height: 10, diameter: 1.1, tessellation: 12 },
    options.scene,
  );
  log.position.set(20, 0.58, -23);
  log.rotation.z = Math.PI / 2;
  log.parent = b.root;
  log.material = options.material('tutorial-log', new Color3(0.34, 0.19, 0.08));
  b.boxCollider('tutorial-log', 20, -23, 10, 1.1, 'traversable', 0.58);
  b.traversalSurfaces.push({
    mode: 'free',
    shape: 'box',
    id: 'main-tutorial-log-surface',
    label: 'Tutorial Jump Log',
    colliderLabel: 'main-tutorial-log',
    center: new Vector3(20, 0.58, -23),
    halfWidth: 5,
    halfDepth: 0.55,
    surfaceHeight: 0.58,
    entryPadding: 0.6,
    exitDistance: 0.75,
  });
  b.traversalHighlights.push(log);

  // Bridge is flush with the banks and spans the visible river.
  b.bridge('river-bridge', -27, -2, 7, 14, LEVEL_ONE_LAYOUT.elevation.bridgeTop);

  // Camp and ferry docks.
  b.ground('small-camp', -8, 13, 23, 17, new Color3(0.42, 0.25, 0.1), 0.255);
  b.ground('ferry-dock-west', 10, 16, 8, 5, new Color3(0.39, 0.24, 0.1), 0.27);
  b.ground('ferry-dock-east', 24, 25, 8, 5, new Color3(0.39, 0.24, 0.1), 0.27);
  b.boxCollider('ferry-dock-west', 10, 16, 8, 5, 'traversable', 0.27);
  b.boxCollider('ferry-dock-east', 24, 25, 8, 5, 'traversable', 0.27);
  b.worldVolumes.push(
    {
      id: 'main-boat-toll-1',
      label: 'Boat Toll 1',
      kind: 'trigger',
      footprint: { shape: 'box', centerX: 10, centerZ: 16, halfWidth: 2.2, halfDepth: 2.2 },
      eventId: 'level-one.boat-toll-1',
      once: false,
    },
    {
      id: 'main-boat-toll-2',
      label: 'Boat Toll 2',
      kind: 'trigger',
      footprint: { shape: 'box', centerX: 24, centerZ: 25, halfWidth: 2.2, halfDepth: 2.2 },
      eventId: 'level-one.boat-toll-2',
      once: false,
    },
  );

  // Decorative route rocks only. Previous invisible route colliders closed the
  // path to the wolf den and boss portal, so they have been removed.
  const routeRocks: Array<[number, number, number]> = [
    [31, -9, 2.3], [37, -9, 2.6], [43, -9, 2.2], [49, -9, 2.7], [55, -9, 2.4],
  ];
  routeRocks.forEach(([x, z, radius], index) => b.rock(`route-rock-${index}`, x, z, radius, false));

  const trees: Array<[number, number, number]> = [
    [-42, 5, 1.1], [-35, 14, 1], [-32, 27, 1.2], [-23, 23, 1], [-18, 8, 1], [-15, 31, 1.1],
    [3, 31, 1.15], [10, 28, 1], [38, 31, 1.1], [47, 25, 1], [54, 15, 1.2], [56, 34, 1.1],
  ];
  trees.forEach(([x, z, scale], index) => b.tree(`tree-${index}`, x, z, scale));

  // Wolf den and true level transition portal remain on dry land east of the
  // river. No local collider blocks the approach.
  const den = MeshBuilder.CreateCylinder(
    'main-wolf-den',
    { diameter: 13, height: 4.5, tessellation: 24 },
    options.scene,
  );
  den.position.set(53, 2.25, 34);
  den.scaling.z = 0.7;
  den.parent = b.root;
  den.material = options.material('wolf-den', new Color3(0.34, 0.31, 0.34));
  b.circleCollider('wolf-den', 53, 34, 6.2);
  b.portal('boss-portal', 53, 25);
  b.worldVolumes.push({
    id: 'main-boss-portal',
    label: 'Boss Area Portal',
    kind: 'trigger',
    footprint: { shape: 'box', centerX: 53, centerZ: 25, halfWidth: 2.4, halfDepth: 2.4 },
    eventId: 'level-one.portal-to-boss',
    once: false,
  });

  // Outer limits only. The south wall is placed beyond the deep ocean so the
  // player can enter the shoreline and shallow water normally.
  b.boxCollider('boundary-west', -61, 2, 4, 104);
  b.boxCollider('boundary-east', 69, 2, 4, 104);
  b.boxCollider('boundary-north', 4, 48, 126, 4);
  b.boxCollider('boundary-south', 4, -82, 126, 4);

  b.landmark('entrance', 'Beach Arrival', 38, -25);
  b.landmark('movement-tutorial', 'Movement Tutorial', 20, -23);
  b.landmark('bridge', 'Crossable Bridge', -27, -2);
  b.landmark('npc-camp', 'Small Camp', -8, 13);
  b.landmark('forest', 'Forest Area', -25, 20);
  b.landmark('wolf-grounds', 'Wolf Grounds', 42, 15);
  b.landmark('wolf-den', 'Wolf Den', 50, 31);
  b.landmark('exit', 'Boss Portal', 53, 25);

  return b.finish();
}
