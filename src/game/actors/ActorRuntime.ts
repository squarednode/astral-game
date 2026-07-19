import { StateMachine } from '../../engine/state';
import type { ConditionEvaluator } from './ConditionEvaluator';
import {
  ACTOR_STATES,
  type ActorDefinition,
  type ActorRuntimeSnapshot,
  type ActorStateId,
  type InteractionProfile,
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
    this.machine = new StateMachine<
      ActorContext,
      ActorStateId,
      ActorBlackboard
    >(
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
      .addState({
        id: ACTOR_STATES.spawned,
        duration: 0,
        timeout: {
          to: definition.defaultState ?? ACTOR_STATES.idle,
        },
      })
      .addState({ id: ACTOR_STATES.idle })
      .addState({ id: ACTOR_STATES.targeted })
      .addState({ id: ACTOR_STATES.interacting })
      .addState({ id: ACTOR_STATES.talking })
      .addState({ id: ACTOR_STATES.trading })
      .addState({ id: ACTOR_STATES.travelling })
      .addState({ id: ACTOR_STATES.performing })
      .addState({ id: ACTOR_STATES.returning })
      .addState({ id: ACTOR_STATES.disabled })
      .addState({ id: ACTOR_STATES.hidden });

    this.machine.start(ACTOR_STATES.spawned);
  }

  update(
    dt: number,
    distanceToPlayer: number,
    targeted: boolean,
  ): void {
    this.machine.blackboard.patch({
      distanceToPlayer,
      targeted,
    });

    const state = this.machine.getCurrentStateId();
    if (
      state === ACTOR_STATES.disabled ||
      state === ACTOR_STATES.hidden
    ) {
      this.machine.update(dt);
      return;
    }

    if (targeted && state === ACTOR_STATES.idle) {
      this.machine.blackboard.set(
        'goal',
        'Waiting for player interaction',
      );
      this.machine.request(
        ACTOR_STATES.targeted,
        'player-targeted',
      );
    } else if (!targeted && state === ACTOR_STATES.targeted) {
      this.machine.blackboard.set('goal', 'Waiting');
      this.machine.request(ACTOR_STATES.idle, 'target-cleared');
    }

    this.machine.update(dt);
  }

  beginInteraction(
    mode:
      | typeof ACTOR_STATES.talking
      | typeof ACTOR_STATES.trading
      | typeof ACTOR_STATES.travelling
      | typeof ACTOR_STATES.performing,
  ): boolean {
    const state = this.machine.getCurrentStateId();
    if (
      state === ACTOR_STATES.disabled ||
      state === ACTOR_STATES.hidden
    ) {
      return false;
    }

    this.machine.blackboard.set('goal', mode);
    return this.machine.request(mode, 'interaction-started').accepted;
  }

  finishInteraction(): void {
    this.machine.blackboard.set('goal', 'Waiting');
    this.machine.request(
      ACTOR_STATES.idle,
      'interaction-completed',
    );
  }

  setState(state: ActorStateId): void {
    this.machine.request(state, 'external-state-change');
  }

  snapshot(): ActorRuntimeSnapshot {
    return {
      actorId: this.definition.id,
      displayName: this.definition.displayName,
      state:
        this.machine.getCurrentStateId() ?? ACTOR_STATES.spawned,
      goal: this.machine.blackboard.get('goal'),
      distanceToPlayer:
        this.machine.blackboard.get('distanceToPlayer'),
      targeted: this.machine.blackboard.get('targeted'),
      available: this.machine.blackboard.get('available'),
      failedCondition:
        this.machine.blackboard.get('failedCondition') ?? undefined,
      components: this.definition.components.map(
        component => component.type,
      ),
    };
  }
}
