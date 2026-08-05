import type { LevelDefinition, WorldDefinition } from '../../world/levels';

export const firstWorldDefinition: WorldDefinition = {
  id: 'world.verdant-reach',
  displayName: 'Verdant Reach',
  startingLevelId: 'level.verdant-path',
  levelIds: ['level.verdant-path', 'level.wolf-keeper-quarry', 'level.developer-testing'],
};

export const firstLevelDefinition: LevelDefinition = {
  id: 'level.verdant-path',
  worldId: firstWorldDefinition.id,
  displayName: 'The Verdant Path',
  order: 1,
  builderId: 'level-one.main.instance.v1',
  defaultSpawnId: 'spawn.beach',
  spawns: [
    { id: 'spawn.beach', displayName: 'Beach Arrival', position: { x: 38, y: 0.25, z: -25 }, facing: Math.PI },
    { id: 'spawn.camp', displayName: 'Small Camp', position: { x: -8, y: 0.25, z: 13 }, facing: 0 },
    { id: 'spawn.wolf-den', displayName: 'Wolf Den', position: { x: 50, y: 0.25, z: 31 }, facing: Math.PI / 2 },
  ],
  zones: [
    { id: 'zone.beach-arrival', displayName: 'Beach Arrival', role: 'arrival', shape: { type: 'box', center: { x: 38, y: 0, z: -25 }, halfWidth: 22, halfDepth: 11 }, checkpointId: 'checkpoint.entrance', tags: ['intro', 'starter'] },
    { id: 'zone.movement-tutorial', displayName: 'Movement Tutorial', role: 'travel', shape: { type: 'circle', center: { x: 20, y: 0, z: -23 }, radius: 10 }, tags: ['sand', 'jump', 'dodge-disabled'] },
    { id: 'zone.crab-beach', displayName: 'Crab Beach', role: 'encounter', shape: { type: 'box', center: { x: -20, y: 0, z: -28 }, halfWidth: 18, halfDepth: 10 }, tags: ['crab', 'nonaggressive'] },
    { id: 'zone.river-crossing', displayName: 'River Crossing', role: 'travel', shape: { type: 'box', center: { x: -27, y: 0, z: -2 }, halfWidth: 25, halfDepth: 9 }, checkpointId: 'checkpoint.bridge', tags: ['river', 'bridge'] },
    { id: 'zone.small-camp', displayName: 'Small Camp', role: 'safe', shape: { type: 'circle', center: { x: -8, y: 0, z: 13 }, radius: 11 }, checkpointId: 'checkpoint.npc-camp', tags: ['quest', 'merchant', 'recruitment'] },
    { id: 'zone.forest-west', displayName: 'Western Forest', role: 'encounter', shape: { type: 'box', center: { x: -28, y: 0, z: 20 }, halfWidth: 22, halfDepth: 20 }, tags: ['wolf', 'nonaggressive'] },
    { id: 'zone.forest-east', displayName: 'Eastern Wolf Grounds', role: 'encounter', shape: { type: 'box', center: { x: 43, y: 0, z: 17 }, halfWidth: 20, halfDepth: 18 }, tags: ['wolf', 'aggressive'] },
    { id: 'zone.wolf-den', displayName: 'Wolf Den', role: 'quest', shape: { type: 'circle', center: { x: 53, y: 0, z: 34 }, radius: 10 }, tags: ['mother-wolf', 'portal-gate'] },
    { id: 'zone.boss-portal', displayName: 'Boss Portal', role: 'transition', shape: { type: 'circle', center: { x: 53, y: 0, z: 25 }, radius: 3 }, tags: ['requires-wolf-quest'] },
  ],
  transitions: [
    { id: 'transition.to-boss-quarry', displayName: 'Enter the Wolf Keeper Quarry', zoneId: 'zone.boss-portal', destinationLevelId: 'level.wolf-keeper-quarry', destinationSpawnId: 'spawn.quarry-entry', requiredWorldFlags: ['quest.wolf-problem.completed'] },
  ],
  checkpointIds: ['checkpoint.entrance', 'checkpoint.npc-camp', 'checkpoint.bridge'],
  encounterIds: ['encounter.movement.basic'],
};

export const bossLevelDefinition: LevelDefinition = {
  id: 'level.wolf-keeper-quarry',
  worldId: firstWorldDefinition.id,
  displayName: 'Wolf Keeper Quarry',
  order: 2,
  builderId: 'level-one.boss.instance.v1',
  defaultSpawnId: 'spawn.quarry-entry',
  spawns: [
    { id: 'spawn.quarry-entry', displayName: 'Quarry Entry', position: { x: 0, y: 0.25, z: -18 }, facing: 0 },
  ],
  zones: [
    { id: 'zone.quarry-entry', displayName: 'Quarry Entry', role: 'arrival', shape: { type: 'box', center: { x: 0, y: 0, z: -18 }, halfWidth: 12, halfDepth: 8 }, tags: ['return-portal'] },
    { id: 'zone.quarry-arena', displayName: 'Wolf Keeper Quarry', role: 'boss', shape: { type: 'box', center: { x: 0, y: 0, z: 4 }, halfWidth: 39, halfDepth: 23 }, encounterIds: ['encounter.movement.elite'], tags: ['aggressive-zone', 'los', 'jump-platforms'] },
    { id: 'zone.quarry-return', displayName: 'Return Portal', role: 'transition', shape: { type: 'circle', center: { x: 0, y: 0, z: -24 }, radius: 3 }, tags: ['return-main'] },
  ],
  transitions: [
    { id: 'transition.to-verdant-path', displayName: 'Return to the Verdant Path', zoneId: 'zone.quarry-return', destinationLevelId: firstLevelDefinition.id, destinationSpawnId: 'spawn.wolf-den' },
  ],
  checkpointIds: [],
  encounterIds: ['encounter.movement.elite'],
};

export const testingLevelDefinition: LevelDefinition = {
  id: 'level.developer-testing',
  worldId: firstWorldDefinition.id,
  displayName: 'Developer Testing Grounds',
  order: 99,
  builderId: 'level-one.testing.instance.v1',
  defaultSpawnId: 'spawn.testing',
  spawns: [{ id: 'spawn.testing', displayName: 'Testing Grounds', position: { x: 0, y: 0.25, z: -16 }, facing: 0 }],
  zones: [{ id: 'zone.testing', displayName: 'Developer Testing Grounds', role: 'safe', shape: { type: 'box', center: { x: 0, y: 0, z: 0 }, halfWidth: 28, halfDepth: 23 }, tags: ['developer-only'] }],
  transitions: [],
  checkpointIds: [],
  encounterIds: [],
};
