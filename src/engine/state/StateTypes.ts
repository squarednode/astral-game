export type StateId = string;
export type StateInteractionType = string;

export interface StateTransitionRequest<TStateId extends StateId> {
  readonly from: TStateId | null;
  readonly to: TStateId;
  readonly reason?: string;
  readonly requestedAtUpdate: number;
}

export interface StateTransitionResult<TStateId extends StateId> {
  readonly accepted: boolean;
  readonly from: TStateId | null;
  readonly to: TStateId;
  readonly reason?: string;
  readonly rejectedBy?:
    | 'missing-state'
    | 'can-exit'
    | 'can-enter'
    | 'guard'
    | 'same-state';
  readonly rejectedGuardId?: string;
}

export interface StateTimerSnapshot {
  readonly elapsed: number;
  readonly duration: number | null;
  readonly remaining: number | null;
  readonly progress: number | null;
  readonly complete: boolean;
}

export interface StateInteraction<TPayload = unknown> {
  readonly type: StateInteractionType;
  readonly payload: TPayload;
  readonly sequence: number;
  readonly receivedAtUpdate: number;
}

export interface StateInteractionResult<TStateId extends StateId> {
  readonly handled: boolean;
  readonly state: TStateId | null;
  readonly type: StateInteractionType;
  readonly transition?: StateTransitionResult<TStateId>;
}

export interface StateMachineSnapshot<TStateId extends StateId> {
  readonly id: string;
  readonly currentState: TStateId | null;
  readonly previousState: TStateId | null;
  readonly timeInState: number;
  readonly timer: StateTimerSnapshot;
  readonly transitionCount: number;
  readonly rejectedTransitionCount: number;
  readonly updateCount: number;
  readonly pendingTransition: TStateId | null;
  readonly interactionCount: number;
  readonly handledInteractionCount: number;
  readonly timerCompletionCount: number;
  readonly blackboardRevision: number;
}
