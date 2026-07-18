import type { DefinitionBase, DefinitionMetadata } from '../../engine/definitions';

export type EnemyCombatRole = 'grunt' | 'brute' | 'archer' | 'fire-mage' | 'frost-caster' | 'assassin';
export type EnemyBehaviorPolicy = 'standard' | 'elite' | 'boss';
export type EnemyVariantId = 'goblin' | 'skeleton' | 'bandit' | 'astral';
export type EliteModifierId = 'none' | 'frozen' | 'burning' | 'fast' | 'heavy' | 'arcane' | 'shielded';

export interface EnemyAbilityReference {
  readonly usageId: string;
  readonly role: 'primary' | 'secondary' | 'escape' | 'defensive';
}

export interface EnemyDefinition extends DefinitionBase {
  readonly kind: 'enemy';
  readonly name: string;
  readonly role: EnemyCombatRole;
  readonly policy: EnemyBehaviorPolicy;
  readonly maxHp: number;
  readonly movementSpeed: number;
  readonly baseDamage: number;
  readonly detectionRange: number;
  readonly preferredRange: number;
  readonly leashRange: number;
  readonly recoverDuration: number;
  readonly abilityUsage: readonly EnemyAbilityReference[];
  readonly color: readonly [number, number, number];
}

export interface EnemyVariantDefinition extends DefinitionBase {
  readonly kind: 'enemy-variant';
  readonly name: string;
  readonly variantId: EnemyVariantId;
  readonly hpMultiplier: number;
  readonly speedMultiplier: number;
  readonly damageMultiplier: number;
}

export interface EliteModifierDefinition extends DefinitionBase {
  readonly kind: 'elite-modifier';
  readonly name: string;
  readonly modifierId: EliteModifierId;
  readonly hpMultiplier: number;
  readonly speedMultiplier: number;
  readonly damageMultiplier: number;
  readonly colorShift: readonly [number, number, number];
}

export const ENEMY_DEFINITION_SCHEMA_VERSION = 1;
const metadata = (kind: string): DefinitionMetadata => ({
  schemaVersion: ENEMY_DEFINITION_SCHEMA_VERSION,
  contentVersion: '0.6.1',
  source: 'src/game/definitions/EnemyDefinitions.ts',
  tags: ['enemy', kind, 'phase-2'],
});

export const enemyDefinitions: readonly EnemyDefinition[] = [
  { id: 'enemy.grunt', kind: 'enemy', metadata: metadata('archetype'), name: 'Grunt', role: 'grunt', policy: 'standard', maxHp: 64, movementSpeed: 3.0, baseDamage: 8, detectionRange: 26, preferredRange: 1.6, leashRange: 32, recoverDuration: 0.35, abilityUsage: [{ usageId: 'usage.grunt-strike', role: 'primary' }, { usageId: 'usage.grunt-cleave', role: 'secondary' }], color: [0.34, 0.52, 0.34] },
  { id: 'enemy.brute', kind: 'enemy', metadata: metadata('archetype'), name: 'Brute', role: 'brute', policy: 'standard', maxHp: 145, movementSpeed: 2.15, baseDamage: 13, detectionRange: 28, preferredRange: 2.4, leashRange: 34, recoverDuration: 0.65, abilityUsage: [{ usageId: 'usage.brute-slam', role: 'primary' }, { usageId: 'usage.brute-charge', role: 'secondary' }], color: [0.48, 0.34, 0.22] },
  { id: 'enemy.archer', kind: 'enemy', metadata: metadata('archetype'), name: 'Archer', role: 'archer', policy: 'standard', maxHp: 54, movementSpeed: 2.75, baseDamage: 7, detectionRange: 30, preferredRange: 20, leashRange: 36, recoverDuration: 0.45, abilityUsage: [{ usageId: 'usage.archer-arrow', role: 'primary' }, { usageId: 'usage.archer-pierce', role: 'secondary' }, { usageId: 'usage.archer-retreat', role: 'escape' }], color: [0.38, 0.44, 0.64] },
  { id: 'enemy.fire-mage', kind: 'enemy', metadata: metadata('archetype'), name: 'Fire Mage', role: 'fire-mage', policy: 'standard', maxHp: 62, movementSpeed: 2.45, baseDamage: 9, detectionRange: 30, preferredRange: 20, leashRange: 36, recoverDuration: 0.55, abilityUsage: [{ usageId: 'usage.fire-mage-bolt', role: 'primary' }, { usageId: 'usage.fire-mage-pool', role: 'secondary' }], color: [0.72, 0.25, 0.12] },
  { id: 'enemy.frost-caster', kind: 'enemy', metadata: metadata('archetype'), name: 'Frost Caster', role: 'frost-caster', policy: 'standard', maxHp: 68, movementSpeed: 2.4, baseDamage: 8, detectionRange: 30, preferredRange: 20, leashRange: 36, recoverDuration: 0.55, abilityUsage: [{ usageId: 'usage.frost-mage-bolt', role: 'primary' }, { usageId: 'usage.frost-mage-nova', role: 'secondary' }, { usageId: 'usage.archer-retreat', role: 'escape' }], color: [0.22, 0.56, 0.78] },
  { id: 'enemy.assassin', kind: 'enemy', metadata: metadata('archetype'), name: 'Assassin', role: 'assassin', policy: 'standard', maxHp: 58, movementSpeed: 3.65, baseDamage: 10, detectionRange: 28, preferredRange: 3.5, leashRange: 34, recoverDuration: 0.28, abilityUsage: [{ usageId: 'usage.grunt-strike', role: 'primary' }, { usageId: 'usage.archer-retreat', role: 'escape' }, { usageId: 'usage.archer-pierce', role: 'secondary' }], color: [0.48, 0.25, 0.58] },
];

