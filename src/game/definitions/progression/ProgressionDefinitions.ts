import type {
  CharacterGrowthPackageDefinition,
  CharacterProgressionDefinition,
  ExperienceCurveDefinition,
} from '../../progression';

export const experienceCurves: readonly ExperienceCurveDefinition[] = [
  {
    id: 'curve.standard-early',
    maximumLevel: 50,
    experienceRequiredForLevel(level: number): number {
      // Per-level requirements. Cumulative totals are 10, 25, 45, and 70 XP
      // for levels 2 through 5, matching the first-level progression plan.
      const authored = [0, 10, 15, 20, 25, 32, 40, 50, 62, 75, 90];
      if (level < authored.length) return authored[level];
      return Math.round(90 + Math.pow(level - 10, 1.22) * 18);
    },
  },
];

export const characterGrowthPackages: readonly CharacterGrowthPackageDefinition[] = [
  {
    id: 'growth.vanguard',
    maximumHealthPerLevel: 0.75,
    attackPerLevel: 0.04,
    armorPerLevel: 0.01,
    movementSpeedPerLevel: 0.01,
  },
  {
    id: 'growth.warden',
    maximumHealthPerLevel: 0.4,
    attackPerLevel: 0.07,
    armorPerLevel: 0.005,
    movementSpeedPerLevel: 0.012,
  },
  {
    id: 'growth.hunter-mara',
    maximumHealthPerLevel: 0.6,
    attackPerLevel: 0.05,
    armorPerLevel: 0.006,
    movementSpeedPerLevel: 0.018,
  },
  {
    id: 'growth.tempest',
    maximumHealthPerLevel: 0.5,
    attackPerLevel: 0.06,
    armorPerLevel: 0.005,
    movementSpeedPerLevel: 0.025,
  },
];

export const characterProgressionDefinitions: readonly CharacterProgressionDefinition[] = [
  {
    characterId: 'vanguard',
    curveId: 'curve.standard-early',
    growthPackageId: 'growth.vanguard',
  },
  {
    characterId: 'warden',
    curveId: 'curve.standard-early',
    growthPackageId: 'growth.warden',
  },
  {
    characterId: 'hunter-mara',
    curveId: 'curve.standard-early',
    growthPackageId: 'growth.hunter-mara',
  },
  {
    characterId: 'tempest',
    curveId: 'curve.standard-early',
    growthPackageId: 'growth.tempest',
  },
];

export const progressionExperienceRewards = {
  enemy: 1,
  eliteEnemy: 4,
  bossEnemy: 10,
  encounter: 3,
  quest: 5,
} as const;
