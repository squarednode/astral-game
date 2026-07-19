import type {
  EnemyCombatRole,
  EnemyDefinition,
} from '../definitions/EnemyDefinitions';

export interface EnemyRangePositioningProfile {
  preferredRangeMultiplier: number;
  advanceBufferMultiplier: number;
  retreatBufferMultiplier: number;
  chaseUntilPreferredRange: boolean;
  allowAdvanceWhileCasting: boolean;
}

const MELEE_BASELINE: Readonly<EnemyRangePositioningProfile> = {
  preferredRangeMultiplier: 1,
  advanceBufferMultiplier: 1,
  retreatBufferMultiplier: 0.3,
  chaseUntilPreferredRange: true,
  allowAdvanceWhileCasting: false,
};

const RANGED_BASELINE: Readonly<EnemyRangePositioningProfile> = {
  preferredRangeMultiplier: 0.7,
  advanceBufferMultiplier: 0.65,
  retreatBufferMultiplier: 0.8,
  chaseUntilPreferredRange: true,
  allowAdvanceWhileCasting: false,
};

export const ENEMY_ROLE_POSITIONING: Readonly<
  Record<EnemyCombatRole, Readonly<EnemyRangePositioningProfile>>
> = {
  grunt: {
    ...MELEE_BASELINE,
    preferredRangeMultiplier: 1,
    advanceBufferMultiplier: 1,
    retreatBufferMultiplier: 0.2,
  },
  brute: {
    ...MELEE_BASELINE,
    preferredRangeMultiplier: 0.9,
    advanceBufferMultiplier: 0.8,
    retreatBufferMultiplier: 0,
  },
  assassin: {
    ...MELEE_BASELINE,
    preferredRangeMultiplier: 0.9,
    advanceBufferMultiplier: 0.9,
    retreatBufferMultiplier: 0.25,
  },
  crab: {
    ...MELEE_BASELINE,
    preferredRangeMultiplier: 1,
    advanceBufferMultiplier: 0.9,
    retreatBufferMultiplier: 0,
  },
  wolf: {
    ...MELEE_BASELINE,
    preferredRangeMultiplier: 1,
    advanceBufferMultiplier: 1.15,
    retreatBufferMultiplier: 0,
  },
  'mother-wolf': {
    ...MELEE_BASELINE,
    preferredRangeMultiplier: 1,
    advanceBufferMultiplier: 1,
    retreatBufferMultiplier: 0.1,
  },
  archer: {
    ...RANGED_BASELINE,
    preferredRangeMultiplier: 0.8,
    advanceBufferMultiplier: 0.6,
    retreatBufferMultiplier: 0.8,
  },
  'fire-mage': {
    ...RANGED_BASELINE,
    preferredRangeMultiplier: 0.7,
    advanceBufferMultiplier: 0.5,
    retreatBufferMultiplier: 0.7,
  },
  'frost-caster': {
    ...RANGED_BASELINE,
    preferredRangeMultiplier: 0.75,
    advanceBufferMultiplier: 0.55,
    retreatBufferMultiplier: 0.75,
  },
  boss: {
    preferredRangeMultiplier: 1,
    advanceBufferMultiplier: 1,
    retreatBufferMultiplier: 0.5,
    chaseUntilPreferredRange: false,
    allowAdvanceWhileCasting: false,
  },
};

/**
 * Optional per-enemy overrides. Add an enemy definition id here only when its
 * positioning should intentionally differ from the role baseline.
 */
export const ENEMY_POSITIONING_OVERRIDES: Readonly<
  Record<string, Partial<EnemyRangePositioningProfile>>
> = {};

export function resolveEnemyRangePositioning(
  definition: Readonly<EnemyDefinition>,
): Readonly<EnemyRangePositioningProfile> {
  return {
    ...ENEMY_ROLE_POSITIONING[definition.role],
    ...(ENEMY_POSITIONING_OVERRIDES[definition.id] ?? {}),
  };
}
