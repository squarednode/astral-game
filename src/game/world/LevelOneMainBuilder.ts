import { Color3, MeshBuilder } from '@babylonjs/core';
import type { OutdoorZoneBuildOptions } from './OutdoorZoneBuilder';
import type { LevelInstance } from './LevelInstanceSystem';
import { buildDeterministicMap, finishDeterministicMap } from './DeterministicMap';
import { LEVEL_ONE_MAIN_MAP } from './LevelOneDeterministicMaps';

export function buildLevelOneMain(options: OutdoorZoneBuildOptions): LevelInstance {
  const result = buildDeterministicMap(LEVEL_ONE_MAIN_MAP, options);
  const b = result.builder;

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
    center: log.position.clone(),
    halfWidth: 5,
    halfDepth: 0.55,
    surfaceHeight: 0.58,
    entryPadding: 0.6,
    exitDistance: 0.75,
  });
  b.traversalHighlights.push(log);

  b.ground('small-camp', -8, 13, 23, 17, new Color3(0.42, 0.25, 0.1), 0.255);
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
      footprint: { shape: 'box', centerX: 24, centerZ: 24, halfWidth: 2.2, halfDepth: 2.2 },
      eventId: 'level-one.boat-toll-2',
      once: false,
    },
  );

  const trees: Array<[number, number, number]> = [
    [-42, 5, 1.1], [-35, 14, 1], [-32, 27, 1.2], [-23, 23, 1], [-18, 8, 1], [-15, 31, 1.1],
    [3, 31, 1.15], [10, 28, 1], [38, 31, 1.1], [47, 25, 1], [54, 15, 1.2], [56, 38, 1.1],
  ];
  trees.forEach(([x, z, scale], index) => b.tree(`tree-${index}`, x, z, scale));

  const den = MeshBuilder.CreateCylinder(
    'main-wolf-den',
    { diameter: 13, height: 4.5, tessellation: 24 },
    options.scene,
  );
  den.position.set(53, 2.25, 36);
  den.scaling.z = 0.7;
  den.parent = b.root;
  den.material = options.material('wolf-den', new Color3(0.34, 0.31, 0.34));
  b.circleCollider('wolf-den', 53, 36, 6.2);

  b.portal('boss-portal', 53, 27);
  b.worldVolumes.push({
    id: 'main-boss-portal',
    label: 'Boss Area Portal',
    kind: 'trigger',
    footprint: { shape: 'box', centerX: 53, centerZ: 27, halfWidth: 3.5, halfDepth: 3.5 },
    eventId: 'level-one.portal-to-boss',
    once: false,
  });

  b.landmark('entrance', 'Beach Arrival', 38, -25);
  b.landmark('movement-tutorial', 'Movement Tutorial', 20, -23);
  b.landmark('bridge', 'Crossable Bridge', -28, -2);
  b.landmark('npc-camp', 'Small Camp', -8, 13);
  b.landmark('forest', 'Forest Area', -25, 20);
  b.landmark('wolf-grounds', 'Wolf Grounds', 42, 15);
  b.landmark('wolf-den', 'Wolf Den', 53, 36);
  b.landmark('exit', 'Boss Portal', 53, 27);

  return finishDeterministicMap(result);
}
