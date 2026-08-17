import type { EncounterArenaDefinition, EncounterDefinition } from '../../encounters';

const routeArena = (
  id: string,
  displayName: string,
  x: number,
  z: number,
): EncounterArenaDefinition => ({
  id,
  displayName,
  center: { x, y: 0, z },
  radius: 18,
  triggerRadius: 10,
  boundary: {
    policy: 'grace-reset',
    graceSeconds: 6,
    enemyLeashToArena: true,
    pauseSpawningDuringGrace: true,
  },
  playerEntry: { x, y: 0, z: z - 8 },
  playerReturn: { x, y: 0, z: z - 10 },
  spawnPoints: [
    { id: `${id}.north`, position: { x, y: 0, z: z + 5 }, tags: ['ground', 'north'] },
    { id: `${id}.south`, position: { x, y: 0, z: z - 5 }, tags: ['ground', 'south'] },
    { id: `${id}.east`, position: { x: x + 4, y: 0, z }, tags: ['ground', 'east'] },
    { id: `${id}.west`, position: { x: x - 4, y: 0, z }, tags: ['ground', 'west'] },
    { id: `${id}.center`, position: { x, y: 0, z }, tags: ['ground', 'elite', 'boss'] },
  ],
});

const replenisher = (
  id: string,
  spawnGroupId: string,
  targetAlive: number,
  spawnBudget: number,
) => ({
  id,
  enabled: true,
  stopWhenAnchorDies: false,
  spawnGroupIds: [spawnGroupId],
  targetAlive,
  lowPopulationThreshold: targetAlive - 1,
  emptyWaveDelaySeconds: 10,
  replenishDelaySeconds: 10,
  checkIntervalSeconds: 0.5,
  maximumAlive: targetAlive,
  maximumTotalSpawned: 99,
  spawnBudget,
} as const);

export const levelOneEncounterArenaDefinitions: readonly EncounterArenaDefinition[] = [
  routeArena('arena.level1.crab', 'Crab Training', 138, -25),
  routeArena('arena.level1.wolf-one', 'Wolf Pack I', 188, 75),
  routeArena('arena.level1.wolf-two', 'Wolf Pack II', 188, 125),
  routeArena('arena.level1.wolf-three', 'Wolf Pack III', 238, 125),
  routeArena('arena.level1.mother-wolf', 'Mother Wolf Den', 238, 175),
  routeArena('arena.level1.boss', 'Wolf Keeper Arena', 0, 4),
];

