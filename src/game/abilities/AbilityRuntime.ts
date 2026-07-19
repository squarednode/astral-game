import { StateMachine } from '../../engine/state';
import type { AbilityDefinition } from '../definitions/abilities';
import type {
  AbilityBlackboard,
  AbilityCastRequest,
  AbilityExecutor,
  AbilityRuntimeSnapshot,
  AbilityStateId,
} from './AbilityTypes';

interface AbilityContext {
  readonly definition: Readonly<AbilityDefinition>;
  readonly execute: AbilityExecutor;
}

export interface AbilityRuntimeCallbacks {
  onCastStarted?: (definition: Readonly<AbilityDefinition>, request: AbilityCastRequest) => void;
  onExecuted?: (definition: Readonly<AbilityDefinition>, request: AbilityCastRequest) => void;
  onCooldownStarted?: (definition: Readonly<AbilityDefinition>) => void;
  onReady?: (definition: Readonly<AbilityDefinition>) => void;
  onInterrupted?: (definition: Readonly<AbilityDefinition>, reason: string) => void;
  onCommitReached?: (definition: Readonly<AbilityDefinition>) => void;
  onStateEntered?: (state: AbilityStateId, from: AbilityStateId | null) => void;
  onStateExited?: (state: AbilityStateId, to: AbilityStateId) => void;
  onStateChanged?: (from: AbilityStateId | null, to: AbilityStateId, reason?: string) => void;
}

export class AbilityRuntime {
  readonly machine: StateMachine<AbilityContext, AbilityStateId, AbilityBlackboard>;
  private commitNotified = false;

  constructor(
    readonly id: string,
    readonly definition: Readonly<AbilityDefinition>,
    executor: AbilityExecutor,
    private readonly callbacks: AbilityRuntimeCallbacks = {},
  ) {
    const context: AbilityContext = { definition, execute: executor };
    this.machine = new StateMachine<AbilityContext, AbilityStateId, AbilityBlackboard>(
      `ability-${id}`,
      context,
      {
        onEntered: callbacks.onStateEntered,
        onExited: callbacks.onStateExited,
        onChanged: callbacks.onStateChanged,
      },
      {
        castSequence: 0,
        request: null,
        interruptReason: null,
        executedAt: null,
        commitReached: false,
      },
    )
      .addState({ id: 'ready' })
      .addState({
        id: 'casting',
        duration: definition.castTime,
        timeout: { to: 'executing', reason: 'cast-complete' },
        enter: (_context, machine) => {
          const request = machine.blackboard.get('request');
          if (request) callbacks.onCastStarted?.(definition, request);
        },
        interactions: [{
          type: 'interrupt',
          to: 'ready',
          reason: 'interrupted',
          handle: (_context, machine, interaction) => {
            const reason = String(interaction.payload ?? 'interrupted');
            machine.blackboard.set('interruptReason', reason);
            callbacks.onInterrupted?.(definition, reason);
          },
        }, {
          type: 'finish-cast',
          to: 'executing',
          reason: 'developer-finish-cast',
        }],
      })
      .addState({
        id: 'executing',
        duration: Math.max(0.001, definition.executionTime),
        timeout: { to: 'cooldown', reason: 'execution-complete' },
        enter: (abilityContext, machine) => {
          const request = machine.blackboard.get('request');
          if (!request) return;
          machine.blackboard.set('executedAt', performance.now());
          abilityContext.execute({ definition, request });
          callbacks.onExecuted?.(definition, request);
        },
      })
      .addState({
        id: 'cooldown',
        duration: definition.cooldown,
        timeout: { to: 'ready', reason: 'cooldown-complete' },
        enter: () => callbacks.onCooldownStarted?.(definition),
        exit: (_context, _machine, to) => {
          if (to === 'ready') callbacks.onReady?.(definition);
        },
        interactions: [{
          type: 'finish-cooldown',
          to: 'ready',
          reason: 'developer-finish-cooldown',
        }],
      })
      .addState({ id: 'disabled' });

    this.machine.start('ready', 'ability-created');
  }

