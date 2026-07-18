import type { StateLifecycle } from './State';
import { StateBlackboard } from './StateBlackboard';
import type {
  StateId,
  StateInteraction,
  StateInteractionResult,
  StateMachineSnapshot,
  StateTimerSnapshot,
  StateTransitionRequest,
  StateTransitionResult,
} from './StateTypes';

export interface StateTransitionGuard<
  TContext,
  TStateId extends StateId,
  TBlackboard extends object,
> {
  readonly id: string;
  readonly from?: TStateId | '*';
  readonly to?: TStateId | '*';
  check(
    context: TContext,
    machine: StateMachine<TContext, TStateId, TBlackboard>,
    from: TStateId | null,
    to: TStateId,
  ): boolean;
}

export interface StateMachineCallbacks<TStateId extends StateId> {
  onEntered?: (state: TStateId, from: TStateId | null) => void;
  onExited?: (state: TStateId, to: TStateId) => void;
  onChanged?: (
    from: TStateId | null,
    to: TStateId,
    reason?: string,
  ) => void;
  onRejected?: (result: StateTransitionResult<TStateId>) => void;
  onTimerCompleted?: (state: TStateId) => void;
  onInteraction?: (
    state: TStateId | null,
    interaction: StateInteraction,
    handled: boolean,
  ) => void;
}

/**
 * Generic deterministic state machine with deferred transitions, typed shared
 * blackboard data, declarative timed transitions, interactions, and guards.
 */
export class StateMachine<
  TContext,
  TStateId extends StateId = StateId,
  TBlackboard extends object = Record<string, unknown>,