export const enemyVariantDefinitions: readonly EnemyVariantDefinition[] = [
  { id: 'enemy-variant.goblin', kind: 'enemy-variant', metadata: metadata('variant'), name: 'Goblin', variantId: 'goblin', hpMultiplier: 0.9, speedMultiplier: 1.08, damageMultiplier: 0.95 },
  { id: 'enemy-variant.skeleton', kind: 'enemy-variant', metadata: metadata('variant'), name: 'Skeleton', variantId: 'skeleton', hpMultiplier: 1.05, speedMultiplier: 0.96, damageMultiplier: 1.05 },
  { id: 'enemy-variant.bandit', kind: 'enemy-variant', metadata: metadata('variant'), name: 'Bandit', variantId: 'bandit', hpMultiplier: 1, speedMultiplier: 1, damageMultiplier: 1 },
  { id: 'enemy-variant.astral', kind: 'enemy-variant', metadata: metadata('variant'), name: 'Astral', variantId: 'astral', hpMultiplier: 1.12, speedMultiplier: 1.03, damageMultiplier: 1.1 },
];

export const eliteModifierDefinitions: readonly EliteModifierDefinition[] = [
  { id: 'elite-modifier.none', kind: 'elite-modifier', metadata: metadata('modifier'), name: 'None', modifierId: 'none', hpMultiplier: 1, speedMultiplier: 1, damageMultiplier: 1, colorShift: [0, 0, 0] },
  { id: 'elite-modifier.frozen', kind: 'elite-modifier', metadata: metadata('modifier'), name: 'Frozen', modifierId: 'frozen', hpMultiplier: 1.3, speedMultiplier: 0.9, damageMultiplier: 1.15, colorShift: [0.05, 0.2, 0.3] },
  { id: 'elite-modifier.burning', kind: 'elite-modifier', metadata: metadata('modifier'), name: 'Burning', modifierId: 'burning', hpMultiplier: 1.25, speedMultiplier: 1, damageMultiplier: 1.3, colorShift: [0.3, 0.05, 0] },
  { id: 'elite-modifier.fast', kind: 'elite-modifier', metadata: metadata('modifier'), name: 'Fast', modifierId: 'fast', hpMultiplier: 1.15, speedMultiplier: 1.35, damageMultiplier: 1.05, colorShift: [0.15, 0.15, 0] },
  { id: 'elite-modifier.heavy', kind: 'elite-modifier', metadata: metadata('modifier'), name: 'Heavy', modifierId: 'heavy', hpMultiplier: 1.7, speedMultiplier: 0.78, damageMultiplier: 1.35, colorShift: [0.12, 0.08, 0.05] },
  { id: 'elite-modifier.arcane', kind: 'elite-modifier', metadata: metadata('modifier'), name: 'Arcane', modifierId: 'arcane', hpMultiplier: 1.35, speedMultiplier: 1.05, damageMultiplier: 1.25, colorShift: [0.2, 0.05, 0.25] },
  { id: 'elite-modifier.shielded', kind: 'elite-modifier', metadata: metadata('modifier'), name: 'Shielded', modifierId: 'shielded', hpMultiplier: 1.55, speedMultiplier: 0.92, damageMultiplier: 1.05, colorShift: [0.08, 0.18, 0.2] },
];

export function validateEnemyDefinition(definition: Readonly<EnemyDefinition>): readonly string[] {
  const errors: string[] = [];
  if (!definition.name.trim()) errors.push('Name cannot be empty.');
  if (definition.maxHp <= 0) errors.push('maxHp must be greater than zero.');
  if (definition.movementSpeed <= 0) errors.push('movementSpeed must be greater than zero.');
  if (definition.detectionRange <= 0) errors.push('detectionRange must be greater than zero.');
  if (definition.preferredRange < 0) errors.push('preferredRange cannot be negative.');
  if (definition.abilityUsage.length === 0) errors.push('At least one ability usage is required.');
  return errors;
}
export const validateEnemyVariantDefinition = (definition: Readonly<EnemyVariantDefinition>): readonly string[] => definition.hpMultiplier > 0 && definition.speedMultiplier > 0 && definition.damageMultiplier > 0 ? [] : ['Variant multipliers must be greater than zero.'];
export const validateEliteModifierDefinition = (definition: Readonly<EliteModifierDefinition>): readonly string[] => definition.hpMultiplier > 0 && definition.speedMultiplier > 0 && definition.damageMultiplier > 0 ? [] : ['Modifier multipliers must be greater than zero.'];
