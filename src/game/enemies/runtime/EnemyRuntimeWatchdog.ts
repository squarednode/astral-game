import { Vector3 } from '@babylonjs/core';

export type EnemyRuntimeRecoveryAction =
  | 'none'
  | 'force-evaluate'
  | 'force-execute'
  | 'replan-nudge'
  | 'return-home-failsafe';

export interface EnemyRuntimeWatchdogInput {
  readonly entityId: string;
  readonly state: string | null;
  readonly timeInState: number;
  readonly position: Vector3;
  readonly goalPosition: Vector3 | null;
  readonly movementIntent: 'advance' | 'hold' | 'retreat' | 'circle' | 'none';
  readonly recoverDuration: number;
  readonly hasSelectedAbility: boolean;
  readonly telegraphBusy: boolean;
  readonly movementFailure?: string;
}

export interface EnemyRuntimeWatchdogResult {
  readonly action: EnemyRuntimeRecoveryAction;
  readonly reason: string;
  readonly stationaryTime: number;
  readonly noProgressTime: number;
  readonly distanceImprovement: number;
}

interface WatchdogRecord {
  lastPosition: Vector3;
  lastGoalDistance: number;
  stationaryTime: number;
  noProgressTime: number;
  recoveryCooldown: number;
}

export class EnemyRuntimeWatchdog {
  private readonly records = new Map<string, WatchdogRecord>();

  update(input: EnemyRuntimeWatchdogInput, dt: number): EnemyRuntimeWatchdogResult {
    const currentGoalDistance = input.goalPosition
      ? Vector3.Distance(input.position, input.goalPosition)
      : Number.POSITIVE_INFINITY;
    const record = this.records.get(input.entityId) ?? {
      lastPosition: input.position.clone(),
      lastGoalDistance: currentGoalDistance,
      stationaryTime: 0,
      noProgressTime: 0,
      recoveryCooldown: 0,
    };

    const displacement = Vector3.Distance(record.lastPosition, input.position);
    const expectsMovement =
      (input.state === 'reposition' || input.state === 'return-home') &&
      input.movementIntent !== 'hold' &&
      input.movementIntent !== 'none';
    const distanceImprovement = Number.isFinite(currentGoalDistance)
      ? record.lastGoalDistance - currentGoalDistance
      : 0;
    const meaningfulProgress = distanceImprovement >= 0.02;

    record.stationaryTime = expectsMovement && displacement < 0.015
      ? record.stationaryTime + dt
      : 0;
    record.noProgressTime = expectsMovement && !meaningfulProgress
      ? record.noProgressTime + dt
      : 0;
    record.recoveryCooldown = Math.max(0, record.recoveryCooldown - dt);
    record.lastPosition.copyFrom(input.position);
    record.lastGoalDistance = currentGoalDistance;
    this.records.set(input.entityId, record);

    const idleResult = (reason: string): EnemyRuntimeWatchdogResult => ({
      action: 'none',
      reason,
      stationaryTime: record.stationaryTime,
      noProgressTime: record.noProgressTime,
      distanceImprovement,
    });

    if (record.recoveryCooldown > 0) {
      return idleResult('watchdog recovery cooldown');
    }

    let action: EnemyRuntimeRecoveryAction = 'none';
    let reason = 'runtime progressing';

    if ((input.state === 'casting' || input.state === 'reposition') && !input.hasSelectedAbility) {
      action = 'force-evaluate';
      reason = `${input.state} has no selected ability`;
    } else if (input.state === 'casting' && input.timeInState > 1.75) {
      action = 'force-execute';
      reason = input.telegraphBusy
        ? 'casting exceeded watchdog limit with active telegraph'
        : 'casting exceeded watchdog limit without active telegraph';
    } else if (input.state === 'return-home' && record.noProgressTime > 4) {
      action = 'return-home-failsafe';
      reason = `return-home made no goal progress for ${record.noProgressTime.toFixed(2)}s`;
    } else if (
      (input.state === 'reposition' || input.state === 'return-home') &&
      record.noProgressTime > 1
    ) {
      action = 'replan-nudge';
      reason = `${input.movementIntent} made no goal progress for ${record.noProgressTime.toFixed(2)}s${input.movementFailure && input.movementFailure !== 'none' ? ` (${input.movementFailure})` : ''}`;
    } else if (input.state === 'evaluate' && input.timeInState > 0.35) {
      action = 'force-evaluate';
      reason = 'evaluate state exceeded watchdog limit';
    } else if (
      input.state === 'recover' &&
      input.timeInState > input.recoverDuration + 0.75
    ) {
      action = 'force-evaluate';
      reason = 'recover state exceeded configured duration';
    }

    if (action !== 'none') record.recoveryCooldown = 0.5;
    return {
      action,
      reason,
      stationaryTime: record.stationaryTime,
      noProgressTime: record.noProgressTime,
      distanceImprovement,
    };
  }

  remove(entityId: string): void {
    this.records.delete(entityId);
  }

  clear(): void {
    this.records.clear();
  }
}
