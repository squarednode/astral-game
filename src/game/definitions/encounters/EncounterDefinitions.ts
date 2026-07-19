import type {
  EncounterArenaDefinition,
  EncounterDefinition,
} from '../../encounters';

const arena = (
  id: string,
  displayName: string,
  x: number,
  z: number,
): EncounterArenaDefinition => ({
  id,
  displayName,
  center: { x, y: 0, z },
  radius: 11,
  triggerRadius: 6.5,
  boundaryPolicy: 'hard',
  playerEntry: { x, y: 0, z: z - 8 },
  playerReturn: { x: 0, y: 0, z: 33 },
  spawnPoints: [
    { id: `${id}.ground.north`, position: { x, y: 0, z: z + 6 }, tags: ['ground', 'north'] },
    { id: `${id}.ground.south`, position: { x, y: 0, z: z - 5 }, tags: ['ground', 'south'] },
    { id: `${id}.ground.east`, position: { x: x + 6, y: 0, z }, tags: ['ground', 'east'] },
    { id: `${id}.ground.west`, position: { x: x - 6, y: 0, z }, tags: ['ground', 'west'] },
    { id: `${id}.ranged.ne`, position: { x: x + 7, y: 0, z: z + 5 }, tags: ['ground', 'ranged', 'north'] },
    { id: `${id}.ranged.nw`, position: { x: x - 7, y: 0, z: z + 5 }, tags: ['ground', 'ranged', 'north'] },
    { id: `${id}.elite`, position: { x, y: 0, z: z + 8 }, tags: ['ground', 'elite', 'north'] },
  ],
});

export const encounterArenaDefinitions: readonly EncounterArenaDefinition[] = [
  arena('arena.movement.basic', 'Basic Skirmish Pad', 15, 40),
  arena('arena.movement.mixed', 'Mixed Formation Pad', 15, 56),
  arena('arena.movement.reinforcement', 'Reinforcement Pad', 15, 72),
  arena('arena.movement.traversal', 'Traversal Pad', 15, 88),
  arena('arena.movement.elite', 'Elite Trial Pad', 15, 104),
];

