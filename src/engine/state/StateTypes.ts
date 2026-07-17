export type StateId = string;

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
  readonly rejectedBy?: 'missing-state' | 'can-exit' | 'can-enter' | 'same-state';
}

export interface StateMachineSnapshot<TStateId extends StateId> {
  readonly id: string;
  readonly currentState: TStateId | null;
  readonly previousState: TStateId | null;
  readonly timeInState: number;
  readonly transitionCount: number;
  readonly rejectedTransitionCount: number;
  readonly updateCount: number;
  readonly pendingTransition: TStateId | null;
}
