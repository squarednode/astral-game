export const CombatPresentation = {
  targeting: {
    targetVolumeScale: 0.5,
    hoverVolumeScale: 0.5,
    outlineWidthScale: 0.75,
  },

  projectiles: {
    visualScale: 0.5,
    collisionScale: 0.5,
  },

  melee: {
    hitRadiusScale: 1,
  },

  areaEffects: {
    visualRadiusScale: 1,
    damageRadiusScale: 1,
  },

  damageNumbers: {
    scale: 0.75,
    lifetimeScale: 1,
    verticalSpeedScale: 1,
    stackingOffsetScale: 1,
    maximumVisible: 30,
  },

  healthBars: {
    enemyWidthScale: 0.8,
    enemyHeightScale: 0.8,
    bossWidthScale: 1,
    bossHeightScale: 1,
    displayDurationScale: 1,
  },

  telegraphs: {
    visualRadiusScale: 1,
    damageRadiusScale: 1,
    opacity: 0.75,
    leadTimeScale: 1,
    fadeDurationScale: 1,
  },

  hitFeedback: {
    hitFlashDurationScale: 1,
    knockbackVisualScale: 1,
    screenShakeScale: 1,
  },

  statusIcons: {
    scale: 1,
    maximumVisible: 6,
  },

  nameplates: {
    maximumDistanceScale: 1,
    displayDurationScale: 1,
  },
} as const;
