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
  onStateEntered?: (state: AbilityStateId, from: AbilityStateId | null) => void;
  onStateExited?: (state: AbilityStateId, to: AbilityStateId) => void;
  onStateChanged?: (from: AbilityStateId | null, to: AbilityStateId, reason?: string) => void;
}

export class AbilityRuntime {
  readonly machine: StateMachine<AbilityContext, AbilityStateId, AbilityBlackboard>;

  constructor(
    readonly id: string,
    readonly definition: Readonly<AbilityDefinition>,
    executor: AbilityExecutor,
    callbacks: AbilityRuntimeCallbacks = {},
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
      { castSequence: 0, request: null, interruptReason: null },
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
        }],
      })
      .addState({
        id: 'executing',
        duration: Math.max(0.001, definition.executionTime),
        timeout: { to: 'cooldown', reason: 'execution-complete' },
        enter: (abilityContext, machine) => {
          const request = machine.blackboard.get('request');
          if (!request) return;
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
      })
      .addState({ id: 'disabled' });

    this.machine.start('ready', 'ability-created');
  }

  cast(request: AbilityCastRequest): boolean {
    if (this.machine.getCurrentStateId() !== 'ready') return false;
    this.machine.blackboard.patch({
      request,
      castSequence: this.machine.blackboard.get('castSequence') + 1,
      interruptReason: null,
    });
    return this.machine.request(
      this.definition.castTime > 0 ? 'casting' : 'executing',
      'cast-requested',
    ).accepted;
  }

  interrupt(reason: string): boolean {
    return this.machine.interact('interrupt', reason).handled;
  }

  update(dt: number): void {
    this.machine.update(dt);
  }

  reset(): void {
    if (this.machine.getCurrentStateId() !== 'ready') {
      this.machine.request('ready', 'developer-reset');
    }
  }

  snapshot(): AbilityRuntimeSnapshot {
    const state = this.machine.getCurrentStateId() ?? 'disabled';
    const timer = this.machine.getStateTimer();
    return {
      id: this.id,
      definitionId: this.definition.id,
      name: this.definition.name,
      state,
      cooldownRemaining: state === 'cooldown' ? timer.remaining ?? 0 : 0,
      cooldownMaximum: this.definition.cooldown,
      castProgress: state === 'casting' ? timer.progress ?? 0 : 0,
      tags: this.definition.abilityTags,
    };
  }
}
