import { Vector3 } from '@babylonjs/core';

export type EnemyRuntimeRecoveryAction =
  | 'none'
  | 'force-evaluate'
  | 'force-execute'
  | 'replan-nudge';

export interface EnemyRuntimeWatchdogInput {
  readonly entityId: string;
  readonly state: string | null;
  readonly timeInState: number;
  readonly position: Vector3;
  readonly movementIntent: 'advance' | 'hold' | 'retreat' | 'circle' | 'none';
  readonly recoverDuration: number;
  readonly hasSelectedAbility: boolean;
  readonly telegraphBusy: boolean;
}

export interface EnemyRuntimeWatchdogResult {
  readonly action: EnemyRuntimeRecoveryAction;
  readonly reason: string;
  readonly stationaryTime: number;
}

interface WatchdogRecord {
  lastPosition: Vector3;
  stationaryTime: number;
  recoveryCooldown: number;
}

export class EnemyRuntimeWatchdog {
  private readonly records = new Map<string, WatchdogRecord>();

  update(input: EnemyRuntimeWatchdogInput, dt: number): EnemyRuntimeWatchdogResult {
    const record = this.records.get(input.entityId) ?? {
      lastPosition: input.position.clone(),
      stationaryTime: 0,
      recoveryCooldown: 0,
    };

    const displacement = Vector3.Distance(record.lastPosition, input.position);
    const expectsMovement =
      input.state === 'reposition' &&
      input.movementIntent !== 'hold' &&
      input.movementIntent !== 'none';

    record.stationaryTime = expectsMovement && displacement < 0.015
      ? record.stationaryTime + dt
      : 0;
    record.recoveryCooldown = Math.max(0, record.recoveryCooldown - dt);
    record.lastPosition.copyFrom(input.position);
    this.records.set(input.entityId, record);

    if (record.recoveryCooldown > 0) {
      return { action: 'none', reason: 'watchdog recovery cooldown', stationaryTime: record.stationaryTime };
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
    } else if (input.state === 'reposition' && record.stationaryTime > 0.9) {
      action = 'replan-nudge';
      reason = `${input.movementIntent} produced no movement for ${record.stationaryTime.toFixed(2)}s`;
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
    return { action, reason, stationaryTime: record.stationaryTime };
  }

  remove(entityId: string): void {
    this.records.delete(entityId);
  }

  clear(): void {
    this.records.clear();
  }
}
