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
}

export interface SkillTreeSerializedState {
  version: 1;
  characters: Record<string, CharacterSkillState>;
}

export interface CharacterSkillSnapshot extends CharacterSkillState {
  characterId: string;
  level: number;
  earnedSkillPoints: number;
  spentSkillPoints: number;
  availableSkillPoints: number;
  unlockedAbilityIds: readonly AbilityId[];
  passiveModifiers: Readonly<SkillPassiveModifier>;
}
