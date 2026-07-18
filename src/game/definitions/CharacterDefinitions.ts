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
  readonly qName: string;
  readonly eName: string;
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
  if (!definition.qName.trim()) errors.push('qName cannot be empty.');
  if (!definition.eName.trim()) errors.push('eName cannot be empty.');

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
    qName: 'Ground Breaker',
    eName: 'War Cry',
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
    qName: 'Frost Field',
    eName: 'Ice Barrier',
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
    qName: 'Chain Arc',
    eName: 'Blink Strike',
  },
];
