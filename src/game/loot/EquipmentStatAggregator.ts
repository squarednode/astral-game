import type {
  EquipmentStatModifier,
  EquipmentStatSnapshot,
  GeneratedItemInstance,
} from './LootTypes';

const EMPTY: EquipmentStatSnapshot = {
  power: 0,
  attack: 0,
  maximumHealth: 0,
  swapDamage: 0,
  focus: 0,
  precision: 0,
  technique: 0,
  armor: 0,
  movementSpeedPercent: 0,
  statusPotencyPercent: 0,
  statusResistancePercent: 0,
};

export function aggregateEquipmentStats(
  items: readonly GeneratedItemInstance[],
): EquipmentStatSnapshot {
  const result = { ...EMPTY };

  for (const item of items) {
    for (const modifier of item.modifiers) {
      applyModifier(result, modifier);
    }
  }

  return result;
}

function applyModifier(
  target: EquipmentStatSnapshot,
  modifier: EquipmentStatModifier,
): void {
  switch (modifier.statId) {
    case 'power':
      target.power += modifier.value;
      break;
    case 'attack':
      target.attack += modifier.value;
      break;
    case 'maximum-health':
      target.maximumHealth += modifier.value;
      break;
    case 'swap-damage':
      target.swapDamage += modifier.value;
      break;
    case 'focus':
      target.focus += modifier.value;
      break;
    case 'precision':
      target.precision += modifier.value;
      break;
    case 'technique':
      target.technique += modifier.value;
      break;
    case 'armor':
      target.armor += modifier.value;
      break;
    case 'movement-speed':
      target.movementSpeedPercent += modifier.value;
      break;
    case 'status-potency':
      target.statusPotencyPercent += modifier.value;
      break;
    case 'status-resistance':
      target.statusResistancePercent += modifier.value;
      break;
  }
}
