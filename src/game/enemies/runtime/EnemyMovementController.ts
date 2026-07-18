import { Vector3 } from '@babylonjs/core';
import type {
  EnemyAbilityDecision,
  EnemyMovementDirective,
  EnemyRuntimeActor,
} from './EnemyRuntimeTypes';

export class EnemyMovementController {
  decide(
    actor: EnemyRuntimeActor,
    ability: EnemyAbilityDecision,
    distance: number,
  ): EnemyMovementDirective {
    const usage = ability.usage;

    if (ability.ready && ability.inRange) {
      return {
        intent: 'hold',
        reason: 'selected ability can execute',
        canCast: true,
      };
    }

    if (distance > usage.maximumRange) {
      return {
        intent: 'advance',
        reason: `${actor.definition.movementStyle}: closing to ${usage.maximumRange.toFixed(1)}m`,
        canCast: false,
      };
    }

    if (distance < usage.minimumRange) {
      const retreat =
        actor.definition.movementStyle === 'hold-range' ||
        actor.definition.movementStyle === 'hit-and-run';
      return {
        intent: retreat ? 'retreat' : 'hold',
        reason: retreat
          ? `${actor.definition.movementStyle}: restoring minimum range`
          : `${actor.definition.movementStyle}: maintaining pressure`,
        canCast: false,
      };
    }

    if (
      actor.definition.movementStyle === 'skirmish' ||
      actor.definition.movementStyle === 'hit-and-run'
    ) {
      return {
        intent: 'circle',
        reason: `${actor.definition.movementStyle}: orbiting while ability recovers`,
        canCast: false,
      };
    }

    return {
      intent: 'hold',
      reason: `${actor.definition.movementStyle}: holding selected ability band`,
      canCast: false,
    };
  }

  apply(
    actorPosition: Vector3,
    targetPosition: Vector3,
    directive: EnemyMovementDirective,
    speed: number,
    dt: number,
    orbitDirection: number,
  ): void {
    const toTarget = targetPosition.subtract(actorPosition);
    toTarget.y = 0;
    if (toTarget.lengthSquared() <= 0.001) return;

    const forward = toTarget.normalize();
    const step = Math.max(0, speed * dt);

    switch (directive.intent) {
      case 'advance':
        actorPosition.addInPlace(forward.scale(step));
        break;
      case 'retreat':
        actorPosition.addInPlace(forward.scale(-step));
        break;
      case 'circle': {
        const tangent = new Vector3(-forward.z, 0, forward.x);
        actorPosition.addInPlace(
          tangent.scale(step * 0.65 * orbitDirection),
        );
        break;
      }
      case 'hold':
        break;
    }
  }
}
