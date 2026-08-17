import type { AbilityDefinition } from './abilities/AbilityDefinitions';
import { abilityDefinitions as baseAbilityDefinitions } from './abilities/AbilityDefinitions';
import type { AiAbilityUsageDefinition } from './combat/CombatLibraryTypes';
import { aiAbilityUsageDefinitions as baseAiAbilityUsageDefinitions } from './combat/CombatLibraryDefinitions';
import type { EnemyDefinition } from './EnemyDefinitions';
import { enemyDefinitions as baseEnemyDefinitions } from './EnemyDefinitions';

function abilityPrototype(id: string): Readonly<AbilityDefinition> {
  const definition = baseAbilityDefinitions.find(candidate => candidate.id === id);
  if (!definition) throw new Error(`Missing Level 1 ability prototype: ${id}`);
  return definition;
}

function levelOneAbility(
  prototypeId: string,
  id: string,
  name: string,
  power: number,
  damage: number = power,
): AbilityDefinition {
  const prototype = abilityPrototype(prototypeId);
  return {
    ...prototype,
    id,
    name,
    power,
    damage,
    metadata: {
      ...prototype.metadata,
      contentVersion: '0.6.11',
      source: 'src/game/definitions/LevelOneEnemyContent.ts',
      tags: [...(prototype.metadata.tags ?? []), 'level-1-enemy'],
    },
  };
}

const levelOneEnemyAbilities: readonly AbilityDefinition[] = [
  levelOneAbility('ability.melee-strike', 'ability.level1.crab-pinch', 'Crab Pinch', 1),
  levelOneAbility('ability.melee-strike', 'ability.level1.wolf-bite', 'Wolf Bite', 1),
  levelOneAbility('ability.charge', 'ability.level1.wolf-lunge', 'Wolf Lunge', 2),
  levelOneAbility('ability.barrier', 'ability.level1.mother-wolf-howl', 'Mother Wolf Howl', 2, 0),
  levelOneAbility('ability.heavy-slam', 'ability.level1.keeper-slam', 'Keeper Slam', 3),
  levelOneAbility('ability.leap', 'ability.level1.keeper-leap', 'Keeper Leap', 3),
  levelOneAbility('ability.magic-missile', 'ability.level1.keeper-projectile', 'Keeper Bolt', 2),
  levelOneAbility('ability.barrier', 'ability.level1.keeper-roar', 'Keeper Roar', 3, 0),
];

export const abilityDefinitions: readonly AbilityDefinition[] = [
  ...baseAbilityDefinitions,
  ...levelOneEnemyAbilities,
];

const levelOneUsageAbilityIds: Readonly<Record<string, string>> = {
  'usage.crab-pinch': 'ability.level1.crab-pinch',
  'usage.wolf-bite': 'ability.level1.wolf-bite',
  'usage.wolf-lunge': 'ability.level1.wolf-lunge',
  'usage.mother-wolf-howl': 'ability.level1.mother-wolf-howl',
  'usage.boss-slam': 'ability.level1.keeper-slam',
  'usage.boss-leap': 'ability.level1.keeper-leap',
  'usage.boss-projectile': 'ability.level1.keeper-projectile',
  'usage.boss-roar': 'ability.level1.keeper-roar',
};

export const aiAbilityUsageDefinitions: readonly AiAbilityUsageDefinition[] =
  baseAiAbilityUsageDefinitions.map(definition => {
    const abilityId = levelOneUsageAbilityIds[definition.id];
    return abilityId ? { ...definition, abilityId } : definition;
  });

export const enemyDefinitions: readonly EnemyDefinition[] = baseEnemyDefinitions.map(definition => {
  switch (definition.id) {
    case 'enemy.crab':
      return {
        ...definition,
        baseDamage: 1,
        detectionRange: 18,
        preferredRange: 1.5,
      };
    case 'enemy.wolf':
      return {
        ...definition,
        baseDamage: 1,
        detectionRange: 24,
        preferredRange: 1.8,
      };
    case 'enemy.mother-wolf':
      return {
        ...definition,
        baseDamage: 2,
        detectionRange: 28,
        preferredRange: 2.2,
      };
    case 'enemy.world-boss':
      return {
        ...definition,
        name: 'Wolf Keeper',
        baseDamage: 3,
        detectionRange: 32,
        preferredRange: 3.2,
      };
    default:
      return definition;
  }
});
