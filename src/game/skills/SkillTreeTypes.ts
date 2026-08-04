export type AbilityId = string;
export type SkillNodeKind = 'active' | 'passive' | 'upgrade';
export type SkillNodeRole = 'standard-skill' | 'advanced-skill' | 'ultimate' | 'support';
export type SkillPathId = string;

export interface SkillPassiveModifier {
  maximumHealth?: number;
  attack?: number;
  armor?: number;
  movementSpeed?: number;
  attackSpeedPercent?: number;
  dodgeCooldownPercent?: number;
  projectileDamagePercent?: number;
  meleeDamagePercent?: number;
  cooldownRatePercent?: number;
  staggerPower?: number;
  staggerResistance?: number;
  abilityDamagePercent?: number;
  statusDurationPercent?: number;
  statusPotencyPercent?: number;
  shieldPowerPercent?: number;
  healingPowerPercent?: number;
  armorPenetration?: number;
  criticalChance?: number;
  criticalDamage?: number;
}

export interface SkillAbilityModifierProfile {
  damageMultiplier: number;
  rangeMultiplier: number;
  radiusMultiplier: number;
  durationMultiplier: number;
  staggerMultiplier: number;
  statusDurationMultiplier: number;
  statusPotencyMultiplier: number;
  shieldMultiplier: number;
  healingMultiplier: number;
  armorPenetration: number;
  additionalPierce: number;
  additionalTargets: number;
  upgradeNodeIds: readonly string[];
}

export interface SkillNodeDefinition {
  id: string;
  characterId: string;
  name: string;
  description: string;
  kind: SkillNodeKind;
  role?: SkillNodeRole;
  abilityId?: AbilityId;
  passiveModifier?: SkillPassiveModifier;
  cost: number;
  minimumLevel: number;
  prerequisiteNodeIds: readonly string[];
  connectedNodeIds?: readonly string[];
  pathId?: SkillPathId;
  pathPointsRequired?: number;
  isUltimate?: boolean;
  branch: 'assault' | 'control' | 'survival';
  tier: number;
  ring?: 1 | 2 | 3 | 4;
  sector?: number;
}

export interface SkillPathDefinition {
  id: SkillPathId;
  name: string;
  summary: string;
  branch: SkillNodeDefinition['branch'];
}

export interface CharacterSkillTreeDefinition {
  characterId: string;
  identityTitle: string;
  identitySummary: string;
  combatStyle: string;
  strengths: readonly string[];
  paths?: readonly SkillPathDefinition[];
  nodes: readonly SkillNodeDefinition[];
}

export interface CharacterSkillState {
  unlockedNodeIds: string[];
  skillSlots: Partial<Record<1 | 2 | 3 | 4, AbilityId>>;
  skillSlotNodeIds?: Partial<Record<1 | 2 | 3 | 4, string>>;
}

export interface SkillTreeSerializedState {
  version: 1;
  characters: Record<string, CharacterSkillState>;
}

export interface SkillNodeEligibility {
  nodeId: string;
  canUnlock: boolean;
  reason: string;
  connected: boolean;
  prerequisitesMet: boolean;
  pathPoints: number;
  pathPointsRequired: number;
}

export interface CharacterSkillSnapshot extends CharacterSkillState {
  characterId: string;
  level: number;
  earnedSkillPoints: number;
  spentSkillPoints: number;
  availableSkillPoints: number;
  unlockedAbilityIds: readonly AbilityId[];
  passiveModifiers: Readonly<SkillPassiveModifier>;
  pathPoints: Readonly<Record<SkillPathId, number>>;
  availableNodeIds: readonly string[];
  blockedNodeReasons: Readonly<Record<string, string>>;
  disconnectedUnlockedNodeIds: readonly string[];
  equippedUltimateAbilityId: AbilityId | null;
  equippedUltimateNodeId: string | null;
}
