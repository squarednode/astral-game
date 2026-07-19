import type {
  EquipmentEffectModifier,
  EquipmentEffectSnapshot,
  GeneratedItemInstance,
} from './LootTypes';

const EMPTY_ELEMENTAL = {
  fire: 1,
  frost: 1,
  lightning: 1,
} as const;

export function resolveEquipmentEffects(
  items: readonly GeneratedItemInstance[],
): EquipmentEffectSnapshot {
  let allDamageMultiplier = 1;
  const elementalDamageMultipliers = { ...EMPTY_ELEMENTAL };
  let statusDurationMultiplier = 1;
  const statusDurationById: Record<string, number> = {};
  let abilityCooldownRate = 1;
  let swapCooldownRate = 1;
  let projectileCountBonus = 0;
  let projectileSpeedMultiplier = 1;
  let shieldDurationMultiplier = 1;

  for (const item of items) {
    for (const effect of item.effects ?? []) {
      const factor = effect.mode === 'percent' ? 1 + effect.value : effect.value;
      switch (effect.effectId) {
        case 'all-damage':
          allDamageMultiplier *= factor;
          break;
        case 'fire-damage':
        case 'frost-damage':
        case 'lightning-damage': {
          const element = effect.effectId.replace('-damage', '') as
            | 'fire'
            | 'frost'
            | 'lightning';
          elementalDamageMultipliers[element] *= factor;
          break;
        }
        case 'status-duration':
          statusDurationMultiplier *= factor;
          break;
        case 'burn-duration':
          statusDurationById['status.burn'] =
            (statusDurationById['status.burn'] ?? 1) * factor;
          break;
        case 'chill-duration':
          statusDurationById['status.chill'] =
            (statusDurationById['status.chill'] ?? 1) * factor;
          break;
        case 'ability-cooldown-rate':
          abilityCooldownRate *= factor;
          break;
        case 'swap-cooldown-rate':
          swapCooldownRate *= factor;
          break;
        case 'projectile-count':
          projectileCountBonus += Math.round(effect.value);
          break;
        case 'projectile-speed':
          projectileSpeedMultiplier *= factor;
          break;
        case 'shield-duration':
          shieldDurationMultiplier *= factor;
          break;
      }
    }
  }

  return {
    allDamageMultiplier,
    elementalDamageMultipliers,
    statusDurationMultiplier,
    statusDurationById,
    abilityCooldownRate: Math.max(0.1, abilityCooldownRate),
    swapCooldownRate: Math.max(0.1, swapCooldownRate),
    projectileCountBonus,
    projectileSpeedMultiplier: Math.max(0.1, projectileSpeedMultiplier),
    shieldDurationMultiplier: Math.max(0.1, shieldDurationMultiplier),
  };
}

export function describeEquipmentEffect(
  effect: EquipmentEffectModifier,
): string {
  const percent = `${effect.value >= 0 ? '+' : ''}${Math.round(effect.value * 100)}%`;
  const flat = `${effect.value >= 0 ? '+' : ''}${effect.value}`;
  switch (effect.effectId) {
    case 'all-damage': return `${percent} All Damage`;
    case 'fire-damage': return `${percent} Fire Damage`;
    case 'frost-damage': return `${percent} Frost Damage`;
    case 'lightning-damage': return `${percent} Lightning Damage`;
    case 'status-duration': return `${percent} Status Duration`;
    case 'burn-duration': return `${percent} Burn Duration`;
    case 'chill-duration': return `${percent} Chill Duration`;
    case 'ability-cooldown-rate': return `${percent} Cooldown Recovery`;
    case 'swap-cooldown-rate': return `${percent} Swap Cooldown Recovery`;
    case 'projectile-count': return `${flat} Projectile${Math.abs(effect.value) === 1 ? '' : 's'}`;
    case 'projectile-speed': return `${percent} Projectile Speed`;
    case 'shield-duration': return `${percent} Shield Duration`;
  }
}
