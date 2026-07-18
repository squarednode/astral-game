import type { DefinitionMetadata } from '../../../engine/definitions';
import type {
  AiAbilityUsageDefinition,
  CombatTagDefinition,
  DamageProfileDefinition,
  ProjectileDefinition,
  StatusEffectDefinition,
  TelegraphDefinition,
} from './CombatLibraryTypes';

export const COMBAT_LIBRARY_SCHEMA_VERSION = 1;

const metadata = (kind: string): DefinitionMetadata => ({
  schemaVersion: COMBAT_LIBRARY_SCHEMA_VERSION,
  contentVersion: '0.6.0c',
  source: 'src/game/definitions/combat/CombatLibraryDefinitions.ts',
  tags: ['combat-library', kind, 'enemy-ready'],
});

type ProjectileSeed = Omit<ProjectileDefinition, 'kind' | 'metadata'>;
type StatusSeed = Omit<StatusEffectDefinition, 'kind' | 'metadata'>;
type TelegraphSeed = Omit<TelegraphDefinition, 'kind' | 'metadata'>;
type DamageSeed = Omit<DamageProfileDefinition, 'kind' | 'metadata'>;
type AiUsageSeed = readonly [string, string, string, number, number, number, number, number];

export const combatTagDefinitions: readonly CombatTagDefinition[] = [
  ['projectile', 'delivery', 'Travels through space before resolving.'],
  ['melee', 'delivery', 'Resolves near the caster.'],
  ['area', 'delivery', 'Affects an area rather than one target.'],
  ['movement', 'purpose', 'Moves or repositions the actor.'],
  ['mobility', 'purpose', 'Provides tactical repositioning.'],
  ['defensive', 'purpose', 'Prevents, absorbs, or restores damage.'],
  ['damage', 'purpose', 'Primarily deals damage.'],
  ['buff', 'purpose', 'Applies a beneficial effect.'],
  ['status', 'purpose', 'Applies a persistent status effect.'],
  ['crowd-control', 'control', 'Restricts movement or actions.'],
  ['fire', 'element', 'Deals or supports fire damage.'],
  ['ice', 'element', 'Deals frost damage or slows targets.'],
  ['lightning', 'element', 'Deals lightning damage or chains.'],
  ['poison', 'element', 'Deals poison damage over time.'],
  ['physical', 'element', 'Deals physical damage.'],
  ['summon', 'purpose', 'Creates another combat entity.'],
  ['heal', 'purpose', 'Restores health.'],
  ['interruptible', 'cast', 'May be interrupted before commitment.'],
  ['channeled', 'cast', 'Continues resolving while maintained.'],
  ['boss', 'actor', 'Intended for committed boss mechanics.'],
].map(([name, category, description]) => ({
  id: `combat-tag.${name}`,
  kind: 'combat-tag' as const,
  metadata: metadata('combat-tag'),
  name,
  category: category as CombatTagDefinition['category'],
  description,
}));

const projectileSeeds: readonly ProjectileSeed[] = [
  { id: 'projectile.arrow', name: 'Arrow', motion: 'linear', speed: 18, radius: 0.12, lifetime: 1.5, pierce: 0, bounce: 0, homingStrength: 0 },
  { id: 'projectile.fire-bolt', name: 'Fire Bolt', motion: 'linear', speed: 15, radius: 0.24, lifetime: 1.7, pierce: 0, bounce: 0, homingStrength: 0 },
  { id: 'projectile.ice-bolt', name: 'Ice Bolt', motion: 'linear', speed: 14, radius: 0.22, lifetime: 1.8, pierce: 0, bounce: 0, homingStrength: 0 },
  { id: 'projectile.magic-missile', name: 'Magic Missile', motion: 'homing', speed: 12, radius: 0.20, lifetime: 2.2, pierce: 0, bounce: 0, homingStrength: 4 },
  { id: 'projectile.piercing-shot', name: 'Piercing Shot', motion: 'linear', speed: 21, radius: 0.14, lifetime: 1.5, pierce: 3, bounce: 0, homingStrength: 0 },
  { id: 'projectile.spread-pellet', name: 'Spread Pellet', motion: 'linear', speed: 16, radius: 0.13, lifetime: 1.0, pierce: 0, bounce: 0, homingStrength: 0 },
  { id: 'projectile.fireball', name: 'Player Fireball', motion: 'linear', speed: 14, radius: 0.26, lifetime: 1.0, pierce: 0, bounce: 0, homingStrength: 0 },
  { id: 'projectile.ice-spear', name: 'Player Ice Spear', motion: 'linear', speed: 17, radius: 0.18, lifetime: 1.0, pierce: 1, bounce: 0, homingStrength: 0 },
];
export const projectileDefinitions: readonly ProjectileDefinition[] = projectileSeeds.map(definition => ({ ...definition, kind: 'projectile' as const, metadata: metadata('projectile') }));

