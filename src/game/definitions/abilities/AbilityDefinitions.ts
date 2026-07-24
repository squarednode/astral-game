import type { DefinitionBase } from '../../../engine/definitions';
import type { CharacterElement } from '../CharacterDefinitions';

export type AbilityTargetingMode = 'directional' | 'ground' | 'self' | 'target';
export type AbilityCastStyle = 'instant' | 'cast-time' | 'channel' | 'charged' | 'toggle' | 'passive';
export type AbilityQueueBehavior = 'replace' | 'reject' | 'preserve';
export type AbilityResourceType = 'cooldown-only' | 'charges' | 'mana' | 'stamina';
export type AbilityFamily = 'melee' | 'projectile' | 'area' | 'movement' | 'defense' | 'control' | 'summon' | 'utility';

export type AbilityTag =
  | 'projectile' | 'melee' | 'area' | 'movement' | 'mobility'
  | 'fire' | 'ice' | 'lightning' | 'poison' | 'physical'
  | 'defensive' | 'damage' | 'buff' | 'status' | 'crowd-control'
  | 'summon' | 'heal' | 'interruptible' | 'channeled' | 'boss';

export interface AbilityDefinition extends DefinitionBase {
  readonly kind: 'ability';
  readonly name: string;
  readonly description: string;
  readonly family: AbilityFamily;
  readonly executorId: string;
  readonly runtimeReady: boolean;
  readonly targeting: AbilityTargetingMode;
  readonly castStyle: AbilityCastStyle;
  readonly resource: AbilityResourceType;
  readonly element: CharacterElement;
  readonly abilityTags: readonly AbilityTag[];
  readonly cooldown: number;
  readonly castTime: number;
  readonly executionTime: number;
  readonly range: number;
  readonly power?: number;
  readonly damage?: number;
  readonly speed?: number;
  readonly radius?: number;
  readonly duration?: number;
  readonly statusDuration?: number;
  readonly projectileId?: string;
  readonly statusEffectIds?: readonly string[];
  readonly telegraphId?: string;
  readonly damageProfileId?: string;
  readonly canMoveWhileCasting: boolean;
  readonly canRotateWhileCasting: boolean;
  readonly commitThreshold: number;
  readonly queueBehavior: AbilityQueueBehavior;
  readonly interruptPriority: number;
  readonly iconAssetId?: string;
}

export const ABILITY_DEFINITION_SCHEMA_VERSION = 2;

export function validateAbilityDefinition(definition: Readonly<AbilityDefinition>): readonly string[] {
  const errors: string[] = [];
  if (!definition.name.trim()) errors.push('Name cannot be empty.');
  if (!definition.description.trim()) errors.push('Description cannot be empty.');
  if (!definition.family.trim()) errors.push('family cannot be empty.');
  if (!definition.executorId.trim()) errors.push('executorId cannot be empty.');
  if (definition.cooldown < 0) errors.push('cooldown cannot be negative.');
  if (definition.castTime < 0) errors.push('castTime cannot be negative.');
  if (definition.executionTime < 0) errors.push('executionTime cannot be negative.');
  if (definition.range < 0) errors.push('range cannot be negative.');
  if (definition.power !== undefined && definition.power < 0) errors.push('power cannot be negative.');
  if (definition.damage !== undefined && definition.damage < 0) errors.push('damage cannot be negative.');
  if (definition.speed !== undefined && definition.speed < 0) errors.push('speed cannot be negative.');
  if (definition.radius !== undefined && definition.radius < 0) errors.push('radius cannot be negative.');
  if (definition.abilityTags.length === 0) errors.push('At least one ability tag is required.');
  if (definition.commitThreshold < 0 || definition.commitThreshold > 1) errors.push('commitThreshold must be between 0 and 1.');
  if (!Number.isFinite(definition.interruptPriority)) errors.push('interruptPriority must be finite.');
  return errors;
}

const metadata = {
  schemaVersion: ABILITY_DEFINITION_SCHEMA_VERSION,
  contentVersion: '0.6.0c',
  source: 'src/game/definitions/abilities/AbilityDefinitions.ts',
  tags: ['ability', 'phase-2', 'combat-library'],
} as const;

