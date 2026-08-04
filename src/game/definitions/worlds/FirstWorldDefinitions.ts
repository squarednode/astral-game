import type { LevelDefinition, WorldDefinition } from '../../world/levels';

export const firstWorldDefinition: WorldDefinition = {
  id: 'world.verdant-reach',
  displayName: 'Verdant Reach',
  startingLevelId: 'level.verdant-path',
  levelIds: ['level.verdant-path'],
};

export const firstLevelDefinition: LevelDefinition = {
  id: 'level.verdant-path',
  worldId: firstWorldDefinition.id,
  displayName: 'The Verdant Path',
  order: 1,
  builderId: 'outdoor-zone.v1',
  defaultSpawnId: 'spawn.entrance',
  spawns: [
    { id: 'spawn.entrance', displayName: 'South Road', position: { x: 0, y: 0, z: -22 }, facing: 0 },
    { id: 'spawn.camp', displayName: 'Wayfarer Camp', position: { x: -3, y: 0, z: 9 }, facing: 0 },
    { id: 'spawn.bridge', displayName: 'Old Bridge', position: { x: 5, y: 0, z: 4 }, facing: 0 },
    { id: 'spawn.exit', displayName: 'North Gate', position: { x: 0, y: 0, z: 23 }, facing: Math.PI },
  ],
  zones: [
    { id: 'zone.arrival', displayName: 'South Road', role: 'arrival', shape: { type: 'circle', center: { x: 0, y: 0, z: -22 }, radius: 6 }, checkpointId: 'checkpoint.entrance', tags: ['intro'] },
    { id: 'zone.fallen-path', displayName: 'Fallen Timber Path', role: 'travel', shape: { type: 'box', center: { x: 0, y: 0, z: -13 }, halfWidth: 8, halfDepth: 5 }, tags: ['traversal'] },
    { id: 'zone.stream', displayName: 'Stream Crossing', role: 'travel', shape: { type: 'box', center: { x: 4, y: 0, z: -2 }, halfWidth: 9, halfDepth: 5 }, tags: ['traversal', 'water'] },
    { id: 'zone.camp', displayName: 'Wayfarer Camp', role: 'safe', shape: { type: 'circle', center: { x: -3, y: 0, z: 9 }, radius: 5 }, checkpointId: 'checkpoint.npc-camp', tags: ['recruitment', 'merchant'] },
    { id: 'zone.bridge', displayName: 'Old Bridge', role: 'quest', shape: { type: 'circle', center: { x: 5, y: 0, z: 4 }, radius: 4.5 }, checkpointId: 'checkpoint.bridge', tags: ['quest'] },
    { id: 'zone.wolf-grounds', displayName: 'Wolf Grounds', role: 'encounter', shape: { type: 'circle', center: { x: 3, y: 0, z: 18 }, radius: 8 }, encounterIds: ['encounter.movement.basic'], tags: ['wolf', 'recruitment'] },
    { id: 'zone.boss-hollow', displayName: 'Mother Wolf Hollow', role: 'boss', shape: { type: 'circle', center: { x: 0, y: 0, z: 23 }, radius: 8.5 }, encounterIds: ['encounter.movement.elite'], tags: ['boss', 'level-finale'] },
    { id: 'zone.north-gate', displayName: 'North Gate', role: 'transition', shape: { type: 'box', center: { x: 0, y: 0, z: 28 }, halfWidth: 5, halfDepth: 2.5 }, checkpointId: 'checkpoint.exit', tags: ['exit'] },
  ],
  transitions: [
    { id: 'transition.north-gate', displayName: 'Continue North', zoneId: 'zone.north-gate', requiredWorldFlags: ['encounter.movement.elite.completed'] },
  ],
  checkpointIds: ['checkpoint.entrance', 'checkpoint.npc-camp', 'checkpoint.bridge', 'checkpoint.exit'],
  encounterIds: ['encounter.movement.basic', 'encounter.movement.elite'],
};