const statusSeeds: readonly StatusSeed[] = [
  { id: 'status.burn', name: 'Burn', description: 'Periodic fire damage.', duration: 4, tickInterval: 1, powerPerTick: 5, maximumStacks: 3, stackingRule: 'stack-intensity', tags: ['fire', 'damage', 'status'] },
  { id: 'status.frost', name: 'Frost', description: 'Reduces movement speed.', duration: 4, movementMultiplier: 0.58, maximumStacks: 1, stackingRule: 'refresh', tags: ['ice', 'crowd-control', 'status'] },
  { id: 'status.shock', name: 'Shock', description: 'Marks a target for lightning interactions.', duration: 3.5, maximumStacks: 1, stackingRule: 'refresh', tags: ['lightning', 'status'] },
  { id: 'status.poison', name: 'Poison', description: 'Stacking poison damage over time.', duration: 6, tickInterval: 1, powerPerTick: 4, maximumStacks: 5, stackingRule: 'stack-intensity', tags: ['poison', 'damage', 'status'] },
  { id: 'status.barrier', name: 'Barrier', description: 'Absorbs or reduces incoming damage.', duration: 4, maximumStacks: 1, stackingRule: 'replace', tags: ['defensive', 'buff'] },
  { id: 'status.regeneration', name: 'Regeneration', description: 'Restores health over time.', duration: 6, tickInterval: 1, powerPerTick: 5, maximumStacks: 1, stackingRule: 'refresh', tags: ['heal', 'buff', 'status'] },
  { id: 'status.stun', name: 'Stun', description: 'Prevents movement and actions.', duration: 1.25, movementMultiplier: 0, maximumStacks: 1, stackingRule: 'replace', tags: ['crowd-control', 'status'] },
];
export const statusEffectDefinitions: readonly StatusEffectDefinition[] = statusSeeds.map(definition => ({ ...definition, kind: 'status-effect' as const, metadata: metadata('status-effect') }));

const telegraphSeeds: readonly TelegraphSeed[] = [
  { id: 'telegraph.melee-small', name: 'Small Melee Arc', shape: 'cone', duration: 0.35, length: 2.5, angleDegrees: 70, followsCaster: true, colorToken: 'danger' },
  { id: 'telegraph.melee-heavy', name: 'Heavy Melee Arc', shape: 'cone', duration: 0.8, length: 3.5, angleDegrees: 90, followsCaster: true, colorToken: 'warning' },
  { id: 'telegraph.line-shot', name: 'Line Shot', shape: 'line', duration: 0.55, length: 22, width: 0.5, followsCaster: true, colorToken: 'danger' },
  { id: 'telegraph.circle-small', name: 'Small Ground Circle', shape: 'circle', duration: 0.75, radius: 3.5, followsCaster: false, colorToken: 'danger' },
  { id: 'telegraph.circle-large', name: 'Large Ground Circle', shape: 'circle', duration: 1.2, radius: 6, followsCaster: false, colorToken: 'warning' },
  { id: 'telegraph.nova', name: 'Nova', shape: 'nova', duration: 0.8, radius: 5, followsCaster: true, colorToken: 'danger' },
  { id: 'telegraph.poison-cloud', name: 'Poison Cloud', shape: 'ground-marker', duration: 0.65, radius: 4, followsCaster: false, colorToken: 'poison' },
];
export const telegraphDefinitions: readonly TelegraphDefinition[] = telegraphSeeds.map(definition => ({ ...definition, kind: 'telegraph' as const, metadata: metadata('telegraph') }));

const damageSeeds: readonly DamageSeed[] = [
  { id: 'damage.physical', name: 'Physical', element: 'physical', canCrit: true, armorInteraction: 'normal', tags: ['physical', 'damage'] },
  { id: 'damage.fire', name: 'Fire', element: 'fire', canCrit: true, armorInteraction: 'normal', statusEffectId: 'status.burn', tags: ['fire', 'damage'] },
  { id: 'damage.frost', name: 'Frost', element: 'frost', canCrit: true, armorInteraction: 'normal', statusEffectId: 'status.frost', tags: ['ice', 'damage', 'crowd-control'] },
  { id: 'damage.lightning', name: 'Lightning', element: 'lightning', canCrit: true, armorInteraction: 'normal', statusEffectId: 'status.shock', tags: ['lightning', 'damage'] },
  { id: 'damage.poison', name: 'Poison', element: 'poison', canCrit: false, armorInteraction: 'normal', statusEffectId: 'status.poison', tags: ['poison', 'damage', 'status'] },
  { id: 'damage.healing', name: 'Healing', element: 'healing', canCrit: false, armorInteraction: 'healing', tags: ['heal'] },
  { id: 'damage.barrier', name: 'Barrier', element: 'barrier', canCrit: false, armorInteraction: 'barrier', statusEffectId: 'status.barrier', tags: ['defensive', 'buff'] },
];
export const damageProfileDefinitions: readonly DamageProfileDefinition[] = damageSeeds.map(definition => ({ ...definition, kind: 'damage-profile' as const, metadata: metadata('damage-profile') }));

