import type { DefinitionBase, DefinitionRegistry } from '../../../engine/definitions';
import type { CharacterElement } from '../CharacterDefinitions';

export type CombatLibraryKind =
  | 'projectile'
  | 'status-effect'
  | 'telegraph'
  | 'damage-profile'
  | 'combat-tag'
  | 'ai-ability-usage';

export type ProjectileMotion = 'linear' | 'lobbed' | 'homing' | 'stationary';
export type TelegraphShape = 'circle' | 'cone' | 'line' | 'beam' | 'nova' | 'ground-marker';
export type StatusStackingRule = 'refresh' | 'stack-duration' | 'stack-intensity' | 'replace';

export interface ProjectileDefinition extends DefinitionBase {
  readonly kind: 'projectile';
  readonly name: string;
  readonly motion: ProjectileMotion;
  readonly speed: number;
  readonly radius: number;
  readonly lifetime: number;
  readonly pierce: number;
  readonly bounce: number;
  readonly homingStrength: number;
  readonly visualAssetId?: string;
}

export interface StatusEffectDefinition extends DefinitionBase {
  readonly kind: 'status-effect';
  readonly name: string;
  readonly description: string;
  readonly duration: number;
  readonly tickInterval?: number;
  readonly powerPerTick?: number;
  readonly movementMultiplier?: number;
  readonly maximumStacks: number;
  readonly stackingRule: StatusStackingRule;
  readonly tags: readonly string[];
}

export interface TelegraphDefinition extends DefinitionBase {
  readonly kind: 'telegraph';
  readonly name: string;
  readonly shape: TelegraphShape;
  readonly duration: number;
  readonly radius?: number;
  readonly length?: number;
  readonly width?: number;
  readonly angleDegrees?: number;
  readonly followsCaster: boolean;
  readonly colorToken: string;
}

export interface DamageProfileDefinition extends DefinitionBase {
  readonly kind: 'damage-profile';
  readonly name: string;
  readonly element: CharacterElement | 'physical' | 'poison' | 'healing' | 'barrier';
  readonly canCrit: boolean;
  readonly armorInteraction: 'normal' | 'ignore' | 'healing' | 'barrier';
  readonly statusEffectId?: string;
  readonly tags: readonly string[];
}

export interface CombatTagDefinition extends DefinitionBase {
  readonly kind: 'combat-tag';
  readonly name: string;
  readonly category: 'delivery' | 'element' | 'purpose' | 'control' | 'actor' | 'cast';
  readonly description: string;
}

export interface AiAbilityUsageDefinition extends DefinitionBase {
  readonly kind: 'ai-ability-usage';
  readonly name: string;
  readonly abilityId: string;
  readonly weight: number;
  readonly minimumRange: number;
  readonly maximumRange: number;
  readonly preferredRange: number;
  readonly minimumHealthPercent: number;
  readonly maximumHealthPercent: number;
  readonly initialDelay: number;
  readonly cooldownMultiplier: number;
  readonly powerMultiplier: number;
  readonly requiresLineOfSight: boolean;
  readonly commitmentThreshold: number;
}

export type CombatLibraryDefinition =
  | ProjectileDefinition
  | StatusEffectDefinition
  | TelegraphDefinition
  | DamageProfileDefinition
  | CombatTagDefinition
  | AiAbilityUsageDefinition;