export const encounterDefinitions: readonly EncounterDefinition[] = [
  {
    id: 'encounter.movement.basic',
    displayName: 'Movement Trial I: Basic Skirmish',
    arenaId: 'arena.movement.basic',
    activation: 'trigger',
    spawnGroups: [
      {
        id: 'basic.wolves',
        formation: 'arc',
        entries: [
          { enemyDefinitionId: 'enemy.wolf', quantity: 3, spawnPointTags: ['ground'] },
        ],
      },
    ],
    phases: [
      { id: 'phase.basic', displayName: 'Skirmish', spawnGroupIds: ['basic.wolves'] },
    ],
    rewards: {
      copper: 20,
      worldFlags: { 'encounter.movement.basic.completed': true },
    },
    resetPolicy: { repeatable: true, preserveCollectedLoot: true },
  },
  {
    id: 'encounter.movement.mixed',
    displayName: 'Movement Trial II: Mixed Formation',
    arenaId: 'arena.movement.mixed',
    activation: 'trigger',
    spawnGroups: [
      {
        id: 'mixed.frontline',
        entries: [
          { enemyDefinitionId: 'enemy.grunt', quantity: 2, spawnPointTags: ['ground'] },
        ],
      },
      {
        id: 'mixed.ranged',
        spawnDelaySeconds: 0.45,
        entries: [
          { enemyDefinitionId: 'enemy.archer', quantity: 2, spawnPointTags: ['ranged'] },
        ],
      },
      {
        id: 'mixed.elite',
        entries: [
          { enemyDefinitionId: 'enemy.brute', quantity: 1, elite: true, modifierId: 'heavy', spawnPointTags: ['elite'] },
          { enemyDefinitionId: 'enemy.grunt', quantity: 2, spawnPointTags: ['ground'] },
        ],
      },
    ],
    phases: [
      { id: 'phase.frontline', displayName: 'Front Line', spawnGroupIds: ['mixed.frontline'], transitionDelaySeconds: 1.4 },
      { id: 'phase.ranged', displayName: 'Crossfire', spawnGroupIds: ['mixed.frontline', 'mixed.ranged'], transitionDelaySeconds: 1.6 },
      { id: 'phase.elite', displayName: 'Elite Push', spawnGroupIds: ['mixed.elite'] },
    ],
    rewards: {
      copper: 45,
      guaranteedRarity: 'rare',
      worldFlags: { 'encounter.movement.mixed.completed': true },
    },
    resetPolicy: { repeatable: true, preserveCollectedLoot: true },
  },
  {
    id: 'encounter.movement.reinforcement',
    displayName: 'Movement Trial III: Reinforcements',
    arenaId: 'arena.movement.reinforcement',
    activation: 'trigger',
    spawnGroups: [
      {
        id: 'reinforcement.initial',
        entries: [
          { enemyDefinitionId: 'enemy.wolf', quantity: 4, spawnPointTags: ['ground'] },
        ],
      },
      {
        id: 'reinforcement.response',
        entries: [
          { enemyDefinitionId: 'enemy.assassin', quantity: 2, spawnPointTags: ['ground'] },
          { enemyDefinitionId: 'enemy.fire-mage', quantity: 1, spawnPointTags: ['ranged'] },
        ],
      },
    ],
    phases: [
      {
        id: 'phase.hold',
        displayName: 'Hold the Pad',
        spawnGroupIds: ['reinforcement.initial'],
        reinforcements: [
          {
            id: 'reinforcement.alive-two',
            trigger: { type: 'alive-at-most', value: 2 },
            spawnGroupIds: ['reinforcement.response'],
          },
        ],
      },
    ],
    rewards: {
      copper: 50,
      guaranteedRarity: 'rare',
      worldFlags: { 'encounter.movement.reinforcement.completed': true },
    },
    resetPolicy: { repeatable: true, preserveCollectedLoot: true },
  },
  {
    id: 'encounter.movement.traversal',
    displayName: 'Movement Trial IV: Traversal Pressure',
    arenaId: 'arena.movement.traversal',
    activation: 'manual',
    spawnGroups: [
      {
        id: 'traversal.mixed',
        entries: [
          { enemyDefinitionId: 'enemy.assassin', quantity: 2, spawnPointTags: ['ground'] },
          { enemyDefinitionId: 'enemy.frost-caster', quantity: 2, spawnPointTags: ['ranged'] },
          { enemyDefinitionId: 'enemy.brute', quantity: 1, spawnPointTags: ['elite'] },
        ],
      },
    ],
    phases: [
      { id: 'phase.traversal', displayName: 'Traversal Pressure', spawnGroupIds: ['traversal.mixed'] },
    ],
    rewards: {
      copper: 55,
      worldFlags: { 'encounter.movement.traversal.completed': true },
    },
    resetPolicy: { repeatable: true, preserveCollectedLoot: true },
  },
  {
    id: 'encounter.movement.elite',
    displayName: 'Movement Trial V: Elite Preview',
    arenaId: 'arena.movement.elite',
    activation: 'manual',
    spawnGroups: [
      {
        id: 'elite.adds',
        entries: [
          { enemyDefinitionId: 'enemy.grunt', quantity: 2, spawnPointTags: ['ground'] },
        ],
      },
      {
        id: 'elite.leader',
        entries: [
          { enemyDefinitionId: 'enemy.mother-wolf', quantity: 1, elite: true, variantId: 'astral', modifierId: 'none', spawnPointTags: ['elite'] },
        ],
      },
    ],
    phases: [
      { id: 'phase.adds', displayName: 'Opening Pack', spawnGroupIds: ['elite.adds'], transitionDelaySeconds: 1.2 },
      { id: 'phase.leader', displayName: 'Elite Leader', spawnGroupIds: ['elite.leader'] },
    ],
    rewards: {
      copper: 75,
      guaranteedRarity: 'rare',
      worldFlags: { 'encounter.movement.elite.completed': true },
    },
    resetPolicy: { repeatable: true, preserveCollectedLoot: true },
  },
];
