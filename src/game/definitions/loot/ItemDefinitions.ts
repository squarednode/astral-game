import type {
  ItemBaseDefinition,
  LegendaryPowerDefinition,
} from '../../loot';

export const itemDefinitions: readonly ItemBaseDefinition[] = [
  {
    id: 'item.weapon.bone-blade',
    name: 'Bone Blade',
    slot: 'weapon',
    family: 'agile',
    minimumLevel: 1,
    tags: ['weapon', 'melee', 'bone'],
    allowedAffixTags: ['weapon', 'melee'],
    basePower: 6,
    visualProfileId: 'loot.weapon.bone-blade',
    baseModifiers: [
      { statId: 'attack', mode: 'flat', value: 2 },
      { statId: 'precision', mode: 'flat', value: 1 },
    ],
  },
  {
    id: 'item.weapon.crab-claw',
    name: 'Crab Claw',
    slot: 'weapon',
    family: 'fortified',
    minimumLevel: 1,
    tags: ['weapon', 'melee', 'carapace'],
    allowedAffixTags: ['weapon', 'melee'],
    basePower: 5,
    visualProfileId: 'loot.weapon.crab-claw',
    baseModifiers: [
      { statId: 'attack', mode: 'flat', value: 1.5 },
      { statId: 'armor', mode: 'flat', value: 1 },
    ],
  },
  {
    id: 'item.weapon.crude-bow',
    name: 'Crude Bow',
    slot: 'weapon',
    family: 'focused',
    minimumLevel: 2,
    tags: ['weapon', 'ranged', 'bow'],
    allowedAffixTags: ['weapon', 'ranged'],
    basePower: 8,
    visualProfileId: 'loot.weapon.crude-bow',
    baseModifiers: [
      { statId: 'attack', mode: 'flat', value: 2 },
      { statId: 'focus', mode: 'flat', value: 2 },
    ],
    baseEffects: [
      { effectId: 'projectile-speed', mode: 'percent', value: 0.08 },
    ],
    uniquePowerId: 'legendary.wolfkeeper-bow',
  },
  {
    id: 'item.armor.leather',
    name: 'Leather Armor',
    slot: 'armor',
    family: 'fortified',
    minimumLevel: 1,
    tags: ['armor', 'leather'],
    allowedAffixTags: ['armor'],
    basePower: 6,
    baseModifiers: [
      { statId: 'maximum-health', mode: 'flat', value: 4 },
      { statId: 'armor', mode: 'flat', value: 1 },
    ],
  },
  {
    id: 'item.armor.carcass',
    name: 'Carcass Armor',
    slot: 'armor',
    family: 'fortified',
    minimumLevel: 1,
    tags: ['armor', 'carapace'],
    allowedAffixTags: ['armor'],
    basePower: 5,
    baseModifiers: [
      { statId: 'maximum-health', mode: 'flat', value: 3 },
      { statId: 'status-resistance', mode: 'percent', value: 0.02 },
    ],
  },
  {
    id: 'item.relic.wolf-fang',
    name: 'Wolf Fang',
    slot: 'relic',
    family: 'agile',
    minimumLevel: 2,
    tags: ['relic', 'wolf'],
    allowedAffixTags: ['relic'],
    basePower: 7,
    baseModifiers: [
      { statId: 'swap-damage', mode: 'flat', value: 2 },
      { statId: 'technique', mode: 'flat', value: 1 },
    ],
  },
  {
    id: 'item.relic.astral-loop',
    name: 'Astral Loop',
    slot: 'relic',
    family: 'focused',
    minimumLevel: 3,
    tags: ['relic', 'astral'],
    allowedAffixTags: ['relic'],
    basePower: 10,
    visualProfileId: 'loot.relic.astral-loop',
    baseModifiers: [
      { statId: 'focus', mode: 'flat', value: 2 },
      { statId: 'status-potency', mode: 'percent', value: 0.05 },
    ],
    baseEffects: [
      { effectId: 'swap-cooldown-rate', mode: 'percent', value: 0.12 },
      { effectId: 'status-duration', mode: 'percent', value: 0.1 },
    ],
    uniquePowerId: 'legendary.frost-trail',
  },
];

export const legendaryPowerDefinitions: readonly LegendaryPowerDefinition[] = [
  {
    id: 'legendary.frost-trail',
    name: 'Frozen Departure',
    description: 'Swapping out leaves a frost trail.',
    tags: ['swap', 'frost', 'status'],
  },
  {
    id: 'legendary.wolfkeeper-bow',
    name: 'Keeper’s Mark',
    description: 'Ranged attacks against status-affected targets deal increased damage.',
    tags: ['ranged', 'status', 'boss-drop'],
  },
];