export const levelOneEncounterDefinitions: readonly EncounterDefinition[] = [
  {
    id: 'encounter.level1.crab',
    displayName: 'First Claws',
    arenaId: 'arena.level1.crab',
    activation: 'trigger',
    spawnGroups: [{
      id: 'level1.crab',
      maximumAlive: 3,
      entries: [{ enemyDefinitionId: 'enemy.crab', quantity: 3, spawnPointTags: ['ground'], tags: ['level-1'] }],
    }],
    phases: [{
      id: 'phase.crab',
      displayName: 'Crabs',
      spawnGroupIds: ['level1.crab'],
      reinforcementControllers: [replenisher('level1.crab.replenish', 'level1.crab', 3, 3)],
    }],
    rewards: { copper: 5, worldFlags: { 'encounter.level1.crab.completed': true } },
    resetPolicy: { repeatable: false, preserveCollectedLoot: true },
  },
  {
    id: 'encounter.level1.wolf-one',
    displayName: 'Forest Wolves I',
    arenaId: 'arena.level1.wolf-one',
    activation: 'trigger',
    spawnGroups: [{
      id: 'level1.wolf-one',
      maximumAlive: 3,
      entries: [{ enemyDefinitionId: 'enemy.wolf', quantity: 3, spawnPointTags: ['ground'], tags: ['level-1'] }],
    }],
    phases: [{
      id: 'phase.wolf-one',
      displayName: 'Wolf Pack',
      spawnGroupIds: ['level1.wolf-one'],
      reinforcementControllers: [replenisher('level1.wolf-one.replenish', 'level1.wolf-one', 3, 1)],
    }],
    rewards: { copper: 8, worldFlags: { 'encounter.level1.wolf-one.completed': true } },
    resetPolicy: { repeatable: false, preserveCollectedLoot: true },
  },
  {
    id: 'encounter.level1.wolf-two',
    displayName: 'Forest Wolves II',
    arenaId: 'arena.level1.wolf-two',
    activation: 'trigger',
    spawnGroups: [{
      id: 'level1.wolf-two',
      maximumAlive: 3,
      entries: [{ enemyDefinitionId: 'enemy.wolf', quantity: 3, spawnPointTags: ['ground'], tags: ['level-1'] }],
    }],
    phases: [{
      id: 'phase.wolf-two',
      displayName: 'Corner Pack',
      spawnGroupIds: ['level1.wolf-two'],
      reinforcementControllers: [replenisher('level1.wolf-two.replenish', 'level1.wolf-two', 3, 1)],
    }],
    rewards: { copper: 8, worldFlags: { 'encounter.level1.wolf-two.completed': true } },
    resetPolicy: { repeatable: false, preserveCollectedLoot: true },
  },
  {
    id: 'encounter.level1.wolf-three',
    displayName: 'Forest Wolves III',
    arenaId: 'arena.level1.wolf-three',
    activation: 'trigger',
    spawnGroups: [{
      id: 'level1.wolf-three',
      maximumAlive: 3,
      entries: [{ enemyDefinitionId: 'enemy.wolf', quantity: 3, spawnPointTags: ['ground'], tags: ['level-2'] }],
    }],
    phases: [{
      id: 'phase.wolf-three',
      displayName: 'Veteran Pack',
      spawnGroupIds: ['level1.wolf-three'],
      reinforcementControllers: [replenisher('level1.wolf-three.replenish', 'level1.wolf-three', 3, 1)],
    }],
    rewards: { copper: 12, worldFlags: { 'encounter.level1.wolf-three.completed': true } },
    resetPolicy: { repeatable: false, preserveCollectedLoot: true },
  },
  {
    id: 'encounter.level1.mother-wolf',
    displayName: 'Mother Wolf',
    arenaId: 'arena.level1.mother-wolf',
    activation: 'trigger',
    spawnGroups: [{
      id: 'level1.mother-wolf',
      entries: [{ enemyDefinitionId: 'enemy.mother-wolf', quantity: 1, elite: true, modifierId: 'none', spawnPointTags: ['elite'], tags: ['level-3'] }],
    }],
    phases: [{ id: 'phase.mother-wolf', displayName: 'The Den Mother', spawnGroupIds: ['level1.mother-wolf'] }],
    rewards: { copper: 25, guaranteedRarity: 'magic', worldFlags: { 'encounter.level1.mother-wolf.completed': true } },
    resetPolicy: { repeatable: false, preserveCollectedLoot: true },
  },
  {
    id: 'encounter.level1.boss',
    displayName: 'Wolf Keeper',
    arenaId: 'arena.level1.boss',
    activation: 'manual',
    spawnGroups: [
      {
        id: 'level1.boss-pack',
        entries: [{ enemyDefinitionId: 'enemy.wolf', quantity: 3, spawnPointTags: ['ground'], tags: ['boss-pack'] }],
      },
      {
        id: 'level1.boss',
        entries: [{ enemyDefinitionId: 'enemy.world-boss', quantity: 1, spawnPointTags: ['boss'], tags: ['level-3', 'story-boss'] }],
      },
    ],
    phases: [{ id: 'phase.boss', displayName: 'Wolf Keeper and Pack', spawnGroupIds: ['level1.boss-pack', 'level1.boss'] }],
    rewards: { copper: 100, guaranteedRarity: 'rare', worldFlags: { 'level-one.boss-defeated': true } },
    resetPolicy: { repeatable: false, preserveCollectedLoot: true },
  },
];
