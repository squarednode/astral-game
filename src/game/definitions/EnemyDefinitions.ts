import type { DefinitionBase, DefinitionMetadata } from '../../engine/definitions';

export type EnemyCombatRole = 'grunt' | 'brute' | 'archer' | 'fire-mage' | 'frost-caster' | 'assassin' | 'crab' | 'wolf' | 'mother-wolf' | 'boss';
export type EnemyBehaviorPolicy = 'standard' | 'elite' | 'boss';
export type EnemyMovementStyle = 'pressure' | 'hold-range' | 'skirmish' | 'hit-and-run' | 'tank' | 'leader' | 'boss';
export type EnemyVariantId = 'goblin' | 'skeleton' | 'bandit' | 'astral';
export type EnemyFamilyId = 'humanoid' | 'crab' | 'wolf' | 'boss';
export type EnemySpawnClass = 'common' | 'leader' | 'boss';
export type EliteModifierId = 'none' | 'frozen' | 'burning' | 'fast' | 'heavy' | 'arcane' | 'shielded';

export interface EnemyAbilityReference {
  readonly usageId: string;
  readonly role: 'primary' | 'secondary' | 'escape' | 'defensive';
}

export interface EnemyFamilyDefinition extends DefinitionBase {
  readonly kind: 'enemy-family';
  readonly name: string;
  readonly familyId: EnemyFamilyId;
  readonly sharedTags: readonly string[];
  readonly alertRadius: number;
}

