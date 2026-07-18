import type { AbilityRuntime } from './AbilityRuntime';
import type { AbilityCastRequest } from './AbilityTypes';

export type AbilitySlot = 1 | 2 | 3 | 4;

export interface QueuedAbility {
  readonly slot: AbilitySlot;
  readonly request: AbilityCastRequest;
}

export type AbilityCastResult = 'cast' | 'queued' | 'rejected';

export class AbilityComponent {
  private readonly slots = new Map<AbilitySlot, AbilityRuntime>();
  private queued: QueuedAbility | null = null;

  assign(slot: AbilitySlot, runtime: AbilityRuntime): void {
    this.slots.set(slot, runtime);
  }

  get(slot: AbilitySlot): AbilityRuntime | undefined {
    return this.slots.get(slot);
  }

  all(): readonly AbilityRuntime[] {
    return [...this.slots.values()];
  }

  requestCast(slot: AbilitySlot, request: AbilityCastRequest): AbilityCastResult {
    const runtime = this.slots.get(slot);
    if (!runtime) return 'rejected';

    if (this.all().some(candidate => candidate.isBusy())) {
      this.queued = { slot, request };
      return 'queued';
    }

    return runtime.cast(request) ? 'cast' : 'rejected';
  }

  getQueued(): QueuedAbility | null {
    return this.queued;
  }

  clearQueue(): void {
    this.queued = null;
  }

  getActiveRuntime(): AbilityRuntime | undefined {
    return this.all().find(runtime => runtime.isBusy());
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

  update(dt: number, noCooldowns = false, freezeCasting = false): void {
    for (const runtime of this.slots.values()) runtime.update(dt, noCooldowns, freezeCasting);

    if (!this.queued || this.all().some(runtime => runtime.isBusy())) return;
    const queued = this.queued;
    this.queued = null;
    this.slots.get(queued.slot)?.cast(queued.request);
  }

  reset(): void {
    this.queued = null;
    for (const runtime of this.slots.values()) runtime.reset();
  }
}
