import type { DefinitionBase } from '../../../engine/definitions';
import type { CharacterElement } from '../CharacterDefinitions';

export type AbilityTargetingMode =
  | 'directional'
  | 'ground'
  | 'self'
  | 'target';

export type AbilityCastStyle =
  | 'instant'
  | 'cast-time'
  | 'channel'
  | 'charged'
  | 'toggle'
  | 'passive';

export type AbilityResourceType =
  | 'cooldown-only'
  | 'charges'
  | 'mana'
  | 'stamina';

export type AbilityTag =
  | 'projectile'
  | 'movement'
  | 'fire'
  | 'ice'
  | 'defensive'
  | 'crowd-control'
  | 'mobility'
  | 'damage'
  | 'buff'
  | 'status';

export interface AbilityDefinition extends DefinitionBase {
  readonly kind: 'ability';
  readonly name: string;
  readonly description: string;
  readonly executorId: 'fireball' | 'blink' | 'shield' | 'ice-spear';
  readonly targeting: AbilityTargetingMode;
  readonly castStyle: AbilityCastStyle;
  readonly resource: AbilityResourceType;
  readonly element: CharacterElement;
  readonly abilityTags: readonly AbilityTag[];
  readonly cooldown: number;
  readonly castTime: number;
  readonly executionTime: number;
  readonly range: number;
  readonly damage?: number;
  readonly duration?: number;
  readonly statusDuration?: number;
  readonly iconAssetId?: string;
}

export const ABILITY_DEFINITION_SCHEMA_VERSION = 1;

export function validateAbilityDefinition(
  definition: Readonly<AbilityDefinition>,
): readonly string[] {
  const errors: string[] = [];
  if (!definition.name.trim()) errors.push('Name cannot be empty.');
  if (!definition.description.trim()) errors.push('Description cannot be empty.');
  if (definition.cooldown < 0) errors.push('cooldown cannot be negative.');
  if (definition.castTime < 0) errors.push('castTime cannot be negative.');
  if (definition.executionTime < 0) errors.push('executionTime cannot be negative.');
  if (definition.range < 0) errors.push('range cannot be negative.');
  if (definition.damage !== undefined && definition.damage < 0) errors.push('damage cannot be negative.');
  if (definition.abilityTags.length === 0) errors.push('At least one ability tag is required.');
  return errors;
}

const metadata = {
  schemaVersion: ABILITY_DEFINITION_SCHEMA_VERSION,
  contentVersion: '0.6.0a',
  source: 'src/game/definitions/abilities/AbilityDefinitions.ts',
  tags: ['ability', 'phase-2', 'validation'],
} as const;

export const abilityDefinitions: readonly AbilityDefinition[] = [
  {
    id: 'ability.fireball', kind: 'ability', metadata,
    name: 'Fireball', description: 'Launch a fiery projectile toward the aim point.',
    executorId: 'fireball', targeting: 'directional', castStyle: 'cast-time', resource: 'cooldown-only',
    element: 'fire', abilityTags: ['projectile', 'fire', 'damage'],
    cooldown: 8, castTime: 0.50, executionTime: 0.05, range: 12, damage: 46,
    iconAssetId: 'icon:ability-fireball',
  },
  {
    id: 'ability.blink', kind: 'ability', metadata,
    name: 'Blink', description: 'Teleport toward the selected ground position.',
    executorId: 'blink', targeting: 'ground', castStyle: 'instant', resource: 'cooldown-only',
    element: 'arcane', abilityTags: ['movement', 'mobility'],
    cooldown: 6, castTime: 0, executionTime: 0.05, range: 8.5,
    iconAssetId: 'icon:ability-blink',
  },
  {
    id: 'ability.shield', kind: 'ability', metadata,
    name: 'Astral Shield', description: 'Restore health and surround the caster with a timed defensive field.',
    executorId: 'shield', targeting: 'self', castStyle: 'cast-time', resource: 'cooldown-only',
    element: 'arcane', abilityTags: ['defensive', 'buff'],
    cooldown: 12, castTime: 0.20, executionTime: 0.05, range: 0, duration: 4,
    iconAssetId: 'icon:ability-shield',
  },
  {
    id: 'ability.ice-spear', kind: 'ability', metadata,
    name: 'Ice Spear', description: 'Launch a piercing frost projectile that applies frost.',
    executorId: 'ice-spear', targeting: 'directional', castStyle: 'cast-time', resource: 'cooldown-only',
    element: 'frost', abilityTags: ['projectile', 'ice', 'damage', 'crowd-control', 'status'],
    cooldown: 6, castTime: 0.30, executionTime: 0.05, range: 14, damage: 38, statusDuration: 4,
    iconAssetId: 'icon:ability-ice-spear',
  },
];
