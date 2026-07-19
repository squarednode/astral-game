import type { LootTableDefinition } from '../../loot';

const STANDARD_RARITIES = {
  common: 68,
  magic: 24,
  rare: 7,
  legendary: 1,
} as const;

export const lootTableDefinitions: readonly LootTableDefinition[] = [
  {
    id: 'loot.wolf',
    rolls: 1,
    noDropWeight: 58,
    rarityWeights: STANDARD_RARITIES,
    entries: [
      { itemDefinitionId: 'item.weapon.bone-blade', weight: 24 },
      { itemDefinitionId: 'item.armor.leather', weight: 12 },
      { itemDefinitionId: 'item.relic.wolf-fang', weight: 6, minimumLevel: 2 },
    ],
  },
  {
    id: 'loot.crab',
    rolls: 1,
    noDropWeight: 62,
    rarityWeights: STANDARD_RARITIES,
    entries: [
      { itemDefinitionId: 'item.weapon.crab-claw', weight: 22 },
      { itemDefinitionId: 'item.armor.carcass', weight: 16 },
    ],
  },
  {
    id: 'loot.standard-enemy',
    rolls: 1,
    noDropWeight: 55,
    rarityWeights: STANDARD_RARITIES,
    entries: [
      { itemDefinitionId: 'item.weapon.bone-blade', weight: 15 },
      { itemDefinitionId: 'item.armor.leather', weight: 15 },
      { itemDefinitionId: 'item.relic.wolf-fang', weight: 10 },
      { itemDefinitionId: 'item.relic.astral-loop', weight: 5, minimumLevel: 3 },
    ],
  },
  {
    id: 'loot.elite',
    rolls: 1,
    noDropWeight: 0,
    rarityWeights: {
      common: 20,
      magic: 42,
      rare: 30,
      legendary: 8,
    },
    entries: [
      { itemDefinitionId: 'item.weapon.bone-blade', weight: 15 },
      { itemDefinitionId: 'item.weapon.crude-bow', weight: 15, minimumLevel: 2 },
      { itemDefinitionId: 'item.armor.leather', weight: 15 },
      { itemDefinitionId: 'item.relic.wolf-fang', weight: 15 },
      { itemDefinitionId: 'item.relic.astral-loop', weight: 10, minimumLevel: 3 },
    ],
  },
  {
    id: 'loot.wolf-keeper',
    rolls: 2,
    noDropWeight: 0,
    guaranteedRarity: 'legendary',
    rarityWeights: {
      common: 0,
      magic: 0,
      rare: 0,
      legendary: 1,
    },
    entries: [
      { itemDefinitionId: 'item.weapon.crude-bow', weight: 1 },
      { itemDefinitionId: 'item.relic.astral-loop', weight: 1 },
    ],
  },
];
