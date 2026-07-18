import type { Vector3 } from '@babylonjs/core';
import type { AiAbilityUsageDefinition } from '../../definitions/combat/CombatLibraryTypes';
import type { EnemyDefinition } from '../../definitions/EnemyDefinitions';

export type EnemyPositioningIntent =
  | 'advance'
  | 'hold'
  | 'retreat'
  | 'circle';

export interface EnemyRuntimeActor {
  readonly definition: Readonly<EnemyDefinition>;
  readonly position: Vector3;
  readonly speed: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly abilityCooldowns: ReadonlyMap<string, number>;
}

export interface EnemyAbilityDecision {
  readonly usage: Readonly<AiAbilityUsageDefinition>;
  readonly ready: boolean;
  readonly cooldownRemaining: number;
  readonly inRange: boolean;
  readonly rangeError: number;
  readonly reason: string;
}

export interface EnemyMovementDirective {
  readonly intent: EnemyPositioningIntent;
  readonly reason: string;
  readonly canCast: boolean;
}

export interface EnemyTacticalPlan {
  readonly ability: EnemyAbilityDecision;
  readonly movement: EnemyMovementDirective;
  readonly distanceToTarget: number;
}
