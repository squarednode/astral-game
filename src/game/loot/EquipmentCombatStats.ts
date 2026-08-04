import type { GeneratedItemInstance } from './LootTypes';

export interface EquipmentCombatStats {
  weaponPower: number;
  armor: number;
  maximumHealth: number;
  attack: number;
  criticalChance: number;
  criticalDamage: number;
  cooldownRate: number;
  movementSpeedMultiplier: number;
  statusPotencyMultiplier: number;
  statusResistance: number;
}

/** Converts equipment inventory data into normalized combat-ready values. */
export function resolveEquipmentCombatStats(items: readonly GeneratedItemInstance[]): EquipmentCombatStats {
  let weaponPower = 0;
  let armor = 0;
  let maximumHealth = 0;
  let attack = 0;
  let criticalChance = 0;
  let criticalDamage = 0;
  let cooldownRate = 1;
  let movementSpeedMultiplier = 1;
  let statusPotencyMultiplier = 1;
  let statusResistance = 0;

  for (const item of items) {
    if (item.slot === 'weapon') weaponPower += Math.max(0, item.power ?? 0);
    for (const modifier of item.modifiers ?? []) {
      const value = modifier.value;
      switch (modifier.statId) {
        case 'attack': attack += modifier.mode === 'percent' ? 0 : value; break;
        case 'maximum-health': maximumHealth += modifier.mode === 'percent' ? 0 : value; break;
        case 'armor': armor += modifier.mode === 'percent' ? 0 : value; break;
        case 'precision': criticalChance += value * (modifier.mode === 'percent' ? 1 : 0.005); break;
        case 'technique': criticalDamage += value * (modifier.mode === 'percent' ? 1 : 0.005); break;
        case 'focus': cooldownRate *= modifier.mode === 'percent' ? 1 + value : 1 + value * 0.005; break;
        case 'movement-speed': movementSpeedMultiplier *= modifier.mode === 'percent' ? 1 + value : 1 + value * 0.01; break;
        case 'status-potency': statusPotencyMultiplier *= modifier.mode === 'percent' ? 1 + value : 1 + value * 0.01; break;
        case 'status-resistance': statusResistance += modifier.mode === 'percent' ? value : value * 0.01; break;
        default: break;
      }
    }
  }

  return {
    weaponPower,
    armor: Math.max(0, armor),
    maximumHealth,
    attack,
    criticalChance: Math.max(0, Math.min(0.5, criticalChance)),
    criticalDamage: Math.max(0, criticalDamage),
    cooldownRate: Math.max(0.1, cooldownRate),
    movementSpeedMultiplier: Math.max(0.1, movementSpeedMultiplier),
    statusPotencyMultiplier: Math.max(0.1, statusPotencyMultiplier),
    statusResistance: Math.max(0, Math.min(0.8, statusResistance)),
  };
}
