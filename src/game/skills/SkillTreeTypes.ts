export type AbilityId = string;
export type SkillNodeKind = 'active' | 'passive' | 'upgrade';

export interface SkillNodeDefinition {
  id: string;
  characterId: string;
  name: string;
  description: string;
  kind: SkillNodeKind;
  abilityId?: AbilityId;
  cost: number;
  minimumLevel: number;
  prerequisiteNodeIds: readonly string[];
  branch: 'assault' | 'control' | 'survival';
  tier: number;
}

export interface CharacterSkillTreeDefinition {
  characterId: string;
  identityTitle: string;
  identitySummary: string;
  combatStyle: string;
  strengths: readonly string[];
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
}
