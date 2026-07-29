import { Color3 } from '@babylonjs/core';
import type { DefinitionBase } from '../../engine/definitions';
import type { GearFamily } from '../../ui/party/PartyManagementTypes';

export type CharacterElement =
  | 'physical'
  | 'fire'
  | 'frost'
  | 'lightning'
  | 'arcane';

export interface CharacterDefinition extends DefinitionBase {
  readonly kind: 'character';
  readonly name: string;
  readonly role: string;
  readonly element: CharacterElement;
  readonly color: Color3;
  readonly maxHp: number;
  readonly speed: number;
  readonly attackDamage: number;
  readonly attackRange: number;
  readonly attackCooldown: number;
  readonly basicAttackName: string;
  readonly basicAttackStyle: 'melee-arc' | 'heavy-melee' | 'projectile' | 'rapid-melee';
  readonly basicAttackPierce: number;
  readonly identityTitle: string;
  readonly identitySummary: string;
  readonly combatStyle: string;
  readonly preferredFamily: GearFamily;
}

export const CHARACTER_DEFINITION_SCHEMA_VERSION = 1;

export function validateCharacterDefinition(
  definition: Readonly<CharacterDefinition>,
): readonly string[] {
  const errors: string[] = [];

  if (!definition.name.trim()) errors.push('Name cannot be empty.');
  if (!definition.role.trim()) errors.push('Role cannot be empty.');
  if (definition.maxHp <= 0) errors.push('maxHp must be greater than zero.');
  if (definition.speed <= 0) errors.push('speed must be greater than zero.');
  if (definition.attackDamage < 0) errors.push('attackDamage cannot be negative.');
  if (definition.attackRange <= 0) errors.push('attackRange must be greater than zero.');
  if (definition.attackCooldown <= 0) errors.push('attackCooldown must be greater than zero.');
  if (!definition.basicAttackName.trim()) errors.push('basicAttackName cannot be empty.');
  if (!definition.identityTitle.trim()) errors.push('identityTitle cannot be empty.');
  if (!definition.identitySummary.trim()) errors.push('identitySummary cannot be empty.');
  if (!definition.combatStyle.trim()) errors.push('combatStyle cannot be empty.');

  return errors;
}

const sharedMetadata = {
  schemaVersion: CHARACTER_DEFINITION_SCHEMA_VERSION,
  contentVersion: '0.6.8.0',
  source: 'src/game/definitions/CharacterDefinitions.ts',
  tags: ['playable', 'party'],
} as const;

export const characterDefinitions: readonly CharacterDefinition[] = [
  {
    id: 'vanguard',
    kind: 'character',
    metadata: sharedMetadata,
    name: 'Warrior',
    role: 'Front-line warrior',
    preferredFamily: 'fortified',
    element: 'physical',
    color: new Color3(0.85, 0.28, 0.22),
    maxHp: 10,
    speed: 7.0,
    attackDamage: 1.0,
    attackRange: 1.45,
    attackCooldown: 0.68,
    basicAttackName: 'Warrior Strike',
    basicAttackStyle: 'melee-arc',
    basicAttackPierce: 0,
    identityTitle: 'Warrior',
    identitySummary: 'A durable close-range fighter with the highest starting health.',
    combatStyle: 'Narrow melee · durability · stagger',
  },
  {
    id: 'warden',
    kind: 'character',
    metadata: sharedMetadata,
    name: 'Mage',
    role: 'Ranged mage',
    preferredFamily: 'fortified',
    element: 'frost',
    color: new Color3(0.28, 0.72, 1),
    maxHp: 6,
    speed: 6.5,
    attackDamage: 1.2,
    attackRange: 7.5,
    attackCooldown: 0.78,
    basicAttackName: 'Arcane Bolt',
    basicAttackStyle: 'projectile',
    basicAttackPierce: 1,
    identityTitle: 'Mage',
    identitySummary: 'A fragile ranged caster with strong unarmed magical damage.',
    combatStyle: 'Ranged magic · control · low health',
  },
  {
    id: 'hunter-mara',
    kind: 'character',
    metadata: sharedMetadata,
    name: 'Hunter',
    role: 'Physical hunter',
    preferredFamily: 'focused',
    element: 'physical',
    color: new Color3(0.34, 0.72, 0.42),
    maxHp: 8,
    speed: 7.4,
    attackDamage: 1.0,
    attackRange: 8.0,
    attackCooldown: 0.68,
    basicAttackName: 'Hunter Shot',
    basicAttackStyle: 'projectile',
    basicAttackPierce: 0,
    identityTitle: 'Hunter',
    identitySummary: 'A mobile physical ranged specialist unlocked through the wolf hunt.',
    combatStyle: 'Ranged physical · precision · mobility',
  },
  {
    id: 'tempest',
    kind: 'character',
    metadata: sharedMetadata,
    name: 'Rogue',
    role: 'Fast rogue',
    preferredFamily: 'focused',
    element: 'lightning',
    color: new Color3(0.72, 0.42, 1),
    maxHp: 8,
    speed: 8.2,
    attackDamage: 1.2,
    attackRange: 1.05,
    attackCooldown: 0.38,
    basicAttackName: 'Rogue Jab',
    basicAttackStyle: 'rapid-melee',
    basicAttackPierce: 0,
    identityTitle: 'Rogue',
    identitySummary: 'A fast close-range attacker with a very narrow, precise strike.',
    combatStyle: 'Very narrow melee · speed · evasion',
  },
];