  cast(request: AbilityCastRequest): boolean {
    if (this.machine.getCurrentStateId() !== 'ready') return false;
    this.commitNotified = false;
    this.machine.blackboard.patch({
      request,
      castSequence: this.machine.blackboard.get('castSequence') + 1,
      interruptReason: null,
      executedAt: null,
      commitReached: this.definition.castTime <= 0,
    });
    return this.machine.request(
      this.definition.castTime > 0 ? 'casting' : 'executing',
      'cast-requested',
    ).accepted;
  }

  interrupt(reason: string): boolean {
    if (!this.isInterruptible()) return false;
    return this.machine.interact('interrupt', reason).handled;
  }

  finishCast(): boolean {
    return this.machine.interact('finish-cast').handled;
  }

  finishCooldown(): boolean {
    return this.machine.interact('finish-cooldown').handled;
  }

  isBusy(): boolean {
    const state = this.machine.getCurrentStateId();
    return state === 'casting' || state === 'executing';
  }

  isCasting(): boolean {
    return this.machine.getCurrentStateId() === 'casting';
  }

  getCastProgress(): number {
    if (!this.isCasting()) return 0;
    return this.machine.getStateTimer().progress ?? 0;
  }

  isCommitted(): boolean {
    if (!this.isCasting()) return this.machine.getCurrentStateId() === 'executing';
    return this.getCastProgress() >= this.definition.commitThreshold;
  }

  isInterruptible(): boolean {
    return this.isCasting() && !this.isCommitted();
  }

  update(
    dt: number,
    noCooldowns = false,
    freezeCasting = false,
    cooldownRate = 1,
    castRate = 1,
  ): void {
    const state = this.machine.getCurrentStateId();
    const scaledDt =
      state === 'cooldown'
        ? dt * Math.max(0.1, cooldownRate)
        : state === 'casting'
          ? dt * Math.max(0.1, castRate)
          : dt;
    if (!(freezeCasting && state === 'casting')) {
      this.machine.update(scaledDt);
    }

    if (this.isCasting() && this.isCommitted()) {
      this.machine.blackboard.set('commitReached', true);
      if (!this.commitNotified) {
        this.commitNotified = true;
        this.callbacks.onCommitReached?.(this.definition);
      }
    }

    if (noCooldowns && this.machine.getCurrentStateId() === 'cooldown') {
      this.finishCooldown();
    }
  }

  reset(): void {
    this.commitNotified = false;
    if (this.machine.getCurrentStateId() !== 'ready') {
      this.machine.request('ready', 'developer-reset');
    }
  }

  snapshot(): AbilityRuntimeSnapshot {
    const state = this.machine.getCurrentStateId() ?? 'disabled';
    const timer = this.machine.getStateTimer();
    const blackboard = this.machine.blackboard.snapshot();
    const castProgress = state === 'casting' ? timer.progress ?? 0 : 0;
    return {
      id: this.id,
      definitionId: this.definition.id,
      name: this.definition.name,
      state,
      cooldownRemaining: state === 'cooldown' ? timer.remaining ?? 0 : 0,
      cooldownMaximum: this.definition.cooldown,
      castElapsed: state === 'casting' ? timer.elapsed : 0,
      castRemaining: state === 'casting' ? timer.remaining ?? 0 : 0,
      castMaximum: this.definition.castTime,
      castProgress,
      executionProgress: state === 'executing' ? timer.progress ?? 0 : 0,
      commitThreshold: this.definition.commitThreshold,
      committed: state === 'executing' || (state === 'casting' && castProgress >= this.definition.commitThreshold),
      canMoveWhileCasting: this.definition.canMoveWhileCasting,
      canRotateWhileCasting: this.definition.canRotateWhileCasting,
      tags: this.definition.abilityTags,
      blackboard,
    };
  }
}
