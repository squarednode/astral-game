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
  if (!definition.identityTitle.trim()) errors.push('identityTitle cannot be empty.');
  if (!definition.identitySummary.trim()) errors.push('identitySummary cannot be empty.');
  if (!definition.combatStyle.trim()) errors.push('combatStyle cannot be empty.');

  return errors;
}

const sharedMetadata = {
  schemaVersion: CHARACTER_DEFINITION_SCHEMA_VERSION,
  contentVersion: '0.5.5.2',
  source: 'src/game/definitions/CharacterDefinitions.ts',
  tags: ['playable', 'party'],
} as const;

export const characterDefinitions: readonly CharacterDefinition[] = [
  {
    id: 'vanguard',
    kind: 'character',
    metadata: sharedMetadata,
    name: 'Vanguard',
    role: 'Shatter bruiser',
    preferredFamily: 'agile',
    element: 'physical',
    color: new Color3(0.85, 0.28, 0.22),
    maxHp: 170,
    speed: 7.0,
    attackDamage: 24,
    attackRange: 2.2,
    attackCooldown: 0.52,
    identityTitle: 'Astral Vanguard',
    identitySummary: 'A durable front-line breaker who turns pressure into decisive openings.',
    combatStyle: 'Close-range bruiser · stagger · survival',
  },
  {
    id: 'warden',
    kind: 'character',
    metadata: sharedMetadata,
    name: 'Warden',
    role: 'Frost support',
    preferredFamily: 'fortified',
    element: 'frost',
    color: new Color3(0.28, 0.72, 1),
    maxHp: 130,
    speed: 6.5,
    attackDamage: 16,
    attackRange: 7.0,
    attackCooldown: 0.72,
    identityTitle: 'Frost Warden',
    identitySummary: 'A ranged protector who controls space and stabilizes the party.',
    combatStyle: 'Ranged control · protection · frost',
  },
  {
    id: 'hunter-mara',
    kind: 'character',
    metadata: sharedMetadata,
    name: 'Hunter Mara',
    role: 'Ranged hunter',
    preferredFamily: 'focused',
    element: 'physical',
    color: new Color3(0.34, 0.72, 0.42),
    maxHp: 125,
    speed: 7.4,
    attackDamage: 18,
    attackRange: 8.0,
    attackCooldown: 0.62,
    identityTitle: 'Wilds Hunter',
    identitySummary: 'A mobile ranged specialist who isolates priority targets and controls pursuit lanes.',
    combatStyle: 'Ranged precision · mobility · pursuit',
  },
  {
    id: 'tempest',
    kind: 'character',
    metadata: sharedMetadata,
    name: 'Tempest',
    role: 'Lightning assassin',
    preferredFamily: 'focused',
    element: 'lightning',
    color: new Color3(0.72, 0.42, 1),
    maxHp: 115,
    speed: 8.2,
    attackDamage: 19,
    attackRange: 3.0,
    attackCooldown: 0.36,
    identityTitle: 'Tempest Striker',
    identitySummary: 'A high-speed assassin who attacks from shifting angles and escapes retaliation.',
    combatStyle: 'Burst · mobility · elemental pressure',
  },
];
