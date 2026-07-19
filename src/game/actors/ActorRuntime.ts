import { StateMachine } from '../../engine/state';
import type { ConditionEvaluator } from './ConditionEvaluator';
import type {
  ActorDefinition,
  ActorRuntimeSnapshot,
  ActorStateId,
  InteractionProfile,
} from './ActorTypes';

interface ActorContext {
  definition: ActorDefinition;
}

interface ActorBlackboard {
  goal: string;
  distanceToPlayer: number;
  targeted: boolean;
  available: boolean;
  failedCondition: string | null;
}

export class ActorRuntime {
  readonly machine: StateMachine<
    ActorContext,
    ActorStateId,
    ActorBlackboard
  >;

  constructor(
    readonly definition: ActorDefinition,
    readonly interaction: InteractionProfile | undefined,
    private readonly conditions: ConditionEvaluator,
  ) {
    this.machine = new StateMachine(
      `actor-${definition.id}`,
      { definition },
      {},
      {
        goal: 'Waiting',
        distanceToPlayer: Number.POSITIVE_INFINITY,
        targeted: false,
        available: true,
        failedCondition: null,
      },
    )
      .addState({ id: 'spawned', duration: 0, timeout: { to: definition.defaultState ?? 'idle' } })
      .addState({ id: 'idle' })
      .addState({ id: 'targeted' })
      .addState({ id: 'interacting' })
      .addState({ id: 'talking' })
      .addState({ id: 'trading' })
      .addState({ id: 'travelling' })
      .addState({ id: 'performing' })
      .addState({ id: 'returning' })
      .addState({ id: 'disabled' })
      .addState({ id: 'hidden' });

    this.machine.start('spawned');
  }

  update(dt: number, distanceToPlayer: number, targeted: boolean): void {
    this.machine.blackboard.patch({
      distanceToPlayer,
      targeted,
    });

    const state = this.machine.getCurrentStateId();
    if (state === 'disabled' || state === 'hidden') {
      this.machine.update(dt);
      return;
    }

    if (targeted && state === 'idle') {
      this.machine.blackboard.set('goal', 'Waiting for player interaction');
      this.machine.request('targeted', 'player-targeted');
    } else if (!targeted && state === 'targeted') {
      this.machine.blackboard.set('goal', 'Waiting');
      this.machine.request('idle', 'target-cleared');
    }

    this.machine.update(dt);
  }

  beginInteraction(mode: 'talking' | 'trading' | 'travelling' | 'performing'): boolean {
    const state = this.machine.getCurrentStateId();
    if (state === 'disabled' || state === 'hidden') return false;
    this.machine.blackboard.set('goal', mode);
    return this.machine.request(mode, 'interaction-started').accepted;
  }

  finishInteraction(): void {
    this.machine.blackboard.set('goal', 'Waiting');
    this.machine.request('idle', 'interaction-completed');
  }

  setState(state: ActorStateId): void {
    this.machine.request(state, 'external-state-change');
  }

  snapshot(): ActorRuntimeSnapshot {
    return {
      actorId: this.definition.id,
      displayName: this.definition.displayName,
      state: this.machine.getCurrentStateId() ?? 'spawned',
      goal: this.machine.blackboard.get('goal'),
      distanceToPlayer: this.machine.blackboard.get('distanceToPlayer'),
      targeted: this.machine.blackboard.get('targeted'),
      available: this.machine.blackboard.get('available'),
      failedCondition:
        this.machine.blackboard.get('failedCondition') ?? undefined,
      components: this.definition.components.map(component => component.type),
    };
  }
}
