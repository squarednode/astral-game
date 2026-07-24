import type { CharacterSkillTreeDefinition, SkillNodeDefinition, SkillPassiveModifier } from './SkillTreeTypes';

type Branch = SkillNodeDefinition['branch'];

const active = (
  characterId: string,
  id: string,
  name: string,
  description: string,
  abilityId: string,
  branch: Branch,
  tier: number,
  prerequisites: readonly string[] = [],
): SkillNodeDefinition => ({
  id: `${characterId}.${id}`,
  characterId,
  name,
  description,
  kind: 'active',
  abilityId,
  cost: 1,
  minimumLevel: tier + 1,
  prerequisiteNodeIds: prerequisites.map(value => `${characterId}.${value}`),
  branch,
  tier,
});

const passive = (
  characterId: string,
  id: string,
  name: string,
  description: string,
  modifier: SkillPassiveModifier,
  branch: Branch,
  tier: number,
  prerequisites: readonly string[] = [],
): SkillNodeDefinition => ({
  id: `${characterId}.${id}`,
  characterId,
  name,
  description,
  kind: 'passive',
  passiveModifier: modifier,
  cost: 1,
  minimumLevel: tier + 1,
  prerequisiteNodeIds: prerequisites.map(value => `${characterId}.${value}`),
  branch,
  tier,
});

export const characterSkillTrees: readonly CharacterSkillTreeDefinition[] = [
  {
    characterId: 'vanguard',
    identityTitle: 'Astral Vanguard',
    identitySummary: 'A durable front-line breaker who turns pressure into decisive openings.',
    combatStyle: 'Close-range bruiser · stagger · survival',
    strengths: ['High durability', 'Wide melee pressure', 'Reliable initiation'],
    nodes: [
      active('vanguard', 'cleaving-strike', 'Cleaving Strike', 'A broad physical swing that damages enemies in front of the Vanguard.', 'ability.melee-cleave', 'assault', 1),
      active('vanguard', 'vanguard-charge', 'Vanguard Charge', 'Rush through the battle line and damage enemies at the destination.', 'ability.charge', 'control', 1),
      passive('vanguard', 'unyielding-frame', 'Unyielding Frame', 'Increase maximum health and stagger resistance.', { maximumHealth: 35, staggerResistance: 0.15 }, 'survival', 1),
      active('vanguard', 'ground-breaker', 'Ground Breaker', 'Deliver a committed area slam with high impact.', 'ability.heavy-slam', 'assault', 2, ['cleaving-strike']),
      active('vanguard', 'astral-rampart', 'Astral Rampart', 'Raise a timed barrier and recover a small amount of health.', 'ability.barrier', 'survival', 2, ['unyielding-frame']),
      passive('vanguard', 'breaker-momentum', 'Breaker Momentum', 'Increase melee damage and attack speed.', { meleeDamagePercent: 0.16, attackSpeedPercent: 0.10, staggerPower: 0.2 }, 'assault', 3, ['ground-breaker']),
    ],
  },
  {
    characterId: 'warden',
    identityTitle: 'Frost Warden',
    identitySummary: 'A ranged protector who controls space and stabilizes the party.',
    combatStyle: 'Ranged control · protection · frost',
    strengths: ['Long reach', 'Defensive support', 'Crowd control'],
    nodes: [
      active('warden', 'frost-lance', 'Frost Lance', 'Launch a piercing frost projectile that chills enemies.', 'ability.ice-spear', 'control', 1),
      active('warden', 'ice-barrier', 'Ice Barrier', 'Create a protective barrier around the Warden.', 'ability.shield', 'survival', 1),
      passive('warden', 'winter-blood', 'Winter Blood', 'Increase armor, health, and resistance to stagger.', { maximumHealth: 20, armor: 5, staggerResistance: 0.12 }, 'survival', 1),
      active('warden', 'frost-nova', 'Frost Nova', 'Release a close-range frost burst that damages and chills nearby enemies.', 'ability.frost-nova', 'control', 2, ['frost-lance']),
      active('warden', 'cold-step', 'Cold Step', 'Blink to a selected position to re-establish control.', 'ability.blink', 'control', 2, ['ice-barrier']),
      passive('warden', 'deep-freeze', 'Deep Freeze', 'Increase projectile damage and ability recovery speed.', { projectileDamagePercent: 0.15, cooldownRatePercent: 0.12 }, 'assault', 3, ['frost-nova']),
    ],
  },
  {
    characterId: 'hunter-mara',
    identityTitle: 'Wilds Hunter',
    identitySummary: 'A mobile ranged specialist who isolates priority targets and controls pursuit lanes.',
    combatStyle: 'Ranged precision · mobility · pursuit',
    strengths: ['Safe damage', 'Fast repositioning', 'Target control'],
    nodes: [
      active('hunter-mara', 'piercing-shot', 'Piercing Shot', 'Fire a high-speed projectile that pierces several enemies.', 'ability.piercing-shot', 'assault', 1),
      active('hunter-mara', 'retreat', 'Hunter Retreat', 'Leap backward from danger while preserving aim direction.', 'ability.retreat', 'control', 1),
      passive('hunter-mara', 'steady-hands', 'Steady Hands', 'Increase projectile damage and base attack power.', { projectileDamagePercent: 0.14, attack: 6 }, 'assault', 1),
      active('hunter-mara', 'spread-shot', 'Spread Shot', 'Fire a fan of physical projectiles across the target lane.', 'ability.spread-shot', 'assault', 2, ['piercing-shot']),
      active('hunter-mara', 'poison-cloud', 'Poison Cloud', 'Create a damaging control zone at the selected location.', 'ability.poison-cloud', 'control', 2, ['retreat']),
      passive('hunter-mara', 'relentless-pursuit', 'Relentless Pursuit', 'Move faster and recover dodge more quickly.', { movementSpeed: 0.55, dodgeCooldownPercent: 0.15 }, 'control', 3, ['spread-shot']),
    ],
  },
  {
    characterId: 'tempest',
    identityTitle: 'Tempest Striker',
    identitySummary: 'A high-speed assassin who attacks from shifting angles and escapes retaliation.',
    combatStyle: 'Burst · mobility · elemental pressure',
    strengths: ['Fast attacks', 'Rapid repositioning', 'Burst windows'],
    nodes: [
      active('tempest', 'dash-strike', 'Dash Strike', 'Dash toward the aim point and strike enemies at the destination.', 'ability.dash', 'assault', 1),
      active('tempest', 'shock-burst', 'Shock Burst', 'Release a lightning burst around the Striker.', 'ability.shock-burst', 'assault', 1),
      passive('tempest', 'storm-tempo', 'Storm Tempo', 'Increase attack speed and movement speed.', { attackSpeedPercent: 0.15, movementSpeed: 0.5 }, 'control', 1),
      active('tempest', 'blink-strike', 'Blink Strike', 'Teleport through the target line to create a new attack angle.', 'ability.blink', 'control', 2, ['dash-strike']),
      active('tempest', 'chain-arc', 'Chain Arc', 'Launch a volatile lightning projectile.', 'ability.magic-missile', 'assault', 2, ['shock-burst']),
      passive('tempest', 'eye-of-the-storm', 'Eye of the Storm', 'Increase cooldown recovery and dodge availability.', { cooldownRatePercent: 0.15, dodgeCooldownPercent: 0.18 }, 'survival', 3, ['blink-strike']),
    ],
  },
];