> {
  private readonly states = new Map<
    TStateId,
    StateLifecycle<TContext, TStateId, TBlackboard>
  >();
  private readonly transitionGuards: StateTransitionGuard<
    TContext,
    TStateId,
    TBlackboard
  >[] = [];

  readonly blackboard: StateBlackboard<TBlackboard>;

  private currentStateId: TStateId | null = null;
  private previousStateId: TStateId | null = null;
  private pendingTransition: StateTransitionRequest<TStateId> | null = null;
  private updating = false;
  private timeInCurrentState = 0;
  private currentDuration: number | null = null;
  private currentTimerCompleted = false;
  private transitionCount = 0;
  private rejectedTransitionCount = 0;
  private updateCount = 0;
  private interactionSequence = 0;
  private interactionCount = 0;
  private handledInteractionCount = 0;
  private timerCompletionCount = 0;

  constructor(
    readonly id: string,
    readonly context: TContext,
    private readonly callbacks: StateMachineCallbacks<TStateId> = {},
    blackboardInitial: TBlackboard = {} as TBlackboard,
  ) {
    if (!id.trim()) {
      throw new Error('State machine ID cannot be empty.');
    }

    this.blackboard = new StateBlackboard(blackboardInitial);
  }

  addState(
    state: StateLifecycle<TContext, TStateId, TBlackboard>,
  ): this {
    if (this.states.has(state.id)) {
      throw new Error(
        `State machine "${this.id}" already contains state "${state.id}".`,
      );
    }

    this.states.set(state.id, state);
    return this;
  }

  addTransitionGuard(
    guard: StateTransitionGuard<TContext, TStateId, TBlackboard>,
  ): this {
    if (!guard.id.trim()) {
      throw new Error('State transition guard ID cannot be empty.');
    }
    if (this.transitionGuards.some(candidate => candidate.id === guard.id)) {
      throw new Error(
        `State machine "${this.id}" already contains guard "${guard.id}".`,
      );
    }
    this.transitionGuards.push(guard);
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

  getStateTimer(): StateTimerSnapshot {
    const duration = this.currentDuration;
    if (duration === null) {
      return {
        elapsed: this.timeInCurrentState,
        duration: null,
        remaining: null,
        progress: null,
        complete: false,
      };
    }

    const remaining = Math.max(0, duration - this.timeInCurrentState);
    const progress = duration <= 0
      ? 1
      : Math.min(1, this.timeInCurrentState / duration);

    return {
      elapsed: this.timeInCurrentState,
      duration,
      remaining,
      progress,
      complete: this.currentTimerCompleted,
    };
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

  request(to: TStateId, reason?: string): StateTransitionResult<TStateId> {
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

  interact<TPayload = unknown>(
    type: string,
    payload?: TPayload,
  ): StateInteractionResult<TStateId> {
    if (!type.trim()) {
      throw new Error('State interaction type cannot be empty.');
    }

    const stateId = this.currentStateId;
    const interaction: StateInteraction<TPayload> = {
      type,
      payload: payload as TPayload,
      sequence: ++this.interactionSequence,
      receivedAtUpdate: this.updateCount,
    };

    this.interactionCount += 1;

    if (stateId === null) {
      this.callbacks.onInteraction?.(null, interaction, false);
      return { handled: false, state: null, type };
    }

    const state = this.states.get(stateId);
    if (!state) {
      this.callbacks.onInteraction?.(stateId, interaction, false);
      return { handled: false, state: stateId, type };
    }

    const declared = state.interactions?.find(
      candidate => candidate.type === type,
    );

    let handled = false;
    let transition: StateTransitionResult<TStateId> | undefined;

    if (declared) {
      const allowed = declared.guard?.(
        this.context,
        this,
        interaction,
      ) ?? true;

      if (allowed) {
        handled = true;
        const customResult = declared.handle?.(
          this.context,
          this,
          interaction,
        );
        if (customResult) transition = customResult;

        if (!transition && declared.to) {
          transition = this.request(
            declared.to,
            declared.reason ?? `interaction:${type}`,
          );
        }
      }
    }

    const stateHandled = state.interaction?.(
      this.context,
      this,
      interaction,
    );
    handled = handled || stateHandled === true;

    if (handled) this.handledInteractionCount += 1;
    this.callbacks.onInteraction?.(stateId, interaction, handled);

    return {
      handled,
      state: stateId,
      type,
      transition,
    };
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
      this.evaluateTimer(state);
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
      timer: this.getStateTimer(),
      transitionCount: this.transitionCount,
      rejectedTransitionCount: this.rejectedTransitionCount,
      updateCount: this.updateCount,
      pendingTransition: this.pendingTransition?.to ?? null,
      interactionCount: this.interactionCount,
      handledInteractionCount: this.handledInteractionCount,
      timerCompletionCount: this.timerCompletionCount,
      blackboardRevision: this.blackboard.getRevision(),
    };
  }

  private evaluateTimer(
    state: StateLifecycle<TContext, TStateId, TBlackboard>,
  ): void {
    if (
      this.currentDuration === null ||
      this.currentTimerCompleted ||
      this.timeInCurrentState < this.currentDuration
    ) {
      return;
    }

    this.currentTimerCompleted = true;
    this.timerCompletionCount += 1;
    state.timerCompleted?.(this.context, this);
    this.callbacks.onTimerCompleted?.(state.id);

    if (this.pendingTransition || !state.timeout) return;

    const allowed = state.timeout.guard?.(this.context, this) ?? true;
    if (!allowed) return;

    this.request(
      state.timeout.to,
      state.timeout.reason ?? `timeout:${state.id}`,
    );
  }

  private resolveDuration(
    state: StateLifecycle<TContext, TStateId, TBlackboard>,
  ): number | null {
    if (state.duration === undefined) return null;
    const value = typeof state.duration === 'function'
      ? state.duration(this.context, this)
      : state.duration;
    return Math.max(0, value);
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
    if (current?.canExit && !current.canExit(this.context, this, to)) {
      return this.reject(from, to, reason, 'can-exit');
    }

    if (next.canEnter && !next.canEnter(this.context, this, from)) {
      return this.reject(from, to, reason, 'can-enter');
    }

    const rejectedGuard = this.transitionGuards.find(guard => {
      const fromMatches = guard.from === undefined || guard.from === '*' || guard.from === from;
      const toMatches = guard.to === undefined || guard.to === '*' || guard.to === to;
      return fromMatches && toMatches && !guard.check(
        this.context,
        this,
        from,
        to,
      );
    });

    if (rejectedGuard) {
      return this.reject(
        from,
        to,
        reason,
        'guard',
        rejectedGuard.id,
      );
    }

    if (current && from !== null) {
      current.exit?.(this.context, this, to);
      this.callbacks.onExited?.(from, to);
    }

    this.previousStateId = from;
    this.currentStateId = to;
    this.timeInCurrentState = 0;
    this.currentDuration = this.resolveDuration(next);
    this.currentTimerCompleted = false;
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
    rejectedGuardId?: string,
  ): StateTransitionResult<TStateId> {
    const result: StateTransitionResult<TStateId> = {
      accepted: false,
      from,
      to,
      reason,
      rejectedBy,
      rejectedGuardId,
    };

    this.rejectedTransitionCount += 1;
    this.callbacks.onRejected?.(result);
    return result;
  }
}
