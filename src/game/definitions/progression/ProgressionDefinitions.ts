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
      const authored = [0, 100, 175, 275, 400];
      if (level < authored.length) return authored[level];
      return Math.round(400 + Math.pow(level - 4, 1.35) * 165);
    },
  },
];

export const characterGrowthPackages: readonly CharacterGrowthPackageDefinition[] = [
  {
    id: 'growth.vanguard',
    maximumHealthPerLevel: 20,
    attackPerLevel: 3,
    armorPerLevel: 1.5,
    movementSpeedPerLevel: 0.02,
  },
  {
    id: 'growth.warden',
    maximumHealthPerLevel: 14,
    attackPerLevel: 2,
    armorPerLevel: 1.2,
    movementSpeedPerLevel: 0.015,
  },
  {
    id: 'growth.hunter-mara',
    maximumHealthPerLevel: 12,
    attackPerLevel: 2.4,
    armorPerLevel: 0.9,
    movementSpeedPerLevel: 0.025,
  },
  {
    id: 'growth.tempest',
    maximumHealthPerLevel: 10,
    attackPerLevel: 2.6,
    armorPerLevel: 0.8,
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
  enemy: 18,
  eliteEnemy: 40,
  bossEnemy: 100,
  encounter: 75,
  quest: 125,
} as const;
