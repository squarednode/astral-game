import type { StateLifecycle } from './State';
import type {
  StateId,
  StateMachineSnapshot,
  StateTransitionRequest,
  StateTransitionResult,
} from './StateTypes';

export interface StateMachineCallbacks<TStateId extends StateId> {
  onEntered?: (state: TStateId, from: TStateId | null) => void;
  onExited?: (state: TStateId, to: TStateId) => void;
  onChanged?: (
    from: TStateId | null,
    to: TStateId,
    reason?: string,
  ) => void;
  onRejected?: (
    result: StateTransitionResult<TStateId>,
  ) => void;
}

/**
 * Generic deterministic state machine.
 *
 * Transitions requested during update are applied after the current state's
 * update callback completes. This prevents enter/exit recursion and ensures
 * one state owns each update tick.
 */
export class StateMachine<
  TContext,
  TStateId extends StateId = StateId,
> {
  private readonly states = new Map<
    TStateId,
    StateLifecycle<TContext, TStateId>
  >();

  private currentStateId: TStateId | null = null;
  private previousStateId: TStateId | null = null;
  private pendingTransition: StateTransitionRequest<TStateId> | null = null;
  private updating = false;
  private timeInCurrentState = 0;
  private transitionCount = 0;
  private rejectedTransitionCount = 0;
  private updateCount = 0;

  constructor(
    readonly id: string,
    readonly context: TContext,
    private readonly callbacks: StateMachineCallbacks<TStateId> = {},
  ) {
    if (!id.trim()) {
      throw new Error('State machine ID cannot be empty.');
    }
  }

  addState(state: StateLifecycle<TContext, TStateId>): this {
    if (this.states.has(state.id)) {
      throw new Error(
        `State machine "${this.id}" already contains state "${state.id}".`,
      );
    }

    this.states.set(state.id, state);
    return this;
  }

  hasState(id: TStateId): boolean {
    return this.states.has(id);
  }

  getCurrentStateId(): TStateId | null {
    return this.currentStateId;
  }

  getPreviousStateId(): TStateId | null {
    return this.previousStateId;
  }

  getTimeInState(): number {
    return this.timeInCurrentState;
  }

  start(initialState: TStateId, reason = 'start'): void {
    if (this.currentStateId !== null) {
      throw new Error(
        `State machine "${this.id}" has already started.`,
      );
    }

    const result = this.applyTransition(initialState, reason);
    if (!result.accepted) {
      throw new Error(
        `State machine "${this.id}" could not start in state "${initialState}".`,
      );
    }
  }

  request(
    to: TStateId,
    reason?: string,
  ): StateTransitionResult<TStateId> {
    const request: StateTransitionRequest<TStateId> = {
      from: this.currentStateId,
      to,
      reason,
      requestedAtUpdate: this.updateCount,
    };

    if (this.updating) {
      this.pendingTransition = request;
      return {
        accepted: true,
        from: request.from,
        to,
        reason,
      };
    }

    return this.applyTransition(to, reason);
  }

  update(dt: number): void {
    if (this.currentStateId === null) return;

    const safeDt = Math.max(0, dt);
    const state = this.states.get(this.currentStateId);
    if (!state) {
      throw new Error(
        `State machine "${this.id}" lost state "${this.currentStateId}".`,
      );
    }

    this.updating = true;
    this.updateCount += 1;
    this.timeInCurrentState += safeDt;

    try {
      state.update?.(this.context, this, safeDt);
    } finally {
      this.updating = false;
    }

    const pending = this.pendingTransition;
    this.pendingTransition = null;
    if (pending) {
      this.applyTransition(pending.to, pending.reason);
    }
  }

  snapshot(): StateMachineSnapshot<TStateId> {
    return {
      id: this.id,
      currentState: this.currentStateId,
      previousState: this.previousStateId,
      timeInState: this.timeInCurrentState,
      transitionCount: this.transitionCount,
      rejectedTransitionCount: this.rejectedTransitionCount,
      updateCount: this.updateCount,
      pendingTransition: this.pendingTransition?.to ?? null,
    };
  }

  private applyTransition(
    to: TStateId,
    reason?: string,
  ): StateTransitionResult<TStateId> {
    const from = this.currentStateId;

    if (from === to) {
      return this.reject(from, to, reason, 'same-state');
    }

    const next = this.states.get(to);
    if (!next) {
      return this.reject(from, to, reason, 'missing-state');
    }

    const current = from === null ? undefined : this.states.get(from);
    if (
      current?.canExit &&
      !current.canExit(this.context, this, to)
    ) {
      return this.reject(from, to, reason, 'can-exit');
    }

    if (
      next.canEnter &&
      !next.canEnter(this.context, this, from)
    ) {
      return this.reject(from, to, reason, 'can-enter');
    }

    if (current && from !== null) {
      current.exit?.(this.context, this, to);
      this.callbacks.onExited?.(from, to);
    }

    this.previousStateId = from;
    this.currentStateId = to;
    this.timeInCurrentState = 0;
    this.transitionCount += 1;

    next.enter?.(this.context, this, from);
    this.callbacks.onEntered?.(to, from);
    this.callbacks.onChanged?.(from, to, reason);

    return {
      accepted: true,
      from,
      to,
      reason,
    };
  }

  private reject(
    from: TStateId | null,
    to: TStateId,
    reason: string | undefined,
    rejectedBy: StateTransitionResult<TStateId>['rejectedBy'],
  ): StateTransitionResult<TStateId> {
    const result: StateTransitionResult<TStateId> = {
      accepted: false,
      from,
      to,
      reason,
      rejectedBy,
    };

    this.rejectedTransitionCount += 1;
    this.callbacks.onRejected?.(result);
    return result;
  }
}
