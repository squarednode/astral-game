import type { Vector3 } from '@babylonjs/core';
import type { AbilityDefinition } from '../definitions/abilities';

export type AbilityStateId = 'ready' | 'casting' | 'executing' | 'cooldown' | 'disabled';

export type AbilityActionType =
  | 'ability'
  | 'movement'
  | 'jump'
  | 'dodge'
  | 'swap';

export interface AbilityCastRequest {
  readonly casterId: string;
  readonly casterPosition: Vector3;
  readonly aimPosition: Vector3;
  readonly aimDirection: Vector3;
}

export interface AbilityBlackboard {
  castSequence: number;
  request: AbilityCastRequest | null;
  interruptReason: string | null;
  executedAt: number | null;
  commitReached: boolean;
}

export interface AbilityRuntimeSnapshot {
  readonly id: string;
  readonly definitionId: string;
  readonly name: string;
  readonly state: AbilityStateId;
  readonly cooldownRemaining: number;
  readonly cooldownMaximum: number;
  readonly castElapsed: number;
  readonly castRemaining: number;
  readonly castMaximum: number;
  readonly castProgress: number;
  readonly executionProgress: number;
  readonly commitThreshold: number;
  readonly committed: boolean;
  readonly canMoveWhileCasting: boolean;
  readonly canRotateWhileCasting: boolean;
  readonly tags: readonly string[];
  readonly blackboard: Readonly<AbilityBlackboard>;
}

export interface AbilityExecutionContext {
  readonly definition: Readonly<AbilityDefinition>;
  readonly request: AbilityCastRequest;
}

export type AbilityExecutor = (context: AbilityExecutionContext) => void;
