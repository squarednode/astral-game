export const CombatTuning = {
  player: {
    damageScale: 1,
    healthScale: 1,
    healingScale: 1,
    shieldScale: 1,
  },

  enemies: {
    healthScale: 1,
    damageScale: 1,
    movementSpeedScale: 1,
    castSpeedScale: 1,
    cooldownScale: 1,
  },

  elites: {
    healthScale: 1,
    damageScale: 1,
    movementSpeedScale: 1,
  },

  bosses: {
    healthScale: 1,
    damageScale: 1,
    movementSpeedScale: 1,
  },
} as const;
