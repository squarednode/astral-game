export {
  CHARACTER_DEFINITION_SCHEMA_VERSION,
  characterDefinitions,
  validateCharacterDefinition,
} from './CharacterDefinitions';
export type {
  CharacterDefinition,
  CharacterElement,
} from './CharacterDefinitions';
export {
  ABILITY_DEFINITION_SCHEMA_VERSION,
  abilityDefinitions,
  validateAbilityDefinition,
} from './abilities';
export type {
  AbilityCastStyle,
  AbilityDefinition,
  AbilityFamily,
  AbilityQueueBehavior,
  AbilityResourceType,
  AbilityTag,
  AbilityTargetingMode,
} from './abilities';
export {
  COMBAT_LIBRARY_SCHEMA_VERSION,
  aiAbilityUsageDefinitions,
  combatTagDefinitions,
  damageProfileDefinitions,
  projectileDefinitions,
  statusEffectDefinitions,
  telegraphDefinitions,
  validateAiAbilityUsageDefinition,
  validateCombatLibraryReferences,
  validateCombatTagDefinition,
  validateDamageProfileDefinition,
  validateProjectileDefinition,
  validateStatusEffectDefinition,
  validateTelegraphDefinition,
} from './combat';
export type {
  AiAbilityUsageDefinition,
  CombatLibraryDefinition,
  CombatLibraryKind,
  CombatLibraryValidationResult,
  CombatTagDefinition,
  DamageProfileDefinition,
  ProjectileDefinition,
  ProjectileMotion,
  StatusEffectDefinition,
  StatusStackingRule,
  TelegraphDefinition,
  TelegraphShape,
} from './combat';
export {
  ENEMY_DEFINITION_SCHEMA_VERSION,
  enemyDefinitions,
  enemyVariantDefinitions,
  eliteModifierDefinitions,
  validateEnemyDefinition,
  validateEnemyVariantDefinition,
  validateEliteModifierDefinition,
} from './EnemyDefinitions';
export type {
  EnemyAbilityReference,
  EnemyBehaviorPolicy,
  EnemyCombatRole,
  EnemyDefinition,
  EnemyVariantDefinition,
  EnemyVariantId,
  EliteModifierDefinition,
  EliteModifierId,
} from './EnemyDefinitions';
