import type { CharacterSkillTreeDefinition, SkillNodeDefinition } from './SkillTreeTypes';

const node = (
  characterId: string,
  id: string,
  name: string,
  description: string,
  abilityId: string,
  branch: SkillNodeDefinition['branch'],
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

export const characterSkillTrees: readonly CharacterSkillTreeDefinition[] = [
  {
    characterId: 'vanguard',
    identityTitle: 'Astral Vanguard',
    identitySummary: 'A durable front-line breaker who turns pressure into decisive openings.',
    combatStyle: 'Close-range bruiser · stagger · survival',
    strengths: ['High durability', 'Area pressure', 'Reliable initiation'],
    nodes: [
      node('vanguard', 'ground-breaker', 'Ground Breaker', 'Hurl a volatile astral impact toward the aim point.', 'ability.fireball', 'assault', 1),
      node('vanguard', 'rampart', 'Astral Rampart', 'Restore health and raise a temporary protective field.', 'ability.shield', 'survival', 1),
      node('vanguard', 'breach-step', 'Breach Step', 'Blink through the battle line to establish a new front.', 'ability.blink', 'control', 2, ['ground-breaker']),
      node('vanguard', 'shatter-spear', 'Shatter Spear', 'Launch a piercing frost strike that slows the target.', 'ability.ice-spear', 'assault', 2, ['rampart']),
    ],
  },
  {
    characterId: 'warden',
    identityTitle: 'Frost Warden',
    identitySummary: 'A ranged protector who controls space and stabilizes the party.',
    combatStyle: 'Ranged control · protection · frost',
    strengths: ['Long reach', 'Defensive support', 'Crowd control'],
    nodes: [
      node('warden', 'frost-lance', 'Frost Lance', 'Launch a piercing frost projectile that slows enemies.', 'ability.ice-spear', 'control', 1),
      node('warden', 'ice-barrier', 'Ice Barrier', 'Raise a restorative barrier around the caster.', 'ability.shield', 'survival', 1),
      node('warden', 'cold-step', 'Cold Step', 'Blink to a selected point and reset positioning.', 'ability.blink', 'control', 2, ['frost-lance']),
      node('warden', 'astral-flare', 'Astral Flare', 'Launch a high-impact elemental projectile.', 'ability.fireball', 'assault', 2, ['ice-barrier']),
    ],
  },
  {
    characterId: 'hunter-mara',
    identityTitle: 'Wilds Hunter',
    identitySummary: 'A mobile ranged specialist who isolates priority targets and controls pursuit lanes.',
    combatStyle: 'Ranged precision · mobility · pursuit',
    strengths: ['Safe damage', 'Fast repositioning', 'Target control'],
    nodes: [
      node('hunter-mara', 'piercing-shot', 'Piercing Shot', 'Fire a fast piercing projectile through the target lane.', 'ability.ice-spear', 'assault', 1),
      node('hunter-mara', 'hunter-guard', 'Hunter Guard', 'Create a temporary field that protects the hunter.', 'ability.shield', 'survival', 1),
      node('hunter-mara', 'shadow-track', 'Shadow Track', 'Blink to a selected hunting position.', 'ability.blink', 'control', 2, ['piercing-shot']),
      node('hunter-mara', 'flare-shot', 'Flare Shot', 'Launch an explosive projectile at the marked lane.', 'ability.fireball', 'assault', 2, ['hunter-guard']),
    ],
  },
  {
    characterId: 'tempest',
    identityTitle: 'Tempest Striker',
    identitySummary: 'A high-speed assassin who attacks from shifting angles and escapes retaliation.',
    combatStyle: 'Burst · mobility · elemental pressure',
    strengths: ['Fast attacks', 'Rapid repositioning', 'Burst windows'],
    nodes: [
      node('tempest', 'blink-strike', 'Blink Strike', 'Teleport toward the selected point to change attack angle.', 'ability.blink', 'assault', 1),
      node('tempest', 'storm-ward', 'Storm Ward', 'Raise a temporary defensive field between engagements.', 'ability.shield', 'survival', 1),
      node('tempest', 'chain-arc', 'Chain Arc', 'Launch a volatile elemental projectile.', 'ability.fireball', 'assault', 2, ['blink-strike']),
      node('tempest', 'frozen-edge', 'Frozen Edge', 'Launch a piercing frost strike to restrict movement.', 'ability.ice-spear', 'control', 2, ['storm-ward']),
    ],
  },
];
