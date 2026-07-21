import type { AbilityRuntime } from './AbilityRuntime';
import type {
  AbilityActionType,
  AbilityCastRequest,
} from './AbilityTypes';

export type AbilitySlot = 1 | 2 | 3 | 4;

export interface QueuedAction {
  readonly id: string;
  readonly type: AbilityActionType;
  readonly execute: () => void;
}

export type AbilityActionResult =
  | 'executed'
  | 'interrupted'
  | 'queued'
  | 'allowed'
  | 'rejected';

export interface AbilityComponentCallbacks {
  onQueueConsumed?: (action: QueuedAction) => void;
}

export class AbilityComponent {
  private readonly slots = new Map<AbilitySlot, AbilityRuntime>();
  private queued: QueuedAction | null = null;

  constructor(
    private readonly callbacks: AbilityComponentCallbacks = {},
  ) {}

  assign(slot: AbilitySlot, runtime: AbilityRuntime): void {
    this.slots.set(slot, runtime);
  }

  unassign(slot: AbilitySlot): void {
    this.slots.delete(slot);
  }

  clearAssignments(): void {
    this.slots.clear();
    this.queued = null;
  }

  get(slot: AbilitySlot): AbilityRuntime | undefined {
    return this.slots.get(slot);
  }

  all(): readonly AbilityRuntime[] {
    return [...this.slots.values()];
  }

  requestCast(
    slot: AbilitySlot,
    request: AbilityCastRequest,
  ): AbilityActionResult {
    const runtime = this.slots.get(slot);
    if (!runtime) return 'rejected';

    return this.requestAction({
      id: runtime.definition.id,
      type: 'ability',
      execute: () => {
        runtime.cast(request);
      },
    });
  }

  requestExternalAction(
    type: Exclude<AbilityActionType, 'ability'>,
    id: string,
    execute: () => void,
  ): AbilityActionResult {
    return this.requestAction({ id, type, execute });
  }

  private requestAction(action: QueuedAction): AbilityActionResult {
    const active = this.getActiveRuntime();
    if (!active) {
      action.execute();
      return 'executed';
    }

    if (
      action.type === 'movement' &&
      active.isCasting() &&
      active.definition.canMoveWhileCasting
    ) {
      action.execute();
      return 'allowed';
    }

    if (active.isInterruptible()) {
      const interrupted = active.interrupt(`action:${action.type}`);
      if (!interrupted) return 'rejected';
      this.queued = null;
      action.execute();
      return 'interrupted';
    }

    const behavior = active.definition.queueBehavior;
    if (behavior === 'reject') return 'rejected';
    if (behavior === 'preserve' && this.queued) return 'queued';

    this.queued = action;
    return 'queued';
  }

  getQueued(): QueuedAction | null {
    return this.queued;
  }

  clearQueue(): void {
    this.queued = null;
  }

  getActiveRuntime(): AbilityRuntime | undefined {
    return this.all().find(runtime => runtime.isBusy());
  }

  canRotateTowardAim(): boolean {
    const active = this.getActiveRuntime();
    if (!active?.isCasting()) return true;
    return active.definition.canRotateWhileCasting;
  }

  interruptActive(reason = 'developer-interrupt'): boolean {
    const active = this.getActiveRuntime();
    if (!active) return false;
    this.queued = null;
    return active.interrupt(reason);
  }

  finishActiveCast(): boolean {
    return this.getActiveRuntime()?.finishCast() ?? false;
  }

  finishCooldowns(): void {
    for (const runtime of this.slots.values()) runtime.finishCooldown();
  }

  update(
    dt: number,
    noCooldowns = false,
    freezeCasting = false,
    cooldownRate = 1,
    castRate = 1,
  ): void {
    for (const runtime of this.slots.values()) {
      runtime.update(
        dt,
        noCooldowns,
        freezeCasting,
        cooldownRate,
        castRate,
      );
    }

    if (!this.queued || this.all().some(runtime => runtime.isBusy())) return;
    const queued = this.queued;
    this.queued = null;
    queued.execute();
    this.callbacks.onQueueConsumed?.(queued);
  }

  reset(): void {
    this.queued = null;
    for (const runtime of this.slots.values()) runtime.reset();
  }
}
