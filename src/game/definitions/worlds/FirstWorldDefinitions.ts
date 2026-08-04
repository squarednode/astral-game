import type { LevelDefinition, WorldDefinition } from '../../world/levels';

export const firstWorldDefinition: WorldDefinition = {
  id: 'world.verdant-reach',
  displayName: 'Verdant Reach',
  startingLevelId: 'level.verdant-path',
  levelIds: ['level.verdant-path'],
};

/**
 * 0.6.9.1 Level 1 plan: beach tutorial -> river/camp/forest -> wolf den
 * portal -> isolated Wolf Keeper quarry arena.
 */
export const firstLevelDefinition: LevelDefinition = {
  id: 'level.verdant-path',
  worldId: firstWorldDefinition.id,
  displayName: 'The Verdant Path',
  order: 1,
  builderId: 'level-one.blockout.v1',
  defaultSpawnId: 'spawn.beach',
  spawns: [
    { id: 'spawn.beach', displayName: 'Beach Arrival', position: { x: 0, y: 0, z: -37 }, facing: 0 },
    { id: 'spawn.camp', displayName: 'Small Camp', position: { x: -8, y: 0, z: 10 }, facing: 0 },
    { id: 'spawn.wolf-den', displayName: 'Wolf Den', position: { x: 51, y: 0, z: 27 }, facing: Math.PI / 2 },
    { id: 'spawn.boss-arena', displayName: 'Wolf Keeper Quarry', position: { x: 0, y: 0, z: 82 }, facing: 0 },
  ],
  zones: [
    { id: 'zone.beach-arrival', displayName: 'Beach Arrival', role: 'arrival', shape: { type: 'box', center: { x: 0, y: 0, z: -36 }, halfWidth: 20, halfDepth: 8 }, checkpointId: 'checkpoint.entrance', tags: ['intro', 'starter'] },
    { id: 'zone.movement-tutorial', displayName: 'Movement Tutorial', role: 'travel', shape: { type: 'circle', center: { x: 4, y: 0, z: -18 }, radius: 9 }, tags: ['sand', 'jump', 'dodge-disabled'] },
    { id: 'zone.crab-beach', displayName: 'Crab Beach', role: 'encounter', shape: { type: 'box', center: { x: -21, y: 0, z: -24 }, halfWidth: 14, halfDepth: 9 }, tags: ['crab', 'nonaggressive'] },
    { id: 'zone.river-crossing', displayName: 'River Crossing', role: 'travel', shape: { type: 'box', center: { x: -2, y: 0, z: -3 }, halfWidth: 42, halfDepth: 8 }, checkpointId: 'checkpoint.bridge', tags: ['shallow-water', 'deep-water', 'bridge'] },
    { id: 'zone.small-camp', displayName: 'Small Camp', role: 'safe', shape: { type: 'circle', center: { x: -8, y: 0, z: 10 }, radius: 10 }, checkpointId: 'checkpoint.npc-camp', tags: ['quest', 'merchant', 'recruitment'] },
    { id: 'zone.forest-west', displayName: 'Western Forest', role: 'encounter', shape: { type: 'box', center: { x: -25, y: 0, z: 20 }, halfWidth: 19, halfDepth: 18 }, tags: ['wolf', 'nonaggressive'] },
    { id: 'zone.forest-east', displayName: 'Eastern Wolf Grounds', role: 'encounter', shape: { type: 'box', center: { x: 38, y: 0, z: 13 }, halfWidth: 20, halfDepth: 12 }, tags: ['wolf', 'aggressive'] },
    { id: 'zone.wolf-den', displayName: 'Wolf Den', role: 'quest', shape: { type: 'circle', center: { x: 55, y: 0, z: 32 }, radius: 10 }, tags: ['mother-wolf', 'portal-gate'] },
    { id: 'zone.boss-portal', displayName: 'Boss Portal', role: 'transition', shape: { type: 'circle', center: { x: 55, y: 0, z: 28 }, radius: 2.5 }, tags: ['requires-wolf-quest'] },
    { id: 'zone.quarry-entry', displayName: 'Quarry Entry', role: 'arrival', shape: { type: 'box', center: { x: 0, y: 0, z: 82 }, halfWidth: 12, halfDepth: 7 }, tags: ['boss-return-portal'] },
    { id: 'zone.quarry-arena', displayName: 'Wolf Keeper Quarry', role: 'boss', shape: { type: 'box', center: { x: 0, y: 0, z: 105 }, halfWidth: 39, halfDepth: 24 }, encounterIds: ['encounter.movement.elite'], tags: ['aggressive-zone', 'los', 'jump-platforms'] },
  ],
  transitions: [
    { id: 'transition.to-boss-quarry', displayName: 'Enter the Wolf Keeper Quarry', zoneId: 'zone.boss-portal', destinationSpawnId: 'spawn.boss-arena', requiredWorldFlags: ['quest.wolf-problem.completed'] },
  ],
  checkpointIds: ['checkpoint.entrance', 'checkpoint.npc-camp', 'checkpoint.bridge'],
  encounterIds: ['encounter.movement.basic', 'encounter.movement.elite'],
};
