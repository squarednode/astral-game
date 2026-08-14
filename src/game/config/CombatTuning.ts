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
    // The Level 1 Wolf Keeper still uses the legacy 950 HP boss definition.
    // Scale that authored story boss to 60 HP until boss definitions are split
    // into per-level content instead of sharing the old sandbox archetype.
    healthScale: 60 / 950,
    damageScale: 1,
    movementSpeedScale: 1,
  },
} as const;