export interface EnemyDefinition extends DefinitionBase {
  readonly kind: 'enemy';
  readonly name: string;
  readonly role: EnemyCombatRole;
  readonly familyId: EnemyFamilyId;
  readonly spawnClass: EnemySpawnClass;
  readonly policy: EnemyBehaviorPolicy;
  readonly movementStyle: EnemyMovementStyle;
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

export const enemyFamilyDefinitions: readonly EnemyFamilyDefinition[] = [
  { id: 'enemy-family.humanoid', kind: 'enemy-family', metadata: metadata('family'), name: 'Humanoid', familyId: 'humanoid', sharedTags: ['humanoid'], alertRadius: 8 },
  { id: 'enemy-family.crab', kind: 'enemy-family', metadata: metadata('family'), name: 'Shore Crab', familyId: 'crab', sharedTags: ['beast', 'shore', 'armored'], alertRadius: 6 },
  { id: 'enemy-family.wolf', kind: 'enemy-family', metadata: metadata('family'), name: 'Wolf Pack', familyId: 'wolf', sharedTags: ['beast', 'pack'], alertRadius: 12 },
  { id: 'enemy-family.boss', kind: 'enemy-family', metadata: metadata('family'), name: 'World Boss', familyId: 'boss', sharedTags: ['boss', 'committed'], alertRadius: 20 },
];

export const enemyDefinitions: readonly EnemyDefinition[] = [
  { id: 'enemy.grunt', kind: 'enemy', metadata: metadata('archetype'), name: 'Grunt', role: 'grunt', familyId: 'humanoid', spawnClass: 'common', policy: 'standard', movementStyle: 'pressure', maxHp: 64, movementSpeed: 3.0, baseDamage: 8, detectionRange: 26, preferredRange: 1.6, leashRange: 32, recoverDuration: 0.35, abilityUsage: [{ usageId: 'usage.grunt-strike', role: 'primary' }, { usageId: 'usage.grunt-cleave', role: 'secondary' }], color: [0.34, 0.52, 0.34] },
  { id: 'enemy.brute', kind: 'enemy', metadata: metadata('archetype'), name: 'Brute', role: 'brute', familyId: 'humanoid', spawnClass: 'common', policy: 'standard', movementStyle: 'tank', maxHp: 145, movementSpeed: 2.15, baseDamage: 13, detectionRange: 28, preferredRange: 2.4, leashRange: 34, recoverDuration: 0.65, abilityUsage: [{ usageId: 'usage.brute-slam', role: 'primary' }, { usageId: 'usage.brute-charge', role: 'secondary' }], color: [0.48, 0.34, 0.22] },
  { id: 'enemy.archer', kind: 'enemy', metadata: metadata('archetype'), name: 'Archer', role: 'archer', familyId: 'humanoid', spawnClass: 'common', policy: 'standard', movementStyle: 'hold-range', maxHp: 54, movementSpeed: 2.75, baseDamage: 7, detectionRange: 30, preferredRange: 20, leashRange: 36, recoverDuration: 0.45, abilityUsage: [{ usageId: 'usage.archer-arrow', role: 'primary' }, { usageId: 'usage.archer-pierce', role: 'secondary' }, { usageId: 'usage.archer-retreat', role: 'escape' }], color: [0.38, 0.44, 0.64] },
  { id: 'enemy.fire-mage', kind: 'enemy', metadata: metadata('archetype'), name: 'Fire Mage', role: 'fire-mage', familyId: 'humanoid', spawnClass: 'common', policy: 'standard', movementStyle: 'hold-range', maxHp: 62, movementSpeed: 2.45, baseDamage: 9, detectionRange: 30, preferredRange: 20, leashRange: 36, recoverDuration: 0.55, abilityUsage: [{ usageId: 'usage.fire-mage-bolt', role: 'primary' }, { usageId: 'usage.fire-mage-pool', role: 'secondary' }], color: [0.72, 0.25, 0.12] },
  { id: 'enemy.frost-caster', kind: 'enemy', metadata: metadata('archetype'), name: 'Frost Caster', role: 'frost-caster', familyId: 'humanoid', spawnClass: 'common', policy: 'standard', movementStyle: 'hold-range', maxHp: 68, movementSpeed: 2.4, baseDamage: 8, detectionRange: 30, preferredRange: 20, leashRange: 36, recoverDuration: 0.55, abilityUsage: [{ usageId: 'usage.frost-mage-bolt', role: 'primary' }, { usageId: 'usage.frost-mage-nova', role: 'secondary' }, { usageId: 'usage.archer-retreat', role: 'escape' }], color: [0.22, 0.56, 0.78] },
  { id: 'enemy.assassin', kind: 'enemy', metadata: metadata('archetype'), name: 'Assassin', role: 'assassin', familyId: 'humanoid', spawnClass: 'common', policy: 'standard', movementStyle: 'hit-and-run', maxHp: 58, movementSpeed: 3.65, baseDamage: 10, detectionRange: 28, preferredRange: 3.5, leashRange: 34, recoverDuration: 0.28, abilityUsage: [{ usageId: 'usage.assassin-strike', role: 'primary' }, { usageId: 'usage.assassin-dash', role: 'secondary' }, { usageId: 'usage.assassin-retreat', role: 'escape' }], color: [0.48, 0.25, 0.58] },
  { id: 'enemy.crab', kind: 'enemy', metadata: metadata('starter-world'), name: 'Crab', role: 'crab', familyId: 'crab', spawnClass: 'common', policy: 'standard', movementStyle: 'tank', maxHp: 95, movementSpeed: 1.85, baseDamage: 10, detectionRange: 22, preferredRange: 1.5, leashRange: 28, recoverDuration: 0.55, abilityUsage: [{ usageId: 'usage.crab-pinch', role: 'primary' }, { usageId: 'usage.crab-slam', role: 'secondary' }], color: [0.62, 0.28, 0.18] },
  { id: 'enemy.wolf', kind: 'enemy', metadata: metadata('starter-world'), name: 'Wolf', role: 'wolf', familyId: 'wolf', spawnClass: 'common', policy: 'standard', movementStyle: 'skirmish', maxHp: 72, movementSpeed: 3.55, baseDamage: 9, detectionRange: 28, preferredRange: 1.8, leashRange: 36, recoverDuration: 0.25, abilityUsage: [{ usageId: 'usage.wolf-bite', role: 'primary' }, { usageId: 'usage.wolf-lunge', role: 'secondary' }], color: [0.34, 0.32, 0.30] },
  { id: 'enemy.mother-wolf', kind: 'enemy', metadata: metadata('starter-world'), name: 'Mother Wolf', role: 'mother-wolf', familyId: 'wolf', spawnClass: 'leader', policy: 'elite', movementStyle: 'leader', maxHp: 210, movementSpeed: 3.15, baseDamage: 14, detectionRange: 32, preferredRange: 2.2, leashRange: 42, recoverDuration: 0.38, abilityUsage: [{ usageId: 'usage.wolf-bite', role: 'primary' }, { usageId: 'usage.wolf-lunge', role: 'secondary' }, { usageId: 'usage.mother-wolf-howl', role: 'defensive' }], color: [0.48, 0.44, 0.40] },
  { id: 'enemy.world-boss', kind: 'enemy', metadata: metadata('starter-world'), name: 'Boss', role: 'boss', familyId: 'boss', spawnClass: 'boss', policy: 'boss', movementStyle: 'boss', maxHp: 950, movementSpeed: 2.35, baseDamage: 22, detectionRange: 40, preferredRange: 8, leashRange: 60, recoverDuration: 0.8, abilityUsage: [{ usageId: 'usage.boss-slam', role: 'primary' }, { usageId: 'usage.boss-leap', role: 'secondary' }, { usageId: 'usage.boss-projectile', role: 'secondary' }, { usageId: 'usage.boss-roar', role: 'defensive' }], color: [0.34, 0.12, 0.42] },
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
  if (!definition.familyId) errors.push('familyId is required.');
  if (!definition.movementStyle) errors.push('movementStyle is required.');
  if (definition.maxHp <= 0) errors.push('maxHp must be greater than zero.');
  if (definition.movementSpeed <= 0) errors.push('movementSpeed must be greater than zero.');
  if (definition.detectionRange <= 0) errors.push('detectionRange must be greater than zero.');
  if (definition.preferredRange < 0) errors.push('preferredRange cannot be negative.');
  if (definition.abilityUsage.length === 0) errors.push('At least one ability usage is required.');
  return errors;
}
export const validateEnemyVariantDefinition = (definition: Readonly<EnemyVariantDefinition>): readonly string[] => definition.hpMultiplier > 0 && definition.speedMultiplier > 0 && definition.damageMultiplier > 0 ? [] : ['Variant multipliers must be greater than zero.'];
export const validateEliteModifierDefinition = (definition: Readonly<EliteModifierDefinition>): readonly string[] => definition.hpMultiplier > 0 && definition.speedMultiplier > 0 && definition.damageMultiplier > 0 ? [] : ['Modifier multipliers must be greater than zero.'];

export const validateEnemyFamilyDefinition = (definition: Readonly<EnemyFamilyDefinition>): readonly string[] => definition.name.trim() && definition.alertRadius >= 0 ? [] : ['Enemy family requires a name and non-negative alert radius.'];
