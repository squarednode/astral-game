import type { DefinitionRegistry } from '../../../engine/definitions';
import { EnemyAbilityController } from './EnemyAbilityController';
import { EnemyMovementController } from './EnemyMovementController';
import type {
  EnemyRuntimeActor,
  EnemyTacticalPlan,
} from './EnemyRuntimeTypes';

export class EnemyTacticalController {
  readonly abilities: EnemyAbilityController;
  readonly movement = new EnemyMovementController();

  constructor(definitions: DefinitionRegistry) {
    this.abilities = new EnemyAbilityController(definitions);
  }

  plan(
    actor: EnemyRuntimeActor,
    distanceToTarget: number,
  ): EnemyTacticalPlan {
    const ability = this.abilities.select(actor, distanceToTarget);
    const movement = this.movement.decide(
      actor,
      ability,
      distanceToTarget,
    );

    return {
      ability,
      movement,
      distanceToTarget,
    };
  }
}
