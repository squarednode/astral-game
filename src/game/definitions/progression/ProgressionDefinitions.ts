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
      const authored = [0, 10, 25, 45, 70];
      if (level < authored.length) return authored[level];
      return Math.round(70 + Math.pow(level - 4, 1.35) * 28);
    },
  },
];

export const characterGrowthPackages: readonly CharacterGrowthPackageDefinition[] = [
  {
    id: 'growth.vanguard',
    maximumHealthPerLevel: 1.0,
    attackPerLevel: 0.08,
    armorPerLevel: 0.02,
    movementSpeedPerLevel: 0.02,
  },
  {
    id: 'growth.warden',
    maximumHealthPerLevel: 0.5,
    attackPerLevel: 0.10,
    armorPerLevel: 0.01,
    movementSpeedPerLevel: 0.015,
  },
  {
    id: 'growth.hunter-mara',
    maximumHealthPerLevel: 0.7,
    attackPerLevel: 0.09,
    armorPerLevel: 0.01,
    movementSpeedPerLevel: 0.025,
  },
  {
    id: 'growth.tempest',
    maximumHealthPerLevel: 0.7,
    attackPerLevel: 0.10,
    armorPerLevel: 0.01,
    movementSpeedPerLevel: 0.035,
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
