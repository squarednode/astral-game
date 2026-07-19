export type ItemRarity = 'common' | 'magic' | 'rare' | 'legendary';
export type ItemSlot = 'weapon' | 'armor' | 'relic';
export type ItemFamily = 'fortified' | 'agile' | 'focused';
export type ItemTag = string;

export type EquipmentStatId =
  | 'power'
  | 'attack'
  | 'maximum-health'
  | 'swap-damage'
  | 'focus'
  | 'precision'
  | 'technique'
  | 'armor'
  | 'movement-speed'
  | 'status-potency'
  | 'status-resistance';

export interface EquipmentStatModifier {
  statId: EquipmentStatId;
  mode: 'flat' | 'percent';
  value: number;
  sourceId?: string;
}

export type EquipmentEffectId =
  | 'all-damage'
  | 'fire-damage'
  | 'frost-damage'
  | 'lightning-damage'
  | 'status-duration'
  | 'burn-duration'
  | 'chill-duration'
  | 'ability-cooldown-rate'
  | 'swap-cooldown-rate'
  | 'projectile-count'
  | 'projectile-speed'
  | 'shield-duration';

export interface EquipmentEffectModifier {
  effectId: EquipmentEffectId;
  mode: 'flat' | 'percent';
  value: number;
  abilityId?: string;
  statusId?: string;
  sourceId?: string;
}

export interface EquipmentEffectSnapshot {
  allDamageMultiplier: number;
  elementalDamageMultipliers: Readonly<Record<'fire' | 'frost' | 'lightning', number>>;
  statusDurationMultiplier: number;
  statusDurationById: Readonly<Record<string, number>>;
  abilityCooldownRate: number;
  swapCooldownRate: number;
  projectileCountBonus: number;
  projectileSpeedMultiplier: number;
  shieldDurationMultiplier: number;
}

export interface ItemBaseDefinition {
  id: string;
  name: string;
  slot: ItemSlot;
  family: ItemFamily;
  minimumLevel: number;
  tags: readonly ItemTag[];
  basePower: number;
  baseModifiers: readonly EquipmentStatModifier[];
  baseEffects?: readonly EquipmentEffectModifier[];
  allowedAffixTags?: readonly string[];
  uniquePowerId?: string;
  visualProfileId?: string;
}

export interface ItemAffixDefinition {
  id: string;
  name: string;
  position: 'prefix' | 'suffix';
  tags: readonly string[];
  minimumLevel: number;
  weight: number;
  modifiers: readonly EquipmentStatModifier[];
  effects?: readonly EquipmentEffectModifier[];
}

export interface LegendaryPowerDefinition {
  id: string;
  name: string;
  description: string;
  tags: readonly string[];
}

export interface LootTableEntry {
  itemDefinitionId: string;
  weight: number;
  minimumLevel?: number;
  maximumLevel?: number;
}

export interface LootTableDefinition {
  id: string;
  rolls: number;
  noDropWeight: number;
  entries: readonly LootTableEntry[];
  rarityWeights: Readonly<Record<ItemRarity, number>>;
  guaranteedRarity?: ItemRarity;
}

export interface GeneratedItemInstance {
  id: number;
  instanceId: number;
  definitionId: string;
  name: string;
  rarity: ItemRarity;
  itemLevel: number;
  power: number;
  family: ItemFamily;
  slot: ItemSlot;
  tags: ItemTag[];
  affixIds: string[];
  modifiers: EquipmentStatModifier[];
  effects: EquipmentEffectModifier[];
  favorite: boolean;
  visualProfileId?: string;
  legendaryPowerId?: string;
  legendaryPower?: string;

  // Compatibility fields consumed by the existing party screen.
  attackBonus: number;
  maxHpBonus: number;
  swapBonus: number;
  focus: number;
  precision: number;
  technique: number;
  armor: number;
  movementSpeedPercent: number;
  statusPotencyPercent: number;
  statusResistancePercent: number;
  effectDescriptions: string[];
}

export interface EquipmentStatSnapshot {
  power: number;
  attack: number;
  maximumHealth: number;
  swapDamage: number;
  focus: number;
  precision: number;
  technique: number;
  armor: number;
  movementSpeedPercent: number;
  statusPotencyPercent: number;
  statusResistancePercent: number;
}

export interface LootGenerationContext {
  itemLevel: number;
  elite?: boolean;
  boss?: boolean;
  forcedRarity?: ItemRarity;
  random?: () => number;
}
