import type { ItemRarity, ItemSlot } from './LootTypes';

export type LootPrimitive = 'box' | 'blade' | 'bow' | 'armor-bundle' | 'crystal';

export interface GroundLootVisualProfile {
  id: string;
  primitive: LootPrimitive;
  scale: number;
  spinSpeed: number;
  bobHeight: number;
  bobSpeed: number;
  beamHeight: number;
  beamWidth: number;
  modelAssetId?: string;
}

const SLOT_DEFAULTS: Readonly<Record<ItemSlot, GroundLootVisualProfile>> = {
  weapon: {
    id: 'loot.weapon.default',
    primitive: 'blade',
    scale: 1,
    spinSpeed: 0.9,
    bobHeight: 0.08,
    bobSpeed: 2.2,
    beamHeight: 0,
    beamWidth: 0.04,
  },
  armor: {
    id: 'loot.armor.default',
    primitive: 'armor-bundle',
    scale: 1,
    spinSpeed: 0.45,
    bobHeight: 0.06,
    bobSpeed: 1.8,
    beamHeight: 0,
    beamWidth: 0.04,
  },
  relic: {
    id: 'loot.relic.default',
    primitive: 'crystal',
    scale: 1,
    spinSpeed: 1.25,
    bobHeight: 0.11,
    bobSpeed: 2.5,
    beamHeight: 0,
    beamWidth: 0.04,
  },
};


const CUSTOM_PROFILES: Readonly<Record<string, Partial<GroundLootVisualProfile>>> = {
  'loot.weapon.bone-blade': {
    primitive: 'blade',
    scale: 1.05,
  },
  'loot.weapon.crab-claw': {
    primitive: 'armor-bundle',
    scale: 0.85,
  },
  'loot.weapon.crude-bow': {
    primitive: 'bow',
    scale: 1.1,
  },
  'loot.relic.astral-loop': {
    primitive: 'crystal',
    scale: 1.15,
    spinSpeed: 1.6,
    bobHeight: 0.14,
  },
};

const RARITY_BEAMS: Readonly<Record<ItemRarity, number>> = {
  common: 0,
  magic: 1.2,
  rare: 1.8,
  legendary: 3.1,
};

export function groundLootVisualProfile(
  slot: ItemSlot,
  rarity: ItemRarity,
  profileId?: string,
): GroundLootVisualProfile {
  const base = SLOT_DEFAULTS[slot];
  const custom = profileId ? CUSTOM_PROFILES[profileId] : undefined;
  return {
    ...base,
    ...custom,
    id: profileId ?? base.id,
    beamHeight: RARITY_BEAMS[rarity],
    beamWidth: rarity === 'legendary' ? 0.1 : rarity === 'rare' ? 0.075 : 0.055,
  };
}