export interface CombatLibraryValidationResult {
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export function validateProjectileDefinition(definition: Readonly<ProjectileDefinition>): readonly string[] {
  const errors: string[] = [];
  if (!definition.name.trim()) errors.push('Name cannot be empty.');
  if (definition.speed < 0) errors.push('speed cannot be negative.');
  if (definition.radius <= 0) errors.push('radius must be greater than zero.');
  if (definition.lifetime <= 0) errors.push('lifetime must be greater than zero.');
  if (definition.pierce < 0) errors.push('pierce cannot be negative.');
  if (definition.bounce < 0) errors.push('bounce cannot be negative.');
  if (definition.homingStrength < 0) errors.push('homingStrength cannot be negative.');
  return errors;
}

export function validateStatusEffectDefinition(definition: Readonly<StatusEffectDefinition>): readonly string[] {
  const errors: string[] = [];
  if (!definition.name.trim()) errors.push('Name cannot be empty.');
  if (!definition.description.trim()) errors.push('Description cannot be empty.');
  if (definition.duration < 0) errors.push('duration cannot be negative.');
  if (definition.tickInterval !== undefined && definition.tickInterval <= 0) errors.push('tickInterval must be greater than zero.');
  if (definition.maximumStacks < 1) errors.push('maximumStacks must be at least one.');
  if (definition.movementMultiplier !== undefined && definition.movementMultiplier < 0) errors.push('movementMultiplier cannot be negative.');
  return errors;
}

export function validateTelegraphDefinition(definition: Readonly<TelegraphDefinition>): readonly string[] {
  const errors: string[] = [];
  if (!definition.name.trim()) errors.push('Name cannot be empty.');
  if (definition.duration < 0) errors.push('duration cannot be negative.');
  if (definition.radius !== undefined && definition.radius <= 0) errors.push('radius must be greater than zero.');
  if (definition.length !== undefined && definition.length <= 0) errors.push('length must be greater than zero.');
  if (definition.width !== undefined && definition.width <= 0) errors.push('width must be greater than zero.');
  return errors;
}

export function validateDamageProfileDefinition(definition: Readonly<DamageProfileDefinition>): readonly string[] {
  return definition.name.trim() ? [] : ['Name cannot be empty.'];
}

export function validateCombatTagDefinition(definition: Readonly<CombatTagDefinition>): readonly string[] {
  const errors: string[] = [];
  if (!definition.name.trim()) errors.push('Name cannot be empty.');
  if (!definition.description.trim()) errors.push('Description cannot be empty.');
  return errors;
}

export function validateAiAbilityUsageDefinition(definition: Readonly<AiAbilityUsageDefinition>): readonly string[] {
  const errors: string[] = [];
  if (!definition.name.trim()) errors.push('Name cannot be empty.');
  if (!definition.abilityId.trim()) errors.push('abilityId cannot be empty.');
  if (definition.weight <= 0) errors.push('weight must be greater than zero.');
  if (definition.minimumRange < 0) errors.push('minimumRange cannot be negative.');
  if (definition.maximumRange < definition.minimumRange) errors.push('maximumRange cannot be less than minimumRange.');
  if (definition.preferredRange < definition.minimumRange || definition.preferredRange > definition.maximumRange) errors.push('preferredRange must be within the allowed range.');
  if (definition.minimumHealthPercent < 0 || definition.maximumHealthPercent > 1 || definition.minimumHealthPercent > definition.maximumHealthPercent) errors.push('health percentages must form a valid 0..1 range.');
  if (definition.cooldownMultiplier <= 0) errors.push('cooldownMultiplier must be greater than zero.');
  if (definition.powerMultiplier < 0) errors.push('powerMultiplier cannot be negative.');
  if (definition.commitmentThreshold < 0 || definition.commitmentThreshold > 1) errors.push('commitmentThreshold must be between 0 and 1.');
  return errors;
}

export function validateCombatLibraryReferences(registry: DefinitionRegistry): CombatLibraryValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const abilityDefinitions = registry.all<any>('ability');
  const abilityIds = new Set(abilityDefinitions.map(definition => definition.id));
  const projectileIds = new Set(registry.all<ProjectileDefinition>('projectile').map(definition => definition.id));
  const statusIds = new Set(registry.all<StatusEffectDefinition>('status-effect').map(definition => definition.id));
  const telegraphIds = new Set(registry.all<TelegraphDefinition>('telegraph').map(definition => definition.id));
  const damageProfileIds = new Set(registry.all<DamageProfileDefinition>('damage-profile').map(definition => definition.id));
  const tagIds = new Set(registry.all<CombatTagDefinition>('combat-tag').map(definition => definition.id.replace('combat-tag.', '')));

  for (const ability of abilityDefinitions) {
    if (ability.projectileId && !projectileIds.has(ability.projectileId)) errors.push(`${ability.id}: missing projectile ${ability.projectileId}.`);
    if (ability.statusEffectIds) {
      for (const id of ability.statusEffectIds) if (!statusIds.has(id)) errors.push(`${ability.id}: missing status effect ${id}.`);
    }
    if (ability.telegraphId && !telegraphIds.has(ability.telegraphId)) errors.push(`${ability.id}: missing telegraph ${ability.telegraphId}.`);
    if (ability.damageProfileId && !damageProfileIds.has(ability.damageProfileId)) errors.push(`${ability.id}: missing damage profile ${ability.damageProfileId}.`);
    for (const tag of ability.abilityTags ?? []) if (!tagIds.has(tag)) warnings.push(`${ability.id}: tag "${tag}" has no combat-tag definition.`);
    if (!ability.runtimeReady) warnings.push(`${ability.id}: catalog-only ability has no runtime executor yet.`);
  }

  for (const usage of registry.all<AiAbilityUsageDefinition>('ai-ability-usage')) {
    if (!abilityIds.has(usage.abilityId)) errors.push(`${usage.id}: missing ability ${usage.abilityId}.`);
  }

  return { errors, warnings };
}
