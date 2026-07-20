export type ExperienceDistributionPolicy =
  | 'full-roster'
  | 'active-party'
  | 'split-active'
  | 'custom';

export interface ExperienceCurveDefinition {
  id: string;
  maximumLevel: number;
  experienceRequiredForLevel(level: number): number;
}

export interface CharacterGrowthPackageDefinition {
  id: string;
  maximumHealthPerLevel: number;
  attackPerLevel: number;
  armorPerLevel: number;
  movementSpeedPerLevel: number;
}

export interface CharacterProgressionDefinition {
  characterId: string;
  curveId: string;
  growthPackageId: string;
  startingLevel?: number;
  startingExperience?: number;
}

export interface CharacterProgressionState {
  characterId: string;
  level: number;
  experience: number;
  totalExperience: number;
}

export interface CharacterGrowthModifiers {
  maximumHealth: number;
  attack: number;
  armor: number;
  movementSpeed: number;
}

export interface CharacterProgressionSnapshot extends CharacterProgressionState {
  experienceIntoLevel: number;
  experienceForNextLevel: number;
  experienceProgress: number;
  maximumLevel: number;
  growth: CharacterGrowthModifiers;
}

export interface ExperienceAward {
  amount: number;
  sourceId: string;
  sourceType: 'enemy' | 'quest' | 'encounter' | 'discovery' | 'story' | 'developer';
}

export interface ExperienceDistributionResult {
  award: ExperienceAward;
  recipients: readonly {
    characterId: string;
    amount: number;
    levelsGained: number;
    newLevel: number;
  }[];
}

export interface ProgressionSerializedState {
  version: 1;
  characters: Record<string, CharacterProgressionState>;
}