const aiUsageSeeds: readonly AiUsageSeed[] = [
  ['usage.grunt-strike', 'Grunt Strike', 'ability.melee-strike', 8, 0, 2.4, 1.5, 0.70],
  ['usage.grunt-cleave', 'Grunt Cleave', 'ability.melee-cleave', 3, 0, 3.2, 1.8, 0.70],
  ['usage.brute-slam', 'Brute Heavy Slam', 'ability.heavy-slam', 5, 0, 3.8, 2.4, 0.55],
  ['usage.brute-charge', 'Brute Charge', 'ability.charge', 3, 4, 15, 9, 0.45],
  ['usage.archer-arrow', 'Archer Arrow', 'ability.arrow-shot', 8, 5, 24, 20, 0.70],
  ['usage.archer-pierce', 'Archer Piercing Shot', 'ability.piercing-shot', 3, 8, 24, 20, 0.65],
  ['usage.archer-retreat', 'Archer Retreat', 'ability.retreat', 4, 0, 6, 3, 0.50],
  ['usage.fire-mage-bolt', 'Fire Mage Bolt', 'ability.fire-bolt', 7, 5, 24, 20, 0.65],
  ['usage.fire-mage-pool', 'Fire Mage Ground Fire', 'ability.ground-fire', 3, 4, 18, 14, 0.55],
  ['usage.frost-mage-bolt', 'Frost Mage Bolt', 'ability.ice-bolt', 7, 5, 24, 20, 0.65],
  ['usage.frost-mage-nova', 'Frost Mage Nova', 'ability.frost-nova', 4, 0, 6, 3, 0.50],
  ['usage.assassin-strike', 'Assassin Strike', 'ability.melee-strike', 9, 0, 2.6, 1.6, 0.60],
  ['usage.assassin-dash', 'Assassin Dash', 'ability.dash', 6, 3, 14, 7, 0.45],
  ['usage.assassin-retreat', 'Assassin Retreat', 'ability.retreat', 3, 0, 3.5, 2.5, 0.45],
  ['usage.crab-pinch', 'Crab Pinch', 'ability.melee-strike', 8, 0, 2.3, 1.4, 0.70],
  ['usage.crab-slam', 'Crab Slam', 'ability.heavy-slam', 3, 0, 3.4, 2.1, 0.60],
  ['usage.wolf-bite', 'Wolf Bite', 'ability.melee-strike', 9, 0, 2.5, 1.5, 0.55],
  ['usage.wolf-lunge', 'Wolf Lunge', 'ability.charge', 5, 3, 12, 6, 0.40],
  ['usage.mother-wolf-howl', 'Mother Wolf Howl', 'ability.barrier', 3, 0, 10, 4, 0.30],
  ['usage.boss-slam', 'Boss Slam', 'ability.heavy-slam', 7, 0, 4.5, 2.5, 0.00],
  ['usage.boss-leap', 'Boss Leap', 'ability.leap', 4, 5, 18, 10, 0.00],
  ['usage.boss-projectile', 'Boss Projectile', 'ability.magic-missile', 4, 6, 26, 16, 0.00],
  ['usage.boss-roar', 'Boss Roar', 'ability.barrier', 2, 0, 12, 6, 0.00],
];
export const aiAbilityUsageDefinitions: readonly AiAbilityUsageDefinition[] = aiUsageSeeds.map(([id, name, abilityId, weight, minimumRange, maximumRange, preferredRange, commitmentThreshold]) => ({
  id,
  kind: 'ai-ability-usage' as const,
  metadata: metadata('ai-ability-usage'),
  name,
  abilityId,
  weight,
  minimumRange,
  maximumRange,
  preferredRange,
  minimumHealthPercent: 0,
  maximumHealthPercent: 1,
  initialDelay: 0,
  cooldownMultiplier: 1,
  powerMultiplier: 1,
  requiresLineOfSight: true,
  commitmentThreshold,
}));