const base = {
  kind: 'ability' as const,
  metadata,
  resource: 'cooldown-only' as const,
  executionTime: 0.05,
  canRotateWhileCasting: true,
  queueBehavior: 'replace' as const,
  interruptPriority: 10,
};

export const abilityDefinitions: readonly AbilityDefinition[] = [
  {
    ...base, id: 'ability.fireball', name: 'Fireball', description: 'Launch a fiery projectile toward the aim point.', family: 'projectile',
    executorId: 'fireball', runtimeReady: true, targeting: 'directional', castStyle: 'cast-time', element: 'fire',
    abilityTags: ['projectile', 'fire', 'damage', 'interruptible'], cooldown: 8, castTime: 0.50, range: 12,
    power: 46, damage: 46, speed: 14, radius: 0.26, projectileId: 'projectile.fireball', damageProfileId: 'damage.fire',
    canMoveWhileCasting: false, commitThreshold: 0.95, iconAssetId: 'icon:ability-fireball',
  },
  {
    ...base, id: 'ability.blink', name: 'Blink', description: 'Teleport toward the selected ground position.', family: 'movement',
    executorId: 'blink', runtimeReady: true, targeting: 'ground', castStyle: 'instant', element: 'arcane',
    abilityTags: ['movement', 'mobility'], cooldown: 6, castTime: 0, range: 8.5, speed: 0,
    canMoveWhileCasting: false, commitThreshold: 0, interruptPriority: 20, iconAssetId: 'icon:ability-blink',
  },
  {
    ...base, id: 'ability.shield', name: 'Astral Shield', description: 'Restore health and surround the caster with a timed defensive field.', family: 'defense',
    executorId: 'shield', runtimeReady: true, targeting: 'self', castStyle: 'cast-time', element: 'arcane',
    abilityTags: ['defensive', 'buff'], cooldown: 12, castTime: 0.20, range: 0, power: 24, duration: 4,
    statusEffectIds: ['status.barrier'], damageProfileId: 'damage.barrier', canMoveWhileCasting: true, commitThreshold: 0.95,
    iconAssetId: 'icon:ability-shield',
  },
  {
    ...base, id: 'ability.ice-spear', name: 'Ice Spear', description: 'Launch a piercing frost projectile that applies frost.', family: 'projectile',
    executorId: 'ice-spear', runtimeReady: true, targeting: 'directional', castStyle: 'cast-time', element: 'frost',
    abilityTags: ['projectile', 'ice', 'damage', 'crowd-control', 'status', 'interruptible'], cooldown: 6, castTime: 0.30, range: 14,
    power: 38, damage: 38, speed: 17, radius: 0.18, statusDuration: 4, projectileId: 'projectile.ice-spear',
    statusEffectIds: ['status.frost'], damageProfileId: 'damage.frost', canMoveWhileCasting: false, commitThreshold: 0.95,
    iconAssetId: 'icon:ability-ice-spear',
  },

  {
    ...base, id: 'ability.melee-strike', name: 'Melee Strike', description: 'A quick close-range physical strike.', family: 'melee',
    executorId: 'melee-strike', runtimeReady: false, targeting: 'directional', castStyle: 'cast-time', element: 'physical',
    abilityTags: ['melee', 'physical', 'damage', 'interruptible'], cooldown: 1.2, castTime: 0.22, range: 2.4, power: 18, damage: 18,
    telegraphId: 'telegraph.melee-small', damageProfileId: 'damage.physical', canMoveWhileCasting: false, commitThreshold: 0.70,
  },
  {
    ...base, id: 'ability.melee-cleave', name: 'Cleave', description: 'A broad melee swing that hits targets in an arc.', family: 'melee',
    executorId: 'melee-cleave', runtimeReady: true, targeting: 'directional', castStyle: 'cast-time', element: 'physical',
    abilityTags: ['melee', 'area', 'physical', 'damage', 'interruptible'], cooldown: 3.5, castTime: 0.50, range: 3.2, radius: 3.2, power: 28, damage: 28,
    telegraphId: 'telegraph.melee-small', damageProfileId: 'damage.physical', canMoveWhileCasting: false, commitThreshold: 0.70,
  },
  {
    ...base, id: 'ability.heavy-slam', name: 'Heavy Slam', description: 'A slow committed impact that damages a wide area.', family: 'melee',
    executorId: 'heavy-slam', runtimeReady: true, targeting: 'ground', castStyle: 'cast-time', element: 'physical',
    abilityTags: ['melee', 'area', 'physical', 'damage', 'crowd-control', 'interruptible'], cooldown: 5, castTime: 0.90, range: 3.8, radius: 3.5, power: 42, damage: 42,
    telegraphId: 'telegraph.melee-heavy', damageProfileId: 'damage.physical', canMoveWhileCasting: false, commitThreshold: 0.55,
  },
  {
    ...base, id: 'ability.spin-attack', name: 'Spin Attack', description: 'A circular melee attack around the caster.', family: 'melee',
    executorId: 'spin-attack', runtimeReady: false, targeting: 'self', castStyle: 'cast-time', element: 'physical',
    abilityTags: ['melee', 'area', 'physical', 'damage'], cooldown: 6, castTime: 0.65, range: 4, radius: 4, power: 34, damage: 34,
    telegraphId: 'telegraph.nova', damageProfileId: 'damage.physical', canMoveWhileCasting: true, commitThreshold: 0.60,
  },
  {
    ...base, id: 'ability.arrow-shot', name: 'Arrow Shot', description: 'Fire a fast physical arrow.', family: 'projectile',
    executorId: 'arrow-shot', runtimeReady: false, targeting: 'directional', castStyle: 'cast-time', element: 'physical',
    abilityTags: ['projectile', 'physical', 'damage', 'interruptible'], cooldown: 1.8, castTime: 0.35, range: 24, power: 16, damage: 16, speed: 18,
    projectileId: 'projectile.arrow', telegraphId: 'telegraph.line-shot', damageProfileId: 'damage.physical', canMoveWhileCasting: false, commitThreshold: 0.70,
  },
  {
    ...base, id: 'ability.fire-bolt', name: 'Fire Bolt', description: 'Launch a compact enemy fire projectile.', family: 'projectile',
    executorId: 'fire-bolt', runtimeReady: false, targeting: 'directional', castStyle: 'cast-time', element: 'fire',
    abilityTags: ['projectile', 'fire', 'damage', 'interruptible'], cooldown: 2.5, castTime: 0.55, range: 24, power: 18, damage: 18, speed: 15,
    projectileId: 'projectile.fire-bolt', telegraphId: 'telegraph.line-shot', damageProfileId: 'damage.fire', canMoveWhileCasting: false, commitThreshold: 0.65,
  },
  {
    ...base, id: 'ability.ice-bolt', name: 'Ice Bolt', description: 'Launch a slowing frost projectile.', family: 'projectile',
    executorId: 'ice-bolt', runtimeReady: false, targeting: 'directional', castStyle: 'cast-time', element: 'frost',
    abilityTags: ['projectile', 'ice', 'damage', 'status', 'crowd-control', 'interruptible'], cooldown: 2.8, castTime: 0.60, range: 24, power: 16, damage: 16, speed: 14,
    projectileId: 'projectile.ice-bolt', statusEffectIds: ['status.frost'], telegraphId: 'telegraph.line-shot', damageProfileId: 'damage.frost', canMoveWhileCasting: false, commitThreshold: 0.65,
  },
  {
    ...base, id: 'ability.magic-missile', name: 'Magic Missile', description: 'Fire a slow homing arcane projectile.', family: 'projectile',
    executorId: 'magic-missile', runtimeReady: true, targeting: 'target', castStyle: 'cast-time', element: 'arcane',
    abilityTags: ['projectile', 'damage', 'interruptible'], cooldown: 3.2, castTime: 0.65, range: 22, power: 20, damage: 20, speed: 12,
    projectileId: 'projectile.magic-missile', telegraphId: 'telegraph.line-shot', damageProfileId: 'damage.lightning', canMoveWhileCasting: false, commitThreshold: 0.65,
  },
  {
    ...base, id: 'ability.piercing-shot', name: 'Piercing Shot', description: 'Fire a line projectile through multiple targets.', family: 'projectile',
    executorId: 'piercing-shot', runtimeReady: true, targeting: 'directional', castStyle: 'cast-time', element: 'physical',
    abilityTags: ['projectile', 'physical', 'damage', 'interruptible'], cooldown: 5.5, castTime: 0.75, range: 24, power: 30, damage: 30, speed: 21,
    projectileId: 'projectile.piercing-shot', telegraphId: 'telegraph.line-shot', damageProfileId: 'damage.physical', canMoveWhileCasting: false, commitThreshold: 0.65,
  },
  {
    ...base, id: 'ability.spread-shot', name: 'Spread Shot', description: 'Fire several projectiles in a wide spread.', family: 'projectile',
    executorId: 'spread-shot', runtimeReady: true, targeting: 'directional', castStyle: 'cast-time', element: 'physical',
    abilityTags: ['projectile', 'area', 'physical', 'damage', 'interruptible'], cooldown: 4.5, castTime: 0.55, range: 15, power: 10, damage: 10, speed: 16,
    projectileId: 'projectile.spread-pellet', telegraphId: 'telegraph.melee-small', damageProfileId: 'damage.physical', canMoveWhileCasting: false, commitThreshold: 0.65,
  },
  {
    ...base, id: 'ability.ground-fire', name: 'Ground Fire', description: 'Create a burning area at the target position.', family: 'area',
    executorId: 'ground-fire', runtimeReady: false, targeting: 'ground', castStyle: 'cast-time', element: 'fire',
    abilityTags: ['area', 'fire', 'damage', 'status', 'interruptible'], cooldown: 7, castTime: 0.85, range: 18, radius: 3.5, duration: 5, power: 8, damage: 8,
    statusEffectIds: ['status.burn'], telegraphId: 'telegraph.circle-small', damageProfileId: 'damage.fire', canMoveWhileCasting: false, commitThreshold: 0.55,
  },
  {
    ...base, id: 'ability.frost-nova', name: 'Frost Nova', description: 'Release a slowing frost burst around the caster.', family: 'area',
    executorId: 'frost-nova', runtimeReady: true, targeting: 'self', castStyle: 'cast-time', element: 'frost',
    abilityTags: ['area', 'ice', 'damage', 'status', 'crowd-control', 'interruptible'], cooldown: 8, castTime: 0.70, range: 5, radius: 5, power: 15, damage: 15,
    statusEffectIds: ['status.frost'], telegraphId: 'telegraph.nova', damageProfileId: 'damage.frost', canMoveWhileCasting: false, commitThreshold: 0.50,
  },
  {
    ...base, id: 'ability.shock-burst', name: 'Shock Burst', description: 'Detonate a short-range lightning burst.', family: 'area',
    executorId: 'shock-burst', runtimeReady: true, targeting: 'self', castStyle: 'cast-time', element: 'lightning',
    abilityTags: ['area', 'lightning', 'damage', 'status', 'interruptible'], cooldown: 6.5, castTime: 0.55, range: 4.5, radius: 4.5, power: 22, damage: 22,
    statusEffectIds: ['status.shock'], telegraphId: 'telegraph.nova', damageProfileId: 'damage.lightning', canMoveWhileCasting: true, commitThreshold: 0.55,
  },
  {
    ...base, id: 'ability.poison-cloud', name: 'Poison Cloud', description: 'Create a persistent poisonous area.', family: 'area',
    executorId: 'poison-cloud', runtimeReady: true, targeting: 'ground', castStyle: 'cast-time', element: 'physical',
    abilityTags: ['area', 'poison', 'damage', 'status', 'interruptible'], cooldown: 9, castTime: 0.80, range: 16, radius: 4, duration: 6, power: 6, damage: 6,
    statusEffectIds: ['status.poison'], telegraphId: 'telegraph.poison-cloud', damageProfileId: 'damage.poison', canMoveWhileCasting: false, commitThreshold: 0.55,
  },
  {
    ...base, id: 'ability.dash', name: 'Dash', description: 'Rapidly move a short distance.', family: 'movement',
    executorId: 'dash', runtimeReady: true, targeting: 'directional', castStyle: 'instant', element: 'physical',
    abilityTags: ['movement', 'mobility'], cooldown: 4, castTime: 0, range: 6, speed: 12, canMoveWhileCasting: false, commitThreshold: 0, interruptPriority: 20,
  },
  {
    ...base, id: 'ability.charge', name: 'Charge', description: 'Rush toward a target and impact nearby enemies.', family: 'movement',
    executorId: 'charge', runtimeReady: true, targeting: 'directional', castStyle: 'cast-time', element: 'physical',
    abilityTags: ['movement', 'mobility', 'melee', 'damage', 'crowd-control'], cooldown: 7, castTime: 0.35, range: 15, speed: 11, radius: 2.5, power: 26, damage: 26,
    telegraphId: 'telegraph.line-shot', damageProfileId: 'damage.physical', canMoveWhileCasting: false, commitThreshold: 0.45, interruptPriority: 15,
  },
  {
    ...base, id: 'ability.retreat', name: 'Retreat', description: 'Quickly move away from the current target.', family: 'movement',
    executorId: 'retreat', runtimeReady: true, targeting: 'directional', castStyle: 'instant', element: 'physical',
    abilityTags: ['movement', 'mobility'], cooldown: 5, castTime: 0, range: 7, speed: 10, canMoveWhileCasting: false, commitThreshold: 0, interruptPriority: 20,
  },
  {
    ...base, id: 'ability.leap', name: 'Leap', description: 'Leap to a target area and land with an impact.', family: 'movement',
    executorId: 'leap', runtimeReady: false, targeting: 'ground', castStyle: 'cast-time', element: 'physical',
    abilityTags: ['movement', 'mobility', 'area', 'damage'], cooldown: 8, castTime: 0.45, range: 12, speed: 9, radius: 3, power: 28, damage: 28,
    telegraphId: 'telegraph.circle-small', damageProfileId: 'damage.physical', canMoveWhileCasting: false, commitThreshold: 0.50, interruptPriority: 15,
  },
  {
    ...base, id: 'ability.barrier', name: 'Barrier', description: 'Apply a temporary protective barrier.', family: 'defense',
    executorId: 'barrier', runtimeReady: true, targeting: 'self', castStyle: 'cast-time', element: 'arcane',
    abilityTags: ['defensive', 'buff'], cooldown: 10, castTime: 0.50, range: 0, power: 35, duration: 5,
    statusEffectIds: ['status.barrier'], damageProfileId: 'damage.barrier', canMoveWhileCasting: true, commitThreshold: 0.65,
  },
  {
    ...base, id: 'ability.heal', name: 'Heal', description: 'Restore health to the caster or target.', family: 'defense',
    executorId: 'heal', runtimeReady: false, targeting: 'self', castStyle: 'cast-time', element: 'arcane',
    abilityTags: ['defensive', 'heal'], cooldown: 12, castTime: 1.10, range: 0, power: 45,
    damageProfileId: 'damage.healing', canMoveWhileCasting: false, commitThreshold: 0.70,
  },
  {
    ...base, id: 'ability.regeneration', name: 'Regeneration', description: 'Apply healing over time.', family: 'defense',
    executorId: 'regeneration', runtimeReady: false, targeting: 'self', castStyle: 'cast-time', element: 'arcane',
    abilityTags: ['defensive', 'heal', 'buff', 'status'], cooldown: 10, castTime: 0.65, range: 0, power: 5, duration: 6,
    statusEffectIds: ['status.regeneration'], damageProfileId: 'damage.healing', canMoveWhileCasting: true, commitThreshold: 0.65,
  },
];
