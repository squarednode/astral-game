import type { ItemAffixDefinition } from '../../loot';

export const itemAffixDefinitions: readonly ItemAffixDefinition[] = [
  {
    id: 'affix.prefix.jagged',
    name: 'Jagged',
    position: 'prefix',
    tags: ['weapon', 'melee'],
    minimumLevel: 1,
    weight: 10,
    modifiers: [{ statId: 'attack', mode: 'flat', value: 1 }],
  },
  {
    id: 'affix.prefix.hunters',
    name: "Hunter's",
    position: 'prefix',
    tags: ['weapon', 'ranged'],
    minimumLevel: 1,
    weight: 10,
    modifiers: [
      { statId: 'precision', mode: 'flat', value: 2 },
      { statId: 'attack', mode: 'flat', value: 0.5 },
    ],
  },
  {
    id: 'affix.prefix.reinforced',
    name: 'Reinforced',
    position: 'prefix',
    tags: ['armor'],
    minimumLevel: 1,
    weight: 10,
    modifiers: [
      { statId: 'maximum-health', mode: 'flat', value: 3 },
      { statId: 'armor', mode: 'flat', value: 1 },
    ],
  },
  {
    id: 'affix.prefix.runed',
    name: 'Runed',
    position: 'prefix',
    tags: ['relic'],
    minimumLevel: 2,
    weight: 8,
    modifiers: [
      { statId: 'focus', mode: 'flat', value: 2 },
      { statId: 'status-potency', mode: 'percent', value: 0.04 },
    ],
  },
  {
    id: 'affix.suffix.of-vigor',
    name: 'of Vigor',
    position: 'suffix',
    tags: ['weapon', 'armor', 'relic'],
    minimumLevel: 1,
    weight: 10,
    modifiers: [{ statId: 'maximum-health', mode: 'flat', value: 2 }],
  },
  {
    id: 'affix.suffix.of-swiftness',
    name: 'of Swiftness',
    position: 'suffix',
    tags: ['weapon', 'relic'],
    minimumLevel: 2,
    weight: 8,
    modifiers: [
      { statId: 'technique', mode: 'flat', value: 2 },
      { statId: 'movement-speed', mode: 'percent', value: 0.03 },
    ],
  },
  {
    id: 'affix.suffix.of-warding',
    name: 'of Warding',
    position: 'suffix',
    tags: ['armor', 'relic'],
    minimumLevel: 2,
    weight: 8,
    modifiers: [{ statId: 'status-resistance', mode: 'percent', value: 0.05 }],
  },
];
