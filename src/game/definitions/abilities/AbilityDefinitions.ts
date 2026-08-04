import type { DefinitionBase } from '../../../engine/definitions';
import type { CharacterElement } from '../CharacterDefinitions';

export type AbilityTargetingMode = 'directional' | 'ground' | 'self' | 'target';
export type AbilityCastStyle = 'instant' | 'cast-time' | 'channel' | 'charged' | 'toggle' | 'passive';
export type AbilityQueueBehavior = 'replace' | 'reject' | 'preserve';
export type AbilityResourceType = 'cooldown-only' | 'charges' | 'mana' | 'stamina';
export type AbilityFamily = 'melee' | 'projectile' | 'area' | 'movement' | 'defense' | 'control' | 'summon' | 'buff';

export type AbilityTag =
  | 'projectile' | 'melee' | 'area' | 'movement' | 'mobility'
  | 'fire' | 'ice' | 'lightning' | 'poison' | 'physical'
  | 'defensive' | 'damage' | 'buff' | 'status' | 'crowd-control'
  | 'summon' | 'heal' | 'ultimate' | 'interruptible' | 'channeled' | 'boss';

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

const baseAbilityDefinitions: readonly AbilityDefinition[] = [
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
    executorId: 'defensive', runtimeReady: true, targeting: 'self', castStyle: 'cast-time', element: 'arcane',
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


interface SkillAbilityAliasSpec {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly prototypeId: string;
}

const skillAbilityAliasSpecs: readonly SkillAbilityAliasSpec[] = [
  { id: 'ability.skill.vanguard.cleave', name: 'Cleave', description: 'A broad forward swing that hits multiple enemies.', prototypeId: 'ability.melee-cleave' },
  { id: 'ability.skill.vanguard.ground-breaker', name: 'Ground Breaker', description: 'Slam the ground to damage and stagger enemies around the impact.', prototypeId: 'ability.heavy-slam' },
  { id: 'ability.skill.vanguard.overpower', name: 'Overpower', description: 'Deliver a devastating committed strike with extreme stagger.', prototypeId: 'ability.spin-attack' },
  { id: 'ability.skill.vanguard.brace', name: 'Brace', description: 'Brace against incoming damage and resist interruption.', prototypeId: 'ability.barrier' },
  { id: 'ability.skill.vanguard.guardian-roar', name: 'Guardian Roar', description: 'Challenge nearby enemies and gain temporary protection.', prototypeId: 'ability.shield' },
  { id: 'ability.skill.vanguard.living-bulwark', name: 'Living Bulwark', description: 'Create a powerful defensive aura that protects nearby allies.', prototypeId: 'ability.barrier' },
  { id: 'ability.skill.vanguard.vanguard-charge', name: 'Vanguard Charge', description: 'Rush forward and impact enemies in the destination lane.', prototypeId: 'ability.charge' },
  { id: 'ability.skill.vanguard.warpath', name: 'Warpath', description: 'Enter a short aggressive surge of speed and attack tempo.', prototypeId: 'ability.dash' },
  { id: 'ability.skill.vanguard.juggernaut', name: 'Juggernaut', description: 'Become an unstoppable advancing force while continuously attacking.', prototypeId: 'ability.leap' },
  { id: 'ability.skill.tempest.lunging-strike', name: 'Lunging Strike', description: 'Lunge forward with a precise extended stab.', prototypeId: 'ability.melee-strike' },
  { id: 'ability.skill.tempest.twin-fang', name: 'Twin Fang', description: 'Deliver two rapid focused strikes.', prototypeId: 'ability.melee-cleave' },
  { id: 'ability.skill.tempest.assassinate', name: 'Assassinate', description: 'A devastating strike against isolated or weakened enemies.', prototypeId: 'ability.heavy-slam' },
  { id: 'ability.skill.tempest.dash-strike', name: 'Dash Strike', description: 'Dash through a target and attack from the opposite side.', prototypeId: 'ability.dash' },
  { id: 'ability.skill.tempest.backstep-slash', name: 'Backstep Slash', description: 'Strike while retreating out of melee range.', prototypeId: 'ability.retreat' },
  { id: 'ability.skill.tempest.phantom-rhythm', name: 'Phantom Rhythm', description: 'Chain rapid phasing attacks through nearby targets.', prototypeId: 'ability.blink' },
  { id: 'ability.skill.tempest.poison-blade', name: 'Poison Blade', description: 'Coat the next attacks with a lingering poison effect.', prototypeId: 'ability.poison-cloud' },
  { id: 'ability.skill.tempest.smoke-bomb', name: 'Smoke Bomb', description: 'Create a cloud that disrupts enemy targeting and enables escape.', prototypeId: 'ability.ground-fire' },
  { id: 'ability.skill.tempest.master-of-deception', name: 'Master of Deception', description: 'Vanish and return with a massively empowered opening attack.', prototypeId: 'ability.blink' },
  { id: 'ability.skill.hunter-mara.power-shot', name: 'Power Shot', description: 'Fire a slower, stronger projectile through the target lane.', prototypeId: 'ability.piercing-shot' },
  { id: 'ability.skill.hunter-mara.marked-target', name: 'Marked Target', description: 'Mark a priority target to amplify Hunter damage against it.', prototypeId: 'ability.magic-missile' },
  { id: 'ability.skill.hunter-mara.deadeye', name: 'Deadeye', description: 'Enter a precision state and unleash lethal long-range shots.', prototypeId: 'ability.spread-shot' },
  { id: 'ability.skill.hunter-mara.snare-trap', name: 'Snare Trap', description: 'Place a trap that roots or heavily slows the first enemy.', prototypeId: 'ability.frost-nova' },
  { id: 'ability.skill.hunter-mara.blast-trap', name: 'Blast Trap', description: 'Place an explosive trap that damages nearby enemies.', prototypeId: 'ability.ground-fire' },
  { id: 'ability.skill.hunter-mara.master-trapper', name: 'Master Trapper', description: 'Deploy a coordinated trap field that controls a large area.', prototypeId: 'ability.poison-cloud' },
  { id: 'ability.skill.hunter-mara.retreating-shot', name: 'Retreating Shot', description: 'Leap backward while firing at the nearest threat.', prototypeId: 'ability.retreat' },
  { id: 'ability.skill.hunter-mara.camouflage', name: 'Camouflage', description: 'Reduce enemy awareness and empower the next ranged attack.', prototypeId: 'ability.blink' },
  { id: 'ability.skill.hunter-mara.apex-survivor', name: 'Apex Survivor', description: 'Enter a heightened survival state with speed and recovery.', prototypeId: 'ability.regeneration' },
  { id: 'ability.skill.warden.fire-bolt', name: 'Fire Bolt', description: 'Launch a compact fire projectile that can ignite an enemy.', prototypeId: 'ability.fire-bolt' },
  { id: 'ability.skill.warden.chain-lightning', name: 'Chain Lightning', description: 'Launch lightning that leaps between nearby enemies.', prototypeId: 'ability.magic-missile' },
  { id: 'ability.skill.warden.arcane-cataclysm', name: 'Arcane Cataclysm', description: 'Trigger a devastating elemental detonation around affected enemies.', prototypeId: 'ability.shock-burst' },
  { id: 'ability.skill.warden.frost-nova', name: 'Frost Nova', description: 'Release a frost burst that damages and slows nearby enemies.', prototypeId: 'ability.frost-nova' },
  { id: 'ability.skill.warden.gravity-well', name: 'Gravity Well', description: 'Create a field that draws enemies toward its center.', prototypeId: 'ability.poison-cloud' },
  { id: 'ability.skill.warden.absolute-control', name: 'Absolute Control', description: 'Lock a large area in suspended time and frost.', prototypeId: 'ability.ice-spear' },
  { id: 'ability.skill.warden.magic-barrier', name: 'Magic Barrier', description: 'Create a temporary personal magical shield.', prototypeId: 'ability.shield' },
  { id: 'ability.skill.warden.protective-field', name: 'Protective Field', description: 'Create an area that reduces damage to allies inside it.', prototypeId: 'ability.barrier' },
  { id: 'ability.skill.warden.archmages-refuge', name: "Archmage's Refuge", description: 'Create a powerful sanctuary that shields and restores the party.', prototypeId: 'ability.heal' },
];



const skillAbilityOverrides: Readonly<Record<string, Partial<AbilityDefinition>>> = {
  'ability.skill.vanguard.cleave': { executorId: 'skill-vanguard-cleave', runtimeReady: true, family: 'melee', targeting: 'directional', castStyle: 'cast-time', element: 'physical', cooldown: 4, castTime: 0.22, range: 3.4, radius: 2.2, power: 15, damage: 15, abilityTags: ['melee', 'area', 'physical', 'damage'] },
  'ability.skill.vanguard.ground-breaker': { executorId: 'skill-vanguard-ground-breaker', runtimeReady: true, family: 'area', targeting: 'ground', castStyle: 'cast-time', element: 'physical', cooldown: 8, castTime: 0.55, range: 4.5, radius: 3.2, power: 24, damage: 24, abilityTags: ['area', 'physical', 'damage', 'crowd-control'] },
  'ability.skill.vanguard.overpower': { executorId: 'skill-vanguard-overpower', runtimeReady: true, family: 'melee', targeting: 'directional', castStyle: 'charged', element: 'physical', cooldown: 16, castTime: 0.9, range: 4.2, radius: 1.5, power: 44, damage: 44, abilityTags: ['melee', 'physical', 'damage', 'ultimate', 'crowd-control'] },
  'ability.skill.vanguard.brace': { executorId: 'skill-vanguard-brace', runtimeReady: true, family: 'defense', targeting: 'self', castStyle: 'instant', element: 'physical', cooldown: 8, castTime: 0, duration: 4, power: 12, abilityTags: ['defensive', 'buff'] },
  'ability.skill.vanguard.guardian-roar': { executorId: 'skill-vanguard-guardian-roar', runtimeReady: true, family: 'control', targeting: 'self', castStyle: 'instant', element: 'physical', cooldown: 11, castTime: 0, radius: 6, duration: 5, power: 18, abilityTags: ['area', 'defensive', 'buff', 'crowd-control'] },
  'ability.skill.vanguard.living-bulwark': { executorId: 'skill-vanguard-living-bulwark', runtimeReady: true, family: 'defense', targeting: 'self', castStyle: 'instant', element: 'physical', cooldown: 24, castTime: 0, radius: 7, duration: 8, power: 40, abilityTags: ['defensive', 'buff', 'ultimate', 'area'] },
  'ability.skill.vanguard.vanguard-charge': { executorId: 'skill-vanguard-charge', runtimeReady: true, family: 'movement', targeting: 'directional', castStyle: 'instant', element: 'physical', cooldown: 6, castTime: 0, range: 7.5, radius: 2.2, power: 19, damage: 19, abilityTags: ['movement', 'mobility', 'melee', 'physical', 'damage', 'crowd-control'] },
  'ability.skill.vanguard.warpath': { executorId: 'skill-vanguard-warpath', runtimeReady: true, family: 'buff', targeting: 'self', castStyle: 'instant', element: 'physical', cooldown: 12, castTime: 0, duration: 6, power: 0, abilityTags: ['buff', 'movement'] },
  'ability.skill.vanguard.juggernaut': { executorId: 'skill-vanguard-juggernaut', runtimeReady: true, family: 'movement', targeting: 'directional', castStyle: 'instant', element: 'physical', cooldown: 22, castTime: 0, range: 9, radius: 3, duration: 8, power: 32, damage: 32, abilityTags: ['movement', 'melee', 'physical', 'damage', 'buff', 'ultimate'] },
  'ability.skill.tempest.lunging-strike': { executorId: 'skill-tempest-lunging-strike', runtimeReady: true, family: 'melee', targeting: 'directional', castStyle: 'instant', element: 'physical', cooldown: 4, castTime: 0, range: 4.5, radius: 1.2, power: 18, damage: 18, abilityTags: ['movement', 'melee', 'physical', 'damage'] },
  'ability.skill.tempest.twin-fang': { executorId: 'skill-tempest-twin-fang', runtimeReady: true, family: 'melee', targeting: 'directional', castStyle: 'instant', element: 'physical', cooldown: 7, castTime: 0, range: 3, radius: 1.1, power: 13, damage: 13, abilityTags: ['melee', 'physical', 'damage'] },
  'ability.skill.tempest.assassinate': { executorId: 'skill-tempest-assassinate', runtimeReady: true, family: 'melee', targeting: 'target', castStyle: 'instant', element: 'physical', cooldown: 18, castTime: 0, range: 5, radius: 1.3, power: 36, damage: 36, abilityTags: ['movement', 'melee', 'physical', 'damage', 'ultimate'] },
  'ability.skill.tempest.dash-strike': { executorId: 'skill-tempest-dash-strike', runtimeReady: true, family: 'movement', targeting: 'directional', castStyle: 'instant', element: 'physical', cooldown: 5, castTime: 0, range: 6.5, radius: 1.6, power: 16, damage: 16, abilityTags: ['movement', 'mobility', 'melee', 'physical', 'damage'] },
  'ability.skill.tempest.backstep-slash': { executorId: 'skill-tempest-backstep-slash', runtimeReady: true, family: 'movement', targeting: 'directional', castStyle: 'instant', element: 'physical', cooldown: 7, castTime: 0, range: 5.5, radius: 2, power: 17, damage: 17, abilityTags: ['movement', 'mobility', 'melee', 'physical', 'damage'] },
  'ability.skill.tempest.phantom-rhythm': { executorId: 'skill-tempest-phantom-rhythm', runtimeReady: true, family: 'movement', targeting: 'directional', castStyle: 'instant', element: 'physical', cooldown: 20, castTime: 0, range: 8, radius: 4.5, power: 12, damage: 12, abilityTags: ['movement', 'melee', 'physical', 'damage', 'ultimate', 'area'] },
  'ability.skill.tempest.poison-blade': { executorId: 'skill-tempest-poison-blade', runtimeReady: true, family: 'buff', targeting: 'self', castStyle: 'instant', element: 'physical', cooldown: 10, castTime: 0, duration: 7, power: 0, abilityTags: ['buff', 'poison', 'status'] },
  'ability.skill.tempest.smoke-bomb': { executorId: 'skill-tempest-smoke-bomb', runtimeReady: true, family: 'control', targeting: 'ground', castStyle: 'instant', element: 'physical', cooldown: 12, castTime: 0, radius: 4.5, duration: 5, power: 8, abilityTags: ['area', 'crowd-control', 'status'] },
  'ability.skill.tempest.master-of-deception': { executorId: 'skill-tempest-master-of-deception', runtimeReady: true, family: 'movement', targeting: 'ground', castStyle: 'instant', element: 'physical', cooldown: 24, castTime: 0, range: 9, duration: 8, power: 0, abilityTags: ['movement', 'buff', 'ultimate'] },
  'ability.skill.hunter-mara.power-shot': { executorId: 'skill-hunter-power-shot', runtimeReady: true, family: 'projectile', targeting: 'directional', castStyle: 'cast-time', element: 'physical', cooldown: 5, castTime: 0.35, range: 18, radius: 0.28, speed: 19, power: 24, damage: 24, abilityTags: ['projectile', 'physical', 'damage', 'damage'] },
  'ability.skill.hunter-mara.marked-target': { executorId: 'skill-hunter-marked-target', runtimeReady: true, family: 'buff', targeting: 'target', castStyle: 'instant', element: 'physical', cooldown: 9, castTime: 0, range: 16, duration: 8, power: 0, abilityTags: ['status', 'status', 'buff'] },
  'ability.skill.hunter-mara.deadeye': { executorId: 'skill-hunter-deadeye', runtimeReady: true, family: 'projectile', targeting: 'directional', castStyle: 'instant', element: 'physical', cooldown: 22, castTime: 0, range: 20, radius: 0.24, speed: 24, power: 22, damage: 22, duration: 6, abilityTags: ['projectile', 'physical', 'damage', 'ultimate', 'buff'] },
  'ability.skill.hunter-mara.snare-trap': { executorId: 'skill-hunter-snare-trap', runtimeReady: true, family: 'control', targeting: 'ground', castStyle: 'instant', element: 'physical', cooldown: 7, castTime: 0, range: 10, radius: 2.5, duration: 4, power: 7, damage: 7, abilityTags: ['area', 'area', 'crowd-control', 'damage'] },
  'ability.skill.hunter-mara.blast-trap': { executorId: 'skill-hunter-blast-trap', runtimeReady: true, family: 'area', targeting: 'ground', castStyle: 'cast-time', element: 'physical', cooldown: 10, castTime: 0.25, range: 11, radius: 3.2, power: 27, damage: 27, abilityTags: ['area', 'area', 'physical', 'damage', 'crowd-control'] },
  'ability.skill.hunter-mara.master-trapper': { executorId: 'skill-hunter-master-trapper', runtimeReady: true, family: 'area', targeting: 'ground', castStyle: 'instant', element: 'physical', cooldown: 24, castTime: 0, range: 12, radius: 6, duration: 7, power: 20, damage: 20, abilityTags: ['area', 'area', 'physical', 'damage', 'ultimate', 'crowd-control'] },
  'ability.skill.hunter-mara.retreating-shot': { executorId: 'skill-hunter-retreating-shot', runtimeReady: true, family: 'movement', targeting: 'directional', castStyle: 'instant', element: 'physical', cooldown: 6, castTime: 0, range: 5.5, radius: 0.2, speed: 18, power: 17, damage: 17, abilityTags: ['movement', 'projectile', 'physical', 'damage'] },
  'ability.skill.hunter-mara.camouflage': { executorId: 'skill-hunter-camouflage', runtimeReady: true, family: 'buff', targeting: 'self', castStyle: 'instant', element: 'physical', cooldown: 12, castTime: 0, duration: 6, power: 0, abilityTags: ['buff', 'buff', 'buff'] },
  'ability.skill.hunter-mara.apex-survivor': { executorId: 'skill-hunter-apex-survivor', runtimeReady: true, family: 'buff', targeting: 'self', castStyle: 'instant', element: 'physical', cooldown: 24, castTime: 0, duration: 10, power: 18, abilityTags: ['buff', 'heal', 'ultimate', 'movement'] },
  'ability.skill.warden.fire-bolt': { executorId: 'skill-warden-fire-bolt', runtimeReady: true, family: 'projectile', targeting: 'directional', castStyle: 'cast-time', element: 'fire', cooldown: 4, castTime: 0.25, range: 16, radius: 0.26, speed: 17, power: 20, damage: 20, abilityTags: ['projectile', 'fire', 'damage', 'status'] },
  'ability.skill.warden.chain-lightning': { executorId: 'skill-warden-chain-lightning', runtimeReady: true, family: 'projectile', targeting: 'target', castStyle: 'cast-time', element: 'lightning', cooldown: 8, castTime: 0.35, range: 15, radius: 6, power: 21, damage: 21, abilityTags: ['projectile', 'lightning', 'damage', 'lightning'] },
  'ability.skill.warden.arcane-cataclysm': { executorId: 'skill-warden-arcane-cataclysm', runtimeReady: true, family: 'area', targeting: 'ground', castStyle: 'charged', element: 'arcane', cooldown: 24, castTime: 0.8, range: 12, radius: 6.5, power: 42, damage: 42, abilityTags: ['area', 'status', 'damage', 'ultimate', 'status'] },
  'ability.skill.warden.frost-nova': { executorId: 'skill-warden-frost-nova', runtimeReady: true, family: 'area', targeting: 'self', castStyle: 'instant', element: 'frost', cooldown: 7, castTime: 0, radius: 4.2, duration: 4, power: 16, damage: 16, abilityTags: ['area', 'ice', 'damage', 'crowd-control'] },
  'ability.skill.warden.gravity-well': { executorId: 'skill-warden-gravity-well', runtimeReady: true, family: 'control', targeting: 'ground', castStyle: 'cast-time', element: 'arcane', cooldown: 11, castTime: 0.4, range: 11, radius: 5, duration: 4, power: 12, damage: 12, abilityTags: ['area', 'status', 'damage', 'crowd-control'] },
  'ability.skill.warden.absolute-control': { executorId: 'skill-warden-absolute-control', runtimeReady: true, family: 'control', targeting: 'ground', castStyle: 'instant', element: 'frost', cooldown: 24, castTime: 0, range: 12, radius: 7, duration: 6, power: 26, damage: 26, abilityTags: ['area', 'ice', 'damage', 'ultimate', 'crowd-control'] },
  'ability.skill.warden.magic-barrier': { executorId: 'skill-warden-magic-barrier', runtimeReady: true, family: 'defense', targeting: 'self', castStyle: 'instant', element: 'arcane', cooldown: 8, castTime: 0, duration: 5, power: 24, abilityTags: ['defensive', 'defensive', 'buff'] },
  'ability.skill.warden.protective-field': { executorId: 'skill-warden-protective-field', runtimeReady: true, family: 'defense', targeting: 'ground', castStyle: 'instant', element: 'arcane', cooldown: 13, castTime: 0, radius: 5.5, duration: 7, power: 16, abilityTags: ['defensive', 'area', 'buff'] },
  'ability.skill.warden.archmages-refuge': { executorId: 'skill-warden-archmages-refuge', runtimeReady: true, family: 'defense', targeting: 'self', castStyle: 'instant', element: 'arcane', cooldown: 26, castTime: 0, radius: 7, duration: 10, power: 40, abilityTags: ['defensive', 'heal', 'defensive', 'ultimate', 'area'] },
};

const baseAbilityById = new Map(baseAbilityDefinitions.map(definition => [definition.id, definition]));
const skillAbilityDefinitions: readonly AbilityDefinition[] = skillAbilityAliasSpecs.map(spec => {
  const prototype = baseAbilityById.get(spec.prototypeId);
  if (!prototype) throw new Error(`Missing skill ability prototype: ${spec.prototypeId}`);
  return {
    ...prototype,
    id: spec.id,
    name: spec.name,
    description: spec.description,
    ...(skillAbilityOverrides[spec.id] ?? {}),
    metadata: { ...prototype.metadata, contentVersion: '0.6.8.6c', tags: [...(prototype.metadata.tags ?? []), 'skill-catalog'] },
  };
});

export const abilityDefinitions: readonly AbilityDefinition[] = [
  ...baseAbilityDefinitions,
  ...skillAbilityDefinitions,
];
