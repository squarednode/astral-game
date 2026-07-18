import type { StateMachine } from './StateMachine';
import type {
  StateId,
  StateInteraction,
  StateTransitionResult,
} from './StateTypes';

export interface TimedStateTransition<
  TContext,
  TStateId extends StateId,
  TBlackboard extends object,
> {
  readonly to: TStateId;
  readonly reason?: string;
  guard?(
    context: TContext,
    machine: StateMachine<TContext, TStateId, TBlackboard>,
  ): boolean;
}

export interface StateInteractionTransition<
  TContext,
  TStateId extends StateId,
  TBlackboard extends object,
  TPayload = unknown,
> {
  readonly type: string;
  readonly to?: TStateId;
  readonly reason?: string;
  guard?(
    context: TContext,
    machine: StateMachine<TContext, TStateId, TBlackboard>,
    interaction: StateInteraction<TPayload>,
  ): boolean;
  handle?(
    context: TContext,
    machine: StateMachine<TContext, TStateId, TBlackboard>,
    interaction: StateInteraction<TPayload>,
  ): void | StateTransitionResult<TStateId>;
}

export interface StateLifecycle<
  TContext,
  TStateId extends StateId,
  TBlackboard extends object = Record<string, unknown>,
> {
  readonly id: TStateId;

  /** Duration in seconds. Omit for an untimed state. */
  readonly duration?:
    | number
    | ((
        context: TContext,
        machine: StateMachine<TContext, TStateId, TBlackboard>,
      ) => number);

  /** Optional automatic transition evaluated once when duration completes. */
  readonly timeout?: TimedStateTransition<
    TContext,
    TStateId,
    TBlackboard
  >;

  /** Declarative interactions that are active only while this state owns the machine. */
  readonly interactions?: readonly StateInteractionTransition<
    TContext,
    TStateId,
    TBlackboard,
    any
  >[];

  canEnter?(
    context: TContext,
    machine: StateMachine<TContext, TStateId, TBlackboard>,
    from: TStateId | null,
  ): boolean;

  canExit?(
    context: TContext,
    machine: StateMachine<TContext, TStateId, TBlackboard>,
    to: TStateId,
  ): boolean;

  enter?(
    context: TContext,
    machine: StateMachine<TContext, TStateId, TBlackboard>,
    from: TStateId | null,
  ): void;

  update?(
    context: TContext,
    machine: StateMachine<TContext, TStateId, TBlackboard>,
    dt: number,
  ): void;

  timerCompleted?(
    context: TContext,
    machine: StateMachine<TContext, TStateId, TBlackboard>,
  ): void;

  interaction?(
    context: TContext,
    machine: StateMachine<TContext, TStateId, TBlackboard>,
    interaction: StateInteraction,
  ): boolean | void;

  exit?(
    context: TContext,
    machine: StateMachine<TContext, TStateId, TBlackboard>,
    to: TStateId,
  ): void;
}
