import type { StateId } from './StateTypes';
import type { StateMachine } from './StateMachine';

export interface StateLifecycle<TContext, TStateId extends StateId> {
  readonly id: TStateId;

  canEnter?(
    context: TContext,
    machine: StateMachine<TContext, TStateId>,
    from: TStateId | null,
  ): boolean;

  canExit?(
    context: TContext,
    machine: StateMachine<TContext, TStateId>,
    to: TStateId,
  ): boolean;

  enter?(
    context: TContext,
    machine: StateMachine<TContext, TStateId>,
    from: TStateId | null,
  ): void;

  update?(
    context: TContext,
    machine: StateMachine<TContext, TStateId>,
    dt: number,
  ): void;

  exit?(
    context: TContext,
    machine: StateMachine<TContext, TStateId>,
    to: TStateId,
  ): void;
}
