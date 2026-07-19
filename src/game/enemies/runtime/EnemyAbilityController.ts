import type { DefinitionRegistry } from '../../../engine/definitions';
import type { AiAbilityUsageDefinition } from '../../definitions/combat/CombatLibraryTypes';
import { combatSandboxTuning } from '../../config/CombatSandboxTuning';
import type {
  EnemyAbilityDecision,
  EnemyRuntimeActor,
} from './EnemyRuntimeTypes';

interface WeightedUsage {
  usage: Readonly<AiAbilityUsageDefinition>;
  score: number;
}

function tuneUsage(
  usage: Readonly<AiAbilityUsageDefinition>,
): Readonly<AiAbilityUsageDefinition> {
  const tuning = combatSandboxTuning.get();
  const minimumRange = usage.minimumRange * tuning.attackRangeScale;
  const maximumRange = Math.max(
    minimumRange,
    usage.maximumRange * tuning.attackRangeScale,
  );
  return {
    ...usage,
    minimumRange,
    maximumRange,
    preferredRange: Math.min(
      maximumRange,
      Math.max(minimumRange, usage.preferredRange * tuning.preferredRangeScale),
    ),
  };
}

export class EnemyAbilityController {
  constructor(private readonly definitions: DefinitionRegistry) {}

  select(
    actor: EnemyRuntimeActor,
    distance: number,
  ): EnemyAbilityDecision {
    const usages = actor.definition.abilityUsage
      .map(reference => ({
        reference,
        usage: (() => {
          const resolved = this.definitions.get<AiAbilityUsageDefinition>(
            reference.usageId,
          );
          return resolved ? tuneUsage(resolved) : undefined;
        })(),
      }))
      .filter((candidate): candidate is {
        reference: EnemyRuntimeActor['definition']['abilityUsage'][number];
        usage: Readonly<AiAbilityUsageDefinition>;
      } => Boolean(candidate.usage));

    if (usages.length === 0) {
      throw new Error(
        `Enemy definition "${actor.definition.id}" has no resolvable ability usages.`,
      );
    }

    const healthPercent = Math.max(0, actor.hp / actor.maxHp);
    const eligible = usages.filter(({ usage }) =>
      healthPercent >= usage.minimumHealthPercent &&
      healthPercent <= usage.maximumHealthPercent
    );
    const pool = eligible.length > 0 ? eligible : usages;

    const scored: WeightedUsage[] = pool.map(({ reference, usage }) => {
      const cooldown = actor.abilityCooldowns.get(usage.abilityId) ?? 0;
      const ready = cooldown <= 0;
      const inRange =
        distance >= usage.minimumRange &&
        distance <= usage.maximumRange;
      const rangeError = inRange
        ? 0
        : distance < usage.minimumRange
          ? usage.minimumRange - distance
          : distance - usage.maximumRange;

      let roleScore = reference.role === 'primary' ? 5 : 2;

      switch (actor.definition.movementStyle) {
        case 'hold-range':
          if (distance < usage.minimumRange && reference.role === 'escape') {
            roleScore += 16;
          }
          if (reference.role === 'primary') roleScore += 6;
          if (reference.role === 'secondary' && inRange) roleScore += 3;
          break;
        case 'hit-and-run':
          if (distance > 2.8 && reference.role === 'secondary') roleScore += 14;
          if (distance <= 2.8 && reference.role === 'primary') roleScore += 14;
          if (!ready && distance <= 3.8 && reference.role === 'escape') roleScore += 8;
          break;
        case 'skirmish':
          if (distance > 2.8 && reference.role === 'secondary') roleScore += 10;
          if (distance <= 2.8 && reference.role === 'primary') roleScore += 10;
          break;
        case 'pressure':
        case 'tank':
        case 'leader':
          if (reference.role === 'primary') roleScore += 8;
          if (distance > usage.maximumRange && reference.role === 'secondary') {
            roleScore += 5;
          }
          break;
        case 'boss':
          if (ready) roleScore += 5;
          if (inRange) roleScore += 4;
          break;
      }

      const readinessScore = ready ? 20 : Math.max(0, 5 - cooldown);
      const rangeScore = inRange ? 14 : Math.max(0, 8 - rangeError);
      const score = usage.weight + roleScore + readinessScore + rangeScore;

      return { usage, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const usage = scored[0].usage;
    const cooldownRemaining = actor.abilityCooldowns.get(usage.abilityId) ?? 0;
    const ready = cooldownRemaining <= 0;
    const inRange =
      distance >= usage.minimumRange &&
      distance <= usage.maximumRange;
    const rangeError = inRange
      ? 0
      : distance < usage.minimumRange
        ? usage.minimumRange - distance
        : distance - usage.maximumRange;

    return {
      usage,
      ready,
      cooldownRemaining,
      inRange,
      rangeError,
      reason: !ready
        ? `selected ability cooling down (${cooldownRemaining.toFixed(2)}s)`
        : inRange
          ? 'ready and in selected ability range'
          : distance < usage.minimumRange
            ? 'too close for selected ability'
            : 'too far for selected ability',
    };
  }

  inspect(
    actor: EnemyRuntimeActor,
    usage: Readonly<AiAbilityUsageDefinition>,
    distance: number,
  ): EnemyAbilityDecision {
    usage = tuneUsage(usage);
    const cooldownRemaining = actor.abilityCooldowns.get(usage.abilityId) ?? 0;
    const ready = cooldownRemaining <= 0;
    const inRange =
      distance >= usage.minimumRange &&
      distance <= usage.maximumRange;
    const rangeError = inRange
      ? 0
      : distance < usage.minimumRange
        ? usage.minimumRange - distance
        : distance - usage.maximumRange;

    return {
      usage,
      ready,
      cooldownRemaining,
      inRange,
      rangeError,
      reason: !ready
        ? `selected ability cooling down (${cooldownRemaining.toFixed(2)}s)`
        : inRange
          ? 'ready and in selected ability range'
          : distance < usage.minimumRange
            ? 'too close for selected ability'
            : 'too far for selected ability',
    };
  }
}
